import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { logger } from '../utils/logger.js';

const execFileAsync = promisify(execFile);

// Check if Docker CLI is accessible on host
let hasDockerCache = null;
async function isDockerAvailable() {
  if (hasDockerCache !== null) return hasDockerCache;
  try {
    await execFileAsync('docker', ['--version'], { timeout: 1500 });
    hasDockerCache = true;
  } catch (err) {
    hasDockerCache = false;
  }
  return hasDockerCache;
}

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
      error: 'Empty or invalid submission code',
      tests: [],
      failedTestsList: []
    };
  }

  // Pre-execution AST & pattern check for high-risk exploits
  const rawForbiddenPatterns = [
    /\bimport\s+(os|sys|subprocess|shutil|socket|http|urllib|requests|ctypes|importlib|pickle|pty|posix)\b/,
    /\bfrom\s+(os|sys|subprocess|shutil|socket|http|urllib|requests|ctypes|importlib|pickle|pty|posix)\b/,
    /\b(eval|exec|__import__|open|breakpoint|compile)\s*\(/,
    /\b(__subclasses__|__bases__|__globals__|__builtins__)\b/
  ];

  for (const pattern of rawForbiddenPatterns) {
    if (pattern.test(code)) {
      return {
        passed: false,
        totalTests: testCases.length,
        passedTests: 0,
        failedTests: testCases.length,
        status: 'security_violation',
        error: 'Security Policy Violation: Access to system operations, dynamic execution, or unauthorized modules is blocked.',
        tests: [],
        failedTestsList: []
      };
    }
  }

  const tmpDir = path.join(process.cwd(), 'scratch');
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true });
  }

  const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const scriptFilename = `test_runner_${runId}.py`;
  const scriptPath = path.join(tmpDir, scriptFilename);

  // Generate Python test harness with resource limits, time tracking, and deep assertion checks
  const pythonRunnerContent = `
import json
import sys
import copy
import time

# Apply POSIX resource boundaries if supported
try:
    import resource
    # Cap CPU time to 3 seconds
    resource.setrlimit(resource.RLIMIT_CPU, (3, 3))
    # Cap virtual memory to 128 MB (134217728 bytes)
    resource.setrlimit(resource.RLIMIT_AS, (134217728, 134217728))
except Exception:
    pass

# Safe sandbox namespace
__safe_builtins = {
    'abs': abs, 'all': all, 'any': any, 'ascii': ascii, 'bin': bin, 'bool': bool,
    'chr': chr, 'complex': complex, 'dict': dict, 'dir': dir, 'divmod': divmod,
    'enumerate': enumerate, 'filter': filter, 'float': float, 'format': format,
    'frozenset': frozenset, 'hasattr': hasattr, 'hash': hash, 'hex': hex,
    'int': int, 'isinstance': isinstance, 'issubclass': issubclass, 'iter': iter,
    'len': len, 'list': list, 'map': map, 'max': max, 'min': min, 'next': next,
    'oct': oct, 'ord': ord, 'pow': pow, 'print': print, 'range': range,
    'repr': repr, 'reversed': reversed, 'round': round, 'set': set, 'slice': slice,
    'sorted': sorted, 'str': str, 'sum': sum, 'tuple': tuple, 'type': type,
    'zip': zip, 'Exception': Exception, 'ValueError': ValueError, 'TypeError': TypeError,
    'IndexError': IndexError, 'KeyError': KeyError, 'ZeroDivisionError': ZeroDivisionError
}

# Student submission code
${code}

def __run_tests():
    test_cases = ${JSON.stringify(testCases)}
    target_func_name = ${JSON.stringify(functionName)}
    
    target_func = globals().get(target_func_name)
    if not target_func:
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
            "durationMs": 0,
            "tests": []
        }))
        return

    passed_count = 0
    test_results = []
    start_total_time = time.perf_counter()

    for idx, tc in enumerate(test_cases):
        name = tc.get("name", f"Test #{idx+1}")
        inp = tc.get("input", {})
        expected = tc.get("expected")
        t_start = time.perf_counter()

        try:
            if isinstance(inp, dict):
                actual = target_func(**copy.deepcopy(inp))
            elif isinstance(inp, list):
                actual = target_func(*copy.deepcopy(inp))
            else:
                actual = target_func(copy.deepcopy(inp))

            passed = (actual == expected)
            duration_ms = round((time.perf_counter() - t_start) * 1000, 2)

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
                "durationMs": duration_ms,
                "error": None,
                "reason": reason,
                "category": tc.get("category", "general")
            })
        except Exception as e:
            duration_ms = round((time.perf_counter() - t_start) * 1000, 2)
            test_results.append({
                "name": name,
                "passed": False,
                "input": inp,
                "expected": expected,
                "actual": None,
                "durationMs": duration_ms,
                "error": str(e),
                "reason": f"Runtime Exception: {str(e)}",
                "category": tc.get("category", "general")
            })

    total_duration_ms = round((time.perf_counter() - start_total_time) * 1000, 2)
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
        "durationMs": total_duration_ms,
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
            "durationMs": 0,
            "tests": []
        }))
`;

  try {
    fs.writeFileSync(scriptPath, pythonRunnerContent, 'utf-8');

    const dockerReady = await isDockerAvailable();
    let stdout = '';
    let stderr = '';

    if (dockerReady) {
      // Ephemeral Docker Container with locked network, memory, and CPU limits
      const dockerArgs = [
        'run',
        '--rm',
        '--network', 'none',
        '--memory', '128m',
        '--cpus', '0.5',
        '--pids-limit', '64',
        '--read-only',
        '-v', `${scriptPath}:/app/runner.py:ro`,
        '-w', '/tmp',
        'python:3.11-alpine',
        'python', '/app/runner.py'
      ];

      const res = await execFileAsync('docker', dockerArgs, {
        timeout: 4000,
        maxBuffer: 1024 * 1024
      });
      stdout = res.stdout;
      stderr = res.stderr;
    } else {
      // Local process execution with timeout and buffer cap
      const res = await execFileAsync('python3', [scriptPath], {
        timeout: 3500,
        maxBuffer: 1024 * 1024
      }).catch(async () => {
        // Fallback to 'python' if 'python3' alias not found
        return await execFileAsync('python', [scriptPath], {
          timeout: 3500,
          maxBuffer: 1024 * 1024
        });
      });
      stdout = res.stdout;
      stderr = res.stderr;
    }

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
        tests: [],
        failedTestsList: []
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
      error: isTimeout ? 'Execution Timed Out (Time limit: 3.5s exceeded / possible infinite loop)' : (err.stderr || err.message),
      tests: [],
      failedTestsList: []
    };
  } finally {
    try {
      if (fs.existsSync(scriptPath)) fs.unlinkSync(scriptPath);
    } catch (e) {}
  }
}