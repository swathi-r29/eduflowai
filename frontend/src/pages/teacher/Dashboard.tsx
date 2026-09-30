import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { Plus, Users, BookOpen, ChevronRight, Sparkles, FolderPlus } from 'lucide-react';

export default function TeacherDashboard() {
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/classes');
      const list = Array.isArray(res.data) ? res.data : (res.data?.classes || []);
      setClasses(list);
    } catch (e) {
      console.error(e);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalStudents = (classes || []).reduce((acc, c) => acc + (c.students?.length || c.studentIds?.length || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm">
        <div>
          <div className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full px-3 py-1 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" /> Educator Workspace
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Teacher Dashboard
          </h1>
          <p className="text-slate-500 text-sm mt-1">Manage classrooms, create rubric assignments, and review AI submissions.</p>
        </div>
        <Link to="/teacher/classes" className="btn-primary text-xs font-bold px-5 py-2.5 rounded-xl shadow-md shadow-blue-500/20">
          <Plus size={16} /> Create New Class
        </Link>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">TOTAL CLASSES</p>
          <p className="text-4xl font-extrabold text-slate-900">{(classes || []).length}</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Active learning cohorts</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">ENROLLED STUDENTS</p>
          <p className="text-4xl font-extrabold text-slate-900">{totalStudents}</p>
          <p className="text-xs font-medium text-slate-500 mt-1">Students across all classes</p>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex flex-col gap-2.5 justify-center">
          <Link to="/teacher/classes" className="btn-primary text-center text-xs font-bold py-2.5 rounded-xl shadow-md shadow-blue-500/20">
            Create Assignment Rubric
          </Link>
          <Link to="/teacher/submissions" className="btn-secondary text-center text-xs font-semibold py-2.5 rounded-xl">
            Review AI Submissions
          </Link>
        </div>
      </div>

      {/* Class List Grid */}
      <div className="bg-white border border-slate-200/80 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <h2 className="font-extrabold text-slate-900 text-base flex items-center gap-2">
            <BookOpen size={18} className="text-blue-600" /> Active Classrooms ({(classes || []).length})
          </h2>
          <Link to="/teacher/classes" className="text-xs text-blue-600 font-bold hover:underline">
            Manage All Classes &rarr;
          </Link>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-slate-500">Loading classrooms...</div>
        ) : (classes || []).length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(classes || []).map((c) => {
              const studentCount = (c.students?.length || c.studentIds?.length || 0);
              return (
                <div key={c._id || c.id} className="p-5 rounded-2xl bg-slate-50/90 border border-slate-200/70 hover:border-blue-300 hover:bg-white transition-all shadow-xs flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-base text-slate-900">{c.name}</h3>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">{c.subject || 'General Subject'}</p>
                    <div className="mt-4 flex items-center gap-4 text-xs">
                      <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2.5 py-1 rounded-lg font-mono font-bold">
                        Code: {c.joinCode}
                      </span>
                      <span className="text-slate-500 flex items-center gap-1 font-semibold">
                        <Users size={14} /> {studentCount} student{studentCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-end">
                    <Link to={`/teacher/classes/${c._id || c.id}`} className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1">
                      Manage Classroom <ChevronRight size={14} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 bg-slate-50/60 rounded-2xl border border-dashed border-slate-200 space-y-3">
            <FolderPlus className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No classes created yet. Click "Create New Class" to set up your first classroom.
            </p>
            <Link to="/teacher/classes" className="btn-primary text-xs font-bold px-4 py-2 inline-flex items-center gap-1">
              + Create Class
            </Link>
          </div>
        )}
      </div>

    </div>
  );
}

