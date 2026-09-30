import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Video, BrainCircuit, Target, GraduationCap, ArrowRight } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen bg-ambient-splash flex flex-col justify-between text-slate-800 relative overflow-hidden">
      
      {/* Ambient Blue Splash Glow Orbs */}
      <div className="absolute top-0 left-10 w-[500px] h-[500px] bg-sky-300/30 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-20 right-10 w-[450px] h-[450px] bg-indigo-300/25 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Navbar */}
      <header className="flex items-center justify-between px-6 md:px-12 py-6 max-w-6xl mx-auto w-full z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 p-2.5 text-white shadow-md shadow-cyan-500/25 flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <span className="font-extrabold text-xl text-slate-900 tracking-tight">
            EduFlow <span className="text-blue-600">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/login" className="btn-secondary text-sm px-4 py-2">
            Sign in
          </Link>
          <Link to="/register" className="btn-primary text-sm px-5 py-2">
            Get started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-12 max-w-4xl mx-auto w-full z-10">
        
        {/* Subhead Badge */}
        <div className="inline-flex items-center gap-2 bg-blue-50/90 border border-blue-200/60 text-blue-600 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide uppercase mb-6 shadow-xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Agentic Multimodal Learning</span>
        </div>

        {/* Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-slate-900 max-w-3xl leading-[1.18] tracking-tight">
          An AI that diagnoses{' '}
          <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            why
          </span>{' '}
          a student got it wrong — not just that they did.
        </h1>

        {/* Subtitle */}
        <p className="text-slate-600 text-base sm:text-lg max-w-xl mt-6 leading-relaxed font-normal">
          EduFlow AI grades submissions with root-cause reasoning, tutors students on their own notes and lectures, and adapts learning pathways to what students need next.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
          <Link to="/register" className="btn-primary px-7 py-3.5 text-sm font-bold rounded-2xl shadow-lg shadow-blue-500/25 flex items-center gap-2">
            Get Started Free <ArrowRight className="w-4 h-4" />
          </Link>

          <Link to="/login" className="btn-secondary px-7 py-3.5 text-sm font-semibold rounded-2xl">
            Sign In to Portal
          </Link>
        </div>

        {/* Simple 3-Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-16 text-left w-full">
          
          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Target className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Root-cause diagnosis</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Not just a score — a categorized explanation of the exact misconception behind every error.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <Video className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Multimodal video tutor</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Ask questions and get answers grounded directly in your uploaded lecture materials with sources.
            </p>
          </div>

          <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm hover:shadow-md hover:border-slate-300 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Adaptive knowledge profile</h3>
            <p className="text-sm text-slate-500 leading-relaxed">
              Every submission updates a live mastery profile that automatically customizes future quizzes.
            </p>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-xs text-slate-400 border-t border-slate-200/60 z-10">
        &copy; {new Date().getFullYear()} EduFlow AI. Empowering Intelligent Learning.
      </footer>

    </div>
  );
}


