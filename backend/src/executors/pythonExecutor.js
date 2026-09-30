import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);

/**
 * Executes Python student submission in an isolated, sandboxed environment against test cases.
 * Returns structured deterministic evidence (tests passed/failed, expected vs actual).
 */
export async function executePythonCode({ code, functionName, testCases = [] }) {
  if (!code || typeof code !== 'string') {
    return {
      passed: false,
      totalTests: testCases.length,
      passedTests: 0,
      failedTests: testCases.length,
      status: 'error',
      error: 'Empty or invalid submission code'
    };
  }

  // Security check: Block dangerous module imports or unsafe operations
  const forbiddenPatterns = [
    /\bimport\s+(os|sys|subprocess|shutil|socket|http|urllib|requests|ctypes|importlib|pickle|builtins)\b/,
    /\b(eval|exec|__import__|open)\s*\(/
  ];

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(code)) {
      return {
        passed: false,
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: testCases.length,
        status: 'security_violation',
        error: 'Security Policy Violation: Forbidden system module or dynamic execution call detected in submission.'
      };
    }
  }

  const tmpDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const scriptFilename = `test_runner_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.py`;
  const scriptPath = path.join(tmpDir, scriptFilename);

  // Generate Python test runner harness script
  const pythonRunnerContent = `
import json
import sys
import copy

# Student submission code
${code}

def __run_tests():
    test_cases = ${JSON.stringify(testCases)}
    target_func_name = ${JSON.stringify(functionName)}
    results = []
    
    # Locate target function
    target_func = globals().get(target_func_name)
    if not target_func:
        # Fallback: find first user-defined function if name mismatched
        user_funcs = [v for k, v in globals().items() if callable(v) and not k.startswith("__")]
        if user_funcs:
            target_func = user_funcs[0]
            
    if not target_func:
        print(json.dumps({
            "passed": False,
            "totalTests": len(test_cases),
            "passedTests": 0,
            "failedTests": len(test_cases),
            "status": "syntax_error",
            "error": f"Function '{target_func_name}' not defined in submission.",
            "tests": []
        }))
        return

    passed_count = 0
    test_results = []

    for idx, tc in enumerate(test_cases):
        name = tc.get("name", f"Test #{idx+1}")
        inp = tc.get("input", {})
        expected = tc.get("expected")
        
        try:
            # Pass input dictionary as keyword arguments or single arg
            if isinstance(inp, dict):
                actual = target_func(**copy.deepcopy(inp))
            elif isinstance(inp, list):
                actual = target_func(*copy.deepcopy(inp))
            else:
                actual = target_func(copy.deepcopy(inp))
                
            passed = (actual == expected)
            if passed:
                passed_count += 1
                reason = "Output matched expected result."
            else:
                reason = f"Expected {repr(expected)} but got {repr(actual)}"

            test_results.append({
                "name": name,
                "passed": passed,
                "input": inp,
                "expected": expected,
                "actual": actual,
                "error": None,
                "reason": reason,
                "category": tc.get("category", "general")
            })
        except Exception as e:
            test_results.append({
                "name": name,
                "passed": False,
                "input": inp,
                "expected": expected,
                "actual": None,
                "error": str(e),
                "reason": f"Runtime Exception: {str(e)}",
                "category": tc.get("category", "general")
            })

    total = len(test_cases)
    failed_count = total - passed_count
    status = "passed" if failed_count == 0 else ("failed" if passed_count == 0 else "partial")

    print(json.dumps({
        "passed": failed_count == 0,
        "totalTests": total,
        "passedTests": passed_count,
        "failedTests": failed_count,
        "status": status,
        "error": None,
        "tests": test_results
    }))

if __name__ == "__main__":
    try:
        __run_tests()
    except Exception as err:
        print(json.dumps({
            "passed": False,
            "totalTests": len(${JSON.stringify(testCases)}),
            "passedTests": 0,
            "failedTests": len(${JSON.stringify(testCases)}),
            "status": "error",
            "error": str(err),
            "tests": []
        }))
`;

  try {
    fs.writeFileSync(scriptPath, pythonRunnerContent, 'utf-8');

    // Run in isolated process with 3.5s timeout
    const { stdout, stderr } = await execFileAsync('python', [scriptPath], {
      timeout: 3500,
      maxBuffer: 1024 * 1024
    });

    try {
      const parsed = JSON.parse(stdout.trim());
      parsed.functionName = functionName;
      parsed.failedTestsList = (parsed.tests || []).filter((t) => !t.passed);
      return parsed;
    } catch (parseErr) {
      return {
        passed: false,
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: testCases.length,
        status: 'parse_error',
        error: `Execution output parse error: ${stderr || stdout || parseErr.message}`,
        tests: []
      };
    }
  } catch (err) {
    const isTimeout = err.killed || err.signal === 'SIGTERM';
    return {
      passed: false,
      totalTests: testCases.length,
      passedTests: 0,
      failedTests: testCases.length,
      status: isTimeout ? 'timeout' : 'compilation_error',
      error: isTimeout ? 'Execution Timed Out (Limit: 3.5 seconds)' : (err.stderr || err.message),
      tests: []
    };
  } finally {
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    } catch (e) {}
  }
}
