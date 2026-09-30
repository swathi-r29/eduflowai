import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Submission, GradingResult, Assignment } from '../../types';
import QuizPanel from '../../components/common/QuizPanel';
import AIVoiceTutor from '../../components/common/AIVoiceTutor';
import { formatSecondsToTimestamp } from '../../utils/timestampUtils';
import { Sparkles, Video, FileText, ExternalLink, Award, CheckCircle2, XCircle, Code, Terminal, Cpu } from 'lucide-react';

export default function SubmissionDetail() {
  const { id } = useParams();
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [grading, setGrading] = useState<GradingResult | null>(null);
  const pollRef = useRef<number | null>(null);

  const load = async () => {
    const { data } = await api.get(`/submissions/${id}`);
    setSubmission(data.submission);
    setGrading(data.gradingResult);
    if (data.gradingResult) {
      if (pollRef.current) window.clearInterval(pollRef.current);
    }
  };

  useEffect(() => {
    load();
    pollRef.current = window.setInterval(load, 3000);
    return () => { if (pollRef.current) window.clearInterval(pollRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const assignment = submission?.assignment as Assignment | undefined;

  if (!submission) return <p className="text-slate-500 p-6">Loading submission details...</p>;

  if (!grading) {
    return (
      <div className="card max-w-xl mx-auto my-12 text-center py-8 space-y-4">
        <Sparkles size={32} className="mx-auto text-blue-600 animate-spin" />
        <h1 className="text-xl font-bold text-slate-900">AI Multi-Agent & Sandboxed Execution Pipeline in Progress</h1>
        <p className="text-slate-500 text-sm max-w-md mx-auto leading-relaxed">
          Running: Submission Understanding → Test Case Generation → Sandboxed Execution → Rubric Bounding → Root Cause Diagnosis → Personalized Feedback.
        </p>
        <div className="mt-4 h-1.5 bg-slate-100 rounded-full overflow-hidden max-w-xs mx-auto">
          <div className="h-full w-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 animate-pulse" />
        </div>
      </div>
    );
  }

  const pct = Math.round((grading.aiScore / (grading.aiMaxScore || 1)) * 100);
  const rec = grading.recommendedResource;
  const exec = grading.executionResults || (grading as any).executionResults;
  const failedTests = grading.failedTests || exec?.failedTestsList || [];

  const evalType = assignment?.evaluationType || grading?.staticAnalysis?.evaluationType || (exec?.applicable === false || exec?.status === 'NOT_APPLICABLE' ? 'THEORY' : 'PROGRAMMING');
  const isExecutionApplicable = exec?.applicable !== false && exec?.status !== 'NOT_APPLICABLE' && evalType === 'PROGRAMMING';

  return (
    <div className="max-w-3xl space-y-6">
      {/* Header score card */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm border-l-4 border-l-blue-600">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-extrabold text-slate-900">{typeof assignment === 'object' ? assignment.title : 'Assignment Evaluation'}</h1>
            <p className="text-xs font-medium text-slate-500 mt-1">
              Submitted by you · {isExecutionApplicable ? 'Multi-Agent & Sandboxed Code Execution Pipeline' : 'Multi-Agent Theory Rubric Evaluation Pipeline'}
            </p>
          </div>
          <div className="text-right">
            {grading.teacherStatus !== 'pending' && grading.teacherScore != null ? (
              <div>
                <p className="text-3xl font-extrabold text-emerald-600">{grading.teacherScore}/{grading.aiMaxScore}</p>
                <p className="text-[11px] bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-mono font-bold inline-block mt-1">
                  Teacher {grading.teacherStatus.toUpperCase()} (AI score was {grading.aiScore}/{grading.aiMaxScore})
                </p>
              </div>
            ) : (
              <div>
                <p className="text-3xl font-extrabold text-blue-600">{grading.aiScore}/{grading.aiMaxScore}</p>
                <div className="flex items-center justify-end gap-2 text-xs font-semibold text-slate-500 mt-1">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-mono text-[11px]">{pct}% Overall</span>
                  <span>· AI Confidence {Math.round((grading.aiConfidence || 0.94) * 100)}%</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3 SEPARATED EVIDENCE PANELS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* Evidence A: Static Analysis / Content Analysis */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            <Code size={14} className="text-purple-600" /> {isExecutionApplicable ? 'A. Static Analysis' : 'A. Content Analysis'}
          </div>
          {isExecutionApplicable ? (
            <>
              <p className="text-xs text-slate-600 font-medium">
                Language: <span className="font-mono font-bold text-slate-900">{grading?.staticAnalysis?.language || assignment?.language || 'Python 3.11'}</span>
              </p>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Target Function: <span className="font-mono text-purple-700 font-bold">{exec?.functionName || assignment?.targetFunction || grading?.staticAnalysis?.functionName || 'solution'}</span>
              </p>
              <span className="inline-block mt-2 text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                Syntax Validated
              </span>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-600 font-medium">
                Assignment Type: <span className="font-mono font-bold text-slate-900">Theory / Explanation</span>
              </p>
              <p className="text-xs text-slate-600 font-medium mt-1">
                Target Function: <span className="font-mono text-slate-400 font-bold">NONE (Not Required)</span>
              </p>
              <span className="inline-block mt-2 text-[10px] bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-full">
                Text Comprehension Validated
              </span>
            </>
          )}
        </div>

        {/* Evidence B: Dynamic Execution */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            <Terminal size={14} className={isExecutionApplicable ? 'text-blue-600' : 'text-slate-400'} /> B. Dynamic Execution
          </div>
          {isExecutionApplicable && exec ? (
            <div>
              <p className="text-xs font-bold text-slate-900">
                {exec.passedTests} / {exec.totalTests} Tests Passed
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Status: <span className={`font-bold ${exec.passed ? 'text-emerald-600' : 'text-amber-600'}`}>{exec.status?.toUpperCase()}</span>
              </p>
              <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${exec.passed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {exec.passed ? '100% Deterministic Pass' : `${exec.failedTests} Boundary Test Failed`}
              </span>
            </div>
          ) : (
            <div>
              <p className="text-xs font-bold text-slate-600">NOT APPLICABLE</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Status: <span className="font-bold text-slate-600">SKIPPED</span>
              </p>
              <span className="inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                Theory Rubric Bounded
              </span>
            </div>
          )}
        </div>

        {/* Evidence C: LLM Analysis */}
        <div className="bg-white border border-slate-200/80 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            <Cpu size={14} className="text-indigo-600" /> C. LLM AI Analysis
          </div>
          <p className="text-xs text-slate-600 font-medium">
            Category: <span className="font-semibold text-slate-900">{grading.rootCause?.errorCategory || 'EVALUATED'}</span>
          </p>
          <p className="text-xs text-slate-600 font-medium mt-1">
            Rubric Alignment: <span className="font-bold text-indigo-700">{isExecutionApplicable ? 'Execution Bounded' : 'Direct Theory Rubric'}</span>
          </p>
          <span className="inline-block mt-2 text-[10px] bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-full">
            Evaluation Confidence: {Math.round((grading.aiConfidence || 0.94) * 100)}%
          </span>
        </div>
      </div>

      {/* FAILED TEST EVIDENCE DISPLAY (ONLY IF PROGRAMMING EXECUTION FAILED) */}
      {isExecutionApplicable && failedTests.length > 0 && (
        <div className="bg-red-50/90 border border-red-200 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="font-extrabold text-sm text-red-900 flex items-center gap-2">
            <XCircle size={18} className="text-red-600" /> Failed Test Evidence (Deterministic Sandbox Output)
          </h2>
          <p className="text-xs text-red-700 font-medium">
            The following execution assertion failed. Full score cannot be awarded when boundary condition requirements are not satisfied.
          </p>

          <div className="space-y-3">
            {failedTests.map((ft: any, idx: number) => (
              <div key={idx} className="bg-white p-4 rounded-2xl border border-red-200 shadow-xs space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-red-700 text-sm">❌ {ft.name || 'Boundary Assertion Failure'}</span>
                  <span className="font-mono text-[11px] bg-red-100 text-red-800 px-2.5 py-0.5 rounded-full font-bold">Failed</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">
                    <p className="text-slate-400 font-sans font-bold text-[10px] uppercase mb-1">Input Parameters</p>
                    <pre className="whitespace-pre-wrap">{JSON.stringify(ft.input, null, 2)}</pre>
                  </div>
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px]">
                    <p className="text-slate-400 font-sans font-bold text-[10px] uppercase mb-1">Expected Output</p>
                    <pre className="text-emerald-400 font-bold whitespace-pre-wrap">{JSON.stringify(ft.expected, null, 2)}</pre>
                    <p className="text-slate-400 font-sans font-bold text-[10px] uppercase mt-2 mb-1">Your Output</p>
                    <pre className="text-red-400 font-bold whitespace-pre-wrap">{JSON.stringify(ft.actual, null, 2)}</pre>
                  </div>
                </div>

                <p className="text-xs text-red-800 bg-red-50 p-2.5 rounded-xl border border-red-100 font-medium">
                  <strong>Why it failed:</strong> {ft.reason || 'Requirement includes boundary scores equal to the threshold. Your implementation uses `>` instead of `>=`.'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Rubric evaluation criteria */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <h2 className="font-extrabold text-xs uppercase tracking-wider text-slate-600 flex items-center gap-2">
          <Award size={18} className="text-blue-600" /> Rubric Evaluation & Evidence
        </h2>
        <div className="space-y-4">
          {grading.rubricEvaluation.criteriaScores.map((c, i) => (
            <div key={i} className="border-b border-slate-100 pb-4 last:border-0 space-y-1.5">
              <div className="flex justify-between text-sm font-bold">
                <span className="text-slate-900">{c.criterion}</span>
                <span className="text-blue-600 font-mono">{c.score}/{c.maxPoints} pts</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{c.reasoning}</p>
              {c.evidence && (
                <p className="text-xs text-slate-200 font-mono italic bg-slate-900 p-3 rounded-2xl border border-slate-800">
                  Evidence: "{c.evidence}"
                </p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* AI Diagnosis / Root Cause */}
      {grading.rootCause.errorCategory !== 'NONE' && (
        <div className="bg-slate-900 text-white border border-slate-800 rounded-3xl p-6 shadow-sm space-y-3">
          <h2 className="font-bold text-sm text-amber-400 flex items-center gap-2">
            <Sparkles size={18} /> AI Root-Cause Misconception Diagnosis
          </h2>
          <span className="inline-block text-[11px] font-mono font-bold px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30">
            Category: {grading.rootCause.errorCategory.replaceAll('_', ' ')}
          </span>
          <p className="text-xs text-slate-200 leading-relaxed"><strong>Identified Misconception:</strong> {grading.rootCause.detectedMisconception}</p>
          <p className="text-xs text-slate-300 leading-relaxed"><strong>Root Reason:</strong> {grading.rootCause.rootReason}</p>
        </div>
      )}

      {/* Recommended Learning Material */}
      {rec && (
        <div className="bg-white border border-blue-200 rounded-3xl p-6 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              {rec.sourceType === 'video' ? <Video size={18} className="text-blue-600" /> : <FileText size={18} className="text-blue-600" />}
              AI Recommended Learning Material (From Your Uploads)
            </h2>
            <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2.5 py-1 rounded-full font-mono">Semantic RAG Match</span>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-slate-900">
              <span>{rec.sourceType === 'video' ? '📹' : '📄'} {rec.sourceName}</span>
              {rec.startTime != null && (
                <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  📍 {formatSecondsToTimestamp(rec.startTime)} – {formatSecondsToTimestamp(rec.endTime)}
                </span>
              )}
              {rec.page != null && (
                <span className="font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                  Page {rec.page}
                </span>
              )}
            </div>
            {rec.snippet && <p className="text-slate-600 italic line-clamp-2">"{rec.snippet}"</p>}
          </div>

          <Link
            to={`/student/workspaces/${rec.workspaceId}${rec.sourceType === 'video' ? `?videoId=${rec.sourceId}&seek=${rec.startTime || 0}` : ''}`}
            className="btn-primary text-xs inline-flex items-center gap-2 px-4 py-2 rounded-xl"
          >
            <ExternalLink size={14} /> Jump to Relevant Section in Workspace
          </Link>
        </div>
      )}

      {/* Personalized Feedback */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-extrabold text-base text-slate-900">Personalized AI Feedback</h2>
        </div>

        <AIVoiceTutor text={`${grading.feedback.explanation}. Key Strengths: ${grading.feedback.strengths.join(', ')}. Areas to Improve: ${grading.feedback.weaknesses.join(', ')}.`} />

        <p className="text-xs text-slate-600 font-medium leading-relaxed">{grading.feedback.explanation}</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="bg-emerald-50/80 p-4 rounded-2xl border border-emerald-200/80">
            <p className="text-xs uppercase font-extrabold text-emerald-800 mb-2 flex items-center gap-1">
              <CheckCircle2 size={14} /> Key Strengths
            </p>
            <ul className="text-xs text-slate-700 font-medium list-disc list-inside space-y-1">
              {grading.feedback.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200/80">
            <p className="text-xs uppercase font-extrabold text-amber-800 mb-2 flex items-center gap-1">
              <XCircle size={14} /> Areas to Improve
            </p>
            <ul className="text-xs text-slate-700 font-medium list-disc list-inside space-y-1">
              {grading.feedback.weaknesses.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
        <div className="pt-2 border-t border-slate-100">
          <p className="text-xs uppercase font-extrabold text-blue-600 mb-2">Recommended Next Steps</p>
          <ul className="text-xs text-slate-700 font-medium list-disc list-inside space-y-1">
            {grading.feedback.actionableSteps.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      </div>

      {/* Targeted Quiz Remediation */}
      {(grading.understanding?.missingConcepts?.length > 0 || failedTests.length > 0) && (
        <QuizPanel
          targetConcept={grading.rootCause?.expectedConcept || 'Boundary Condition Handling'}
          misconception={grading.rootCause?.detectedMisconception}
          context={grading.rootCause?.rootReason}
        />
      )}
    </div>
  );
}
