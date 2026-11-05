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
  purple: {
    bg: 'from-purple-500/10 to-transparent',
    border: 'hover:border-purple-500/50',
    iconBg: 'bg-purple-500/10 text-brand-purple-light border-purple-500/20',
    badge: 'bg-purple-400/10 text-brand-purple-light border-purple-400/30',
  },
  blue: {
    bg: 'from-blue-500/10 to-transparent',
    border: 'hover:border-blue-500/50',
    iconBg: 'bg-blue-500/10 text-brand-blue-light border-blue-500/20',
    badge: 'bg-blue-400/10 text-brand-blue-light border-blue-400/30',
  },
  indigo: {
    bg: 'from-indigo-500/10 to-transparent',
    border: 'hover:border-indigo-500/50',
    iconBg: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    badge: 'bg-indigo-400/10 text-indigo-400 border-indigo-400/30',
  },
  amber: {
    bg: 'from-amber-500/10 to-transparent',
    border: 'hover:border-amber-500/50',
    iconBg: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    badge: 'bg-amber-400/10 text-amber-400 border-amber-400/30',
  },
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
  const style = accentStyles[accent] || accentStyles.purple;

  return (
    <div className={`relative p-5 rounded-2xl bg-dark-900 border border-slate-800 bg-gradient-to-b ${style.bg} transition-all duration-300 ${style.border} group shadow-lg overflow-hidden`}>
      <div className="flex items-start justify-between">
        <div className={`p-3 rounded-xl border ${style.iconBg} transition-transform group-hover:scale-105 duration-200`}>
          <IconComponent className="w-5 h-5" />
        </div>

        {trend && (
          <span className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${style.badge}`}>
            {trendType === 'positive' && <ArrowUpRight className="w-3 h-3 mr-0.5" />}
            <span>{trend}</span>
          </span>
        )}
      </div>

      <div className="mt-4">
        <h3 className="text-xs font-medium text-slate-400 tracking-wide uppercase">{title}</h3>
        <p className="text-2xl font-extrabold text-white tracking-tight mt-1 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-slate-300 transition-colors">
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

