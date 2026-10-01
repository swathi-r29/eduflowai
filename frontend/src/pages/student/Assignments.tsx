import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import type { Assignment, Submission } from '../../types';
import { FileText, Clock, CheckCircle, ArrowRight, Upload } from 'lucide-react';

export default function Assignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [aRes, sRes] = await Promise.all([
          api.get('/assignments'),
          api.get('/submissions/mine')
        ]);
        setAssignments(aRes.data.assignments || []);
        setSubmissions(sRes.data.submissions || []);
      } catch (err) {
        console.error('Error loading assignments:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="p-8 text-slate-400 text-sm">Loading assignments...</div>;
  }

  const subMap = new Map<string, Submission>();
  submissions.forEach((s) => {
    const aId = typeof s.assignment === 'string' ? s.assignment : s.assignment?._id;
    if (aId) subMap.set(aId, s);
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Assignments</h1>
        <p className="text-sm text-slate-500 mt-1">
          View assigned coursework, submit your solutions, and review AI feedback.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assignments.map((assignment) => {
          const sub = subMap.get(assignment._id);

          return (
            <div key={assignment._id} className="card flex flex-col justify-between space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded bg-blue-50 text-blue-700 border border-blue-100 flex items-center gap-1">
                    <FileText size={12} /> Coursework
                  </span>
                  {sub ? (
                    <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <CheckCircle size={12} /> Submitted
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock size={12} /> Pending
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-base text-slate-900">{assignment.title}</h3>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {assignment.question}
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Max Marks: <strong>{assignment.maxScore || 100}</strong>
                </span>

                {sub ? (
                  <Link
                    to={`/student/submissions/${sub._id}`}
                    className="btn-secondary text-xs flex items-center gap-1"
                  >
                    View Feedback <ArrowRight size={12} />
                  </Link>
                ) : (
                  <Link
                    to={`/student/assignments/${assignment._id}/submit`}
                    className="btn-primary text-xs flex items-center gap-1"
                  >
                    <Upload size={12} /> Submit Assignment
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
