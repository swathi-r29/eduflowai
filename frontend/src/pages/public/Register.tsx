import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, BookOpen, Sparkles } from 'lucide-react';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'student' | 'teacher'>('student');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await register(name, email, password, role);
      navigate(`/${user.role}`);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      if (err.response?.status === 409) {
        setError('An account with this email already exists. Please sign in instead.');
      } else {
        setError(serverMsg || 'Registration failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/80 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-blue-100/50 via-slate-50 to-indigo-50/30 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-400/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-400/10 blur-[100px] rounded-full pointer-events-none" />

      {/* Main Register Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-2.5 mb-2">
          <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 p-2 rounded-xl text-white shadow-md shadow-blue-500/20 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-xl font-bold text-slate-900 tracking-tight">
            EduFlow <span className="text-blue-600">AI</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-center mt-4">
          Create account
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">
          Join EduFlow AI as a Student or Teacher.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium mb-5 text-center">
            {error}
          </div>
        )}

        {/* Role Selector Cards */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <button
            type="button"
            onClick={() => setRole('student')}
            className={`p-3.5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer ${
              role === 'student'
                ? 'border-2 border-blue-600 bg-blue-50/40 text-blue-600 shadow-sm'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-full ${role === 'student' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">I am a Student</span>
          </button>

          <button
            type="button"
            onClick={() => setRole('teacher')}
            className={`p-3.5 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer ${
              role === 'teacher'
                ? 'border-2 border-blue-600 bg-blue-50/40 text-blue-600 shadow-sm'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className={`p-2 rounded-full ${role === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <GraduationCap className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold">I am a Teacher</span>
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Full Name
            </label>
            <input
              type="text"
              placeholder="e.g. Dharshini"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. student@nec.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all duration-200 mt-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-xs text-slate-500 text-center mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-blue-600 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

