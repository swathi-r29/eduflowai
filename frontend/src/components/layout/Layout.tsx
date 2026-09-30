import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, LayoutDashboard, BookOpen, FolderKanban, BarChart3, Users, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const NAV: Record<string, { to: string; label: string; icon: any }[]> = {
  student: [
    { to: '/student', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/student/assignments', label: 'Assignments', icon: BookOpen },
    { to: '/student/workspaces', label: 'Study Workspace', icon: FolderKanban },
    { to: '/student/progress', label: 'Progress', icon: BarChart3 }
  ],
  teacher: [
    { to: '/teacher', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/classes', label: 'Classes', icon: Users },
    { to: '/teacher/submissions', label: 'Submissions', icon: BookOpen }
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: LayoutDashboard },
    { to: '/admin/users', label: 'Users', icon: Users },
    { to: '/admin/ai-usage', label: 'AI Usage', icon: ShieldCheck }
  ]
};

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const items = user ? NAV[user.role] : [];

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-800">
      
      {/* Light Clean Sidebar */}
      <aside className="w-64 shrink-0 border-r border-slate-200/80 bg-white flex flex-col justify-between shadow-xs">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-100">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-2.5 text-white shadow-md shadow-cyan-500/25 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight">
              EduFlow <span className="text-blue-600">AI</span>
            </span>
          </div>

          {/* Navigation Items */}
          <nav className="px-3 py-4 space-y-1">
            {items.map(({ to, label, icon: Icon }) => {
              const isActive = location.pathname === to;
              return (
                <Link
                  key={to}
                  to={to}
                  className={`flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 font-semibold border-r-4 border-blue-600 rounded-l-xl rounded-r-xs shadow-2xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium rounded-xl'
                  }`}
                >
                  <Icon size={18} className={isActive ? 'text-blue-600' : 'text-slate-400'} />
                  {label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile Footer */}
        <div className="p-3 m-3 bg-slate-50/80 border border-slate-200/70 rounded-2xl">
          <div className="flex flex-col">
            <span className="text-xs font-bold text-slate-900 truncate">{user?.name}</span>
            <span className="text-[11px] text-slate-500 truncate mb-2">{user?.email}</span>
            <button
              onClick={() => { logout(); navigate('/login'); }}
              className="flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-red-600 transition cursor-pointer pt-2 border-t border-slate-200/60"
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Area with Ambient Blue Splash Theme */}
      <main className="flex-1 overflow-y-auto bg-ambient-splash relative overflow-hidden">
        
        {/* Ambient Blue Splash Orbs */}
        <div className="absolute top-0 left-1/4 w-[550px] h-[550px] bg-sky-300/35 blur-[160px] rounded-full pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[450px] h-[450px] bg-indigo-300/25 blur-[140px] rounded-full pointer-events-none" />

        {/* Flowing background accents */}
        <svg
          className="absolute inset-0 w-full h-full stroke-blue-200/50 pointer-events-none opacity-60"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M-100 200 C 300 100, 600 350, 1200 150 C 1500 50, 1800 250, 2100 100"
            strokeWidth="1.5"
            strokeDasharray="6 6"
          />
          <path
            d="M-100 500 C 400 650, 800 400, 1400 600"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        </svg>

        {/* Content Container */}
        <div className="max-w-6xl mx-auto px-6 md:px-8 py-8 relative z-10">{children}</div>
      </main>
    </div>
  );
}

