import React, { useMemo } from 'react';

interface StreakCalendarProps {
  streakCount?: number;
  submissions?: Array<{ createdAt?: string | Date; [key: string]: any }>;
}

export default function StreakCalendar({ streakCount = 1, submissions = [] }: StreakCalendarProps) {
  // Generate 30-day submission frequency matrix leading up to today
  const activityDays = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const countsMap = new Map<number, number>();
    submissions.forEach((s) => {
      if (!s.createdAt) return;
      const d = new Date(s.createdAt);
      d.setHours(0, 0, 0, 0);
      const time = d.getTime();
      countsMap.set(time, (countsMap.get(time) || 0) + 1);
    });

    for (let i = 29; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const timestamp = date.getTime();
      const count = countsMap.get(timestamp) || 0;

      days.push({
        date,
        dateFormatted: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        isToday: i === 0,
        count,
      });
    }

    return days;
  }, [submissions]);

  const totalSubmissions = submissions.length;
  const activeDaysCount = activityDays.filter((d) => d.count > 0).length;
  const activeStreak = streakCount > 0 ? streakCount : activeDaysCount > 0 ? 1 : 0;

  const getIntensityClass = (count: number, isToday: boolean) => {
    if (count === 0) {
      return isToday
        ? 'bg-blue-50/90 border-2 border-blue-500 text-blue-700 font-extrabold hover:bg-blue-100'
        : 'bg-slate-100/90 border border-slate-200/60 hover:bg-slate-200/90 text-slate-400';
    }
    if (count === 1) {
      return 'bg-emerald-200 border border-emerald-300 text-emerald-950 font-black hover:bg-emerald-300 shadow-2xs';
    }
    if (count === 2) {
      return 'bg-emerald-400 border border-emerald-500 text-emerald-950 font-black hover:bg-emerald-500 shadow-xs';
    }
    return 'bg-emerald-600 border border-emerald-700 text-white font-black hover:bg-emerald-700 shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/20';
  };

  return (
    <div className="bg-white border border-slate-200/80 rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center text-xl shadow-md shadow-orange-500/20 animate-pulse">
            🔥
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <span>Learning Streak & Activity Matrix</span>
              <span className="text-xs font-black text-amber-600 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                {activeStreak} Day Streak!
              </span>
            </h3>
            <p className="text-xs font-medium text-slate-500">
              LeetCode-style green intensity heatmap tracking your daily assignment submissions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-700">
          <div className="bg-amber-50/90 border border-amber-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-amber-900 shadow-2xs">
            <span className="text-amber-600">⚡</span>
            <span>{activeDaysCount} Days Active</span>
          </div>
          <div className="bg-emerald-50/90 border border-emerald-200/80 px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 text-emerald-900 shadow-2xs">
            <span className="text-emerald-600">📚</span>
            <span>{totalSubmissions} Submissions</span>
          </div>
        </div>
      </div>

      {/* 30-Day Activity Heatmap Grid */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
          <span>Past 30 Days Activity</span>
          <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-extrabold">
            <span>Less</span>
            <div className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-200" title="0 submissions" />
            <div className="w-3.5 h-3.5 rounded bg-emerald-200 border border-emerald-300" title="1 submission" />
            <div className="w-3.5 h-3.5 rounded bg-emerald-400 border border-emerald-500" title="2 submissions" />
            <div className="w-3.5 h-3.5 rounded bg-emerald-600 border border-emerald-700" title="3+ submissions" />
            <span>More</span>
          </div>
        </div>

        <div className="grid grid-cols-10 sm:grid-cols-15 gap-2">
          {activityDays.map((day, idx) => (
            <div
              key={idx}
              title={`${day.dateFormatted}: ${
                day.count === 0
                  ? 'No Submissions'
                  : `${day.count} Submission${day.count > 1 ? 's' : ''} Completed 🔥`
              }`}
              className={`h-7 sm:h-8 rounded-lg transition-all cursor-pointer ${getIntensityClass(
                day.count,
                day.isToday
              )}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
