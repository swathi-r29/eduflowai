import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { GraduationCap, BookOpen, ShieldCheck } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [selectedRole, setSelectedRole] = useState<'teacher' | 'student' | 'admin'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await login(email, password, selectedRole);
      navigate(`/${user.role}`);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.response?.data?.error || 'Login failed. Please check your credentials.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const roleTitle = selectedRole === 'student' ? 'Student' : selectedRole === 'teacher' ? 'Teacher' : 'Administrator';

  return (
    <div className="min-h-screen bg-ambient-splash flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-sky-300/35 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 w-[450px] h-[450px] bg-indigo-300/25 blur-[140px] rounded-full pointer-events-none" />

      {/* Main Login Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/80 rounded-3xl p-7 sm:p-9 shadow-xl shadow-slate-200/60 backdrop-blur-xl relative z-10">
        
        {/* Brand Header */}
        <div className="flex items-center justify-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-2.5 text-white shadow-md shadow-cyan-500/25 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="text-xl font-extrabold text-slate-900 tracking-tight">
            EduFlow <span className="text-blue-600">AI</span>
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight text-center mt-4">
          Welcome back
        </h1>
        <p className="text-sm text-slate-500 text-center mt-1 mb-6">
          Sign in to your EduFlow AI account to continue.
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-2xl text-xs font-medium mb-5 text-center">
            {error}
          </div>
        )}

        {/* Role Selector Cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setSelectedRole('teacher')}
            className={`p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'teacher'
                ? 'border-2 border-blue-600 bg-blue-50/40 text-blue-600 shadow-sm'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-full ${selectedRole === 'teacher' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <GraduationCap className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Sign in as Teacher</span>
          </button>

          <button
            type="button"
            onClick={() => setSelectedRole('student')}
            className={`p-4 rounded-2xl border text-center transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer ${
              selectedRole === 'student'
                ? 'border-2 border-blue-600 bg-blue-50/40 text-blue-600 shadow-sm'
                : 'border-slate-200/90 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className={`p-2.5 rounded-full ${selectedRole === 'student' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold">Sign in as Student</span>
          </button>
        </div>

        {/* Admin Link option */}
        <div className="text-center mb-6">
          <span className="text-xs text-slate-500">Are you an Administrator? </span>
          <button
            type="button"
            onClick={() => setSelectedRole('admin')}
            className={`text-xs font-semibold transition hover:underline cursor-pointer ${
              selectedRole === 'admin' ? 'text-blue-600 font-bold underline' : 'text-blue-600'
            }`}
          >
            Sign in as Admin
          </button>
        </div>

        {/* Form Inputs */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 mb-1.5 block">
              Email or Roll Number
            </label>
            <input
              type="text"
              placeholder="e.g. 2312012@nec.edu.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Password
              </label>
              <a href="#forgot" onClick={(e) => { e.preventDefault(); alert('Please contact your administrator to reset your password.'); }} className="text-xs font-semibold text-blue-600 hover:underline">
                Forgot password?
              </a>
            </div>
            <input
              type="password"
              placeholder="••••••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full bg-[#EFF5FF] border border-blue-100 rounded-2xl px-4 py-3 text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
            />
          </div>

          <div className="flex items-center pt-1">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              Remember me
            </label>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-2xl shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/35 transition-all duration-200 mt-2 disabled:opacity-60 cursor-pointer"
          >
            {loading ? 'Signing In...' : `Sign In as ${roleTitle}`}
          </button>
        </form>

        {/* Footer Link */}
        <p className="text-xs text-slate-500 text-center mt-6">
          Don't have an account?{' '}
          <Link to="/register" className="text-blue-600 font-semibold hover:underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

