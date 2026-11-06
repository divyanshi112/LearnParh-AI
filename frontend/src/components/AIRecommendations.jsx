import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  BrainCircuit, 
  Clock, 
  CheckCircle, 
  Layers,
  ChevronRight
} from 'lucide-react';
import { aiRecommendations } from '../services/dashboardService';

const difficultyBadges = {
  Beginner: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  Intermediate: 'bg-dark-800 text-slate-300 border-slate-700',
  Advanced: 'bg-dark-800 text-slate-300 border-slate-700',
};

export default function AIRecommendations({ recommendations = aiRecommendations }) {
  const [activeTopic, setActiveTopic] = useState(null);
  const [startedTopics, setStartedTopics] = useState([]);

  const handleStartTopic = (rec) => {
    setActiveTopic(rec);
    if (!startedTopics.includes(rec.id)) {
      setStartedTopics([...startedTopics, rec.id]);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-dark-900 p-5 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-1 rounded-md bg-brand-blue text-white">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
              AI Recommendations & Study Suggestions
            </h3>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-dark-800 text-slate-400 border border-slate-700">
              Personalized
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            GenAI suggestions based on your recent quiz retention patterns
          </p>
        </div>

        <span className="text-[11px] text-slate-500 font-mono">
          Powered by Gemini AI (Roadmap)
        </span>
      </div>

      {/* Recommendations Cards Grid */}
      <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        {recommendations.map((rec) => {
          const isStarted = startedTopics.includes(rec.id);
          const difficultyStyle = difficultyBadges[rec.difficulty] || difficultyBadges.Intermediate;

          return (
            <div
              key={rec.id}
              className="p-4 rounded-lg bg-dark-850 border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between group"
            >
              <div>
                {/* Meta Top: Subject + Difficulty */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                    {rec.subject}
                  </span>
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${difficultyStyle}`}>
                    {rec.difficulty}
                  </span>
                </div>

                {/* Topic Title */}
                <h4 className="text-sm font-semibold text-white mt-2 tracking-tight">
                  {rec.topic}
                </h4>

                {/* AI Reasoning */}
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  {rec.reason}
                </p>
              </div>

              {/* Bottom: Duration & Action Button */}
              <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center text-xs text-slate-400 space-x-1.5 font-medium">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  <span>{rec.duration}</span>
                </div>

                <button
                  onClick={() => handleStartTopic(rec)}
                  className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                    isStarted
                      ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                      : 'bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700'
                  }`}
                >
                  {isStarted ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>In Progress</span>
                    </>
                  ) : (
                    <>
                      <span>Start Topic</span>
                      <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Active Modal / Toast when topic is initiated */}
      {activeTopic && (
        <div className="mt-4 p-3.5 rounded-lg bg-dark-850 border border-slate-700 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2 text-slate-300">
            <Sparkles className="w-4 h-4 text-brand-blue-light flex-shrink-0" />
            <span>
              Topic session prepared: <strong>{activeTopic.topic}</strong>. AI Tutor module will be activated in Phase 3.
            </span>
          </div>
          <button
            onClick={() => setActiveTopic(null)}
            className="text-[11px] text-slate-400 hover:text-white px-2 py-0.5"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
