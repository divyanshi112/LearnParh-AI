import React from 'react';
import { 
  Clock, 
  BookOpen, 
  Target, 
  Flame, 
  ArrowUpRight, 
  Sparkles 
} from 'lucide-react';

const iconMap = {
  Clock,
  BookOpen,
  Target,
  Flame,
};

const accentStyles = {
  purple: 'text-brand-blue-light',
  blue: 'text-brand-blue-light',
  indigo: 'text-brand-blue-light',
  amber: 'text-amber-300',
};

export default function StatsCard({ 
  title, 
  value, 
  trend, 
  trendType = 'positive', 
  subtitle, 
  iconKey = 'Clock', 
  accent = 'purple' 
}) {
  const IconComponent = iconMap[iconKey] || Clock;
  const accentColor = accentStyles[accent] || accentStyles.purple;

  return (
    <div className="relative rounded-xl bg-dark-900 border border-slate-800 p-5 transition-colors hover:border-slate-700 group">
      <div className="flex items-start justify-between">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-dark-800">
          <IconComponent className={`w-4 h-4 ${accentColor}`} />
        </div>

        {trend && (
          <span className="inline-flex items-center space-x-1 px-2 py-1 rounded-md text-xs font-medium border border-slate-700 text-slate-300">
            {trendType === 'positive' && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
            <span>{trend}</span>
          </span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-medium text-slate-400 tracking-wide">{title}</h3>
        <p className="text-2xl font-semibold text-white tracking-tight mt-1">
          {value}
        </p>
      </div>

      {subtitle && (
        <p className="text-xs text-slate-500 mt-2 font-medium">
          {subtitle}
        </p>
      )}
    </div>
  );
}
