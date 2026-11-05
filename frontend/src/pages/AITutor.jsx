import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { Bot, Sparkles, Send, MessageSquare, Lightbulb, ArrowRight } from 'lucide-react';

const suggestedPrompts = [
  'Explain backpropagation intuitively with a toy example.',
  'What is the difference between Dijkstra and A* algorithms?',
  'Derive the time complexity of QuickSort in best vs worst case.',
  'Generate 3 practice questions on Bayes Theorem.',
];

export default function AITutor() {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'ai',
      text: "Hello Alex! I am your 24/7 LearnPath AI Tutor. Ask me any question from your syllabus or paste a problem you'd like to work through step by step.",
      time: '11:00 AM',
    },
  ]);
  const [input, setInput] = useState('');

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: input.trim(),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');

    // Simulated responsive feedback explaining Phase 3 Gemini API integration
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: `Thank you for your question! In Phase 3, this conversation will connect directly to the Google Gemini API with conversational context grounded in your study syllabus.`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    }, 600);
  };

  return (
    <DashboardLayout pageTitle="AI Tutor">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-3xl bg-gradient-to-br from-dark-900 to-dark-850 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-semibold text-brand-purple-light uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Google Gemini AI Integration Ready</span>
            </div>
            <h2 className="text-2xl font-bold text-white tracking-tight">24/7 Intelligent Tutor</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Conversational reasoning grounded in your enrolled computer science & math coursework.
            </p>
          </div>
          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-purple-500/10 text-brand-purple-light border border-purple-500/30 self-start sm:self-auto">
            Phase 3 Engine
          </span>
        </div>

        {/* Chat Container */}
        <div className="rounded-2xl border border-slate-800 bg-dark-900 shadow-xl overflow-hidden flex flex-col h-[520px]">
          {/* Chat Messages Log */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-brand-purple to-brand-blue flex items-center justify-center text-white shadow-glow-purple flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-lg p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-brand-purple to-brand-blue text-white rounded-tr-none'
                      : 'bg-dark-850 border border-slate-800 text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block text-right">
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Prompts */}
          <div className="px-6 py-2.5 bg-dark-850/50 border-t border-slate-800/80 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1 flex-shrink-0">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>Try:</span>
            </span>
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => setInput(p)}
                className="text-[11px] px-3 py-1 rounded-full bg-dark-800 hover:bg-dark-750 text-slate-300 border border-slate-700/60 whitespace-nowrap transition-colors flex-shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-4 bg-dark-900 border-t border-slate-800/80 flex items-center space-x-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question, request an explanation, or paste homework problem..."
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm rounded-xl bg-dark-850 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-brand-purple focus:ring-1 focus:ring-brand-purple"
            />
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-purple to-brand-blue text-white text-xs font-semibold shadow-glow-purple hover:opacity-95 transition-all flex items-center space-x-1.5"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}

