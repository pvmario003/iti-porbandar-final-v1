import React from "react";

interface DashboardStatsCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  colorClass?: string;
}

export default function DashboardStatsCard({
  title,
  value,
  icon,
  description,
  colorClass = "text-slate-700 bg-slate-50 border-slate-200"
}: DashboardStatsCardProps) {
  return (
    <div className={`p-5 rounded-xl border flex items-center gap-4 bg-white shadow-xs transition-all hover:shadow-sm ${colorClass}`}>
      <div className="p-3 rounded-lg bg-slate-100 shrink-0 text-slate-600">
        {icon}
      </div>
      <div>
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider block">
          {title}
        </span>
        <h3 className="text-2xl font-bold text-slate-900 mt-1 leading-none">
          {value}
        </h3>
        {description && (
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
