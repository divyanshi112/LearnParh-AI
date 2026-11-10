import React, { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { AlertCircle, Bot, Sparkles, Send, Lightbulb, LoaderCircle } from 'lucide-react';
import { sendTutorMessage } from '../services/aiService.js';

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
      text: "Hello! I am your LearnPath AI Tutor. Ask me any question or paste a problem you'd like to work through step by step.",
      time: '11:00 AM',
    },
  ]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = async (e) => {
    e.preventDefault();
    const message = input.trim();
    if (!message || isSending) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: message,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError('');
    setIsSending(true);
    try {
      const response = await sendTutorMessage(message);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: 'ai',
          text: response,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } catch (requestError) {
      setError(requestError.message || 'The AI Tutor request failed. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <DashboardLayout pageTitle="AI Tutor">
      <div className="space-y-6">
        {/* Banner */}
        <div className="p-6 rounded-xl bg-dark-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Powered by Google Gemini</span>
            </div>
            <h2 className="text-2xl font-semibold text-white tracking-tight">24/7 Intelligent Tutor</h2>
            <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-xl">
              Ask questions, get clear explanations, and work through problems step by step.
            </p>
          </div>
          <span className="text-xs font-medium px-3 py-1.5 rounded-md bg-dark-800 text-slate-300 border border-slate-700 self-start sm:self-auto">
            AI Tutor
          </span>
        </div>

        {/* Chat Container */}
        <div className="rounded-xl border border-slate-800 bg-dark-900 overflow-hidden flex flex-col min-h-[480px] h-[min(520px,calc(100dvh-14rem))]">
          {/* Chat Messages Log */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex items-start space-x-3 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'ai' && (
                  <div className="w-8 h-8 rounded-lg bg-brand-blue flex items-center justify-center text-white flex-shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-lg p-4 rounded-xl text-xs sm:text-sm leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-brand-blue text-white rounded-tr-none'
                      : 'bg-dark-850 border border-slate-800 text-slate-200 rounded-tl-none'
                  }`}
                >
                  <p>{m.text}</p>
                  <span className="text-[10px] text-slate-400 mt-1.5 block text-right">
                    {m.time}
                  </span>
                </div>
              </div>
            ))}
            {isSending && (
              <div className="flex items-center gap-2 text-sm text-slate-400" role="status">
                <LoaderCircle className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            )}
          </div>
          {error && (
            <div className="mx-4 sm:mx-6 mb-3 flex items-start gap-2 rounded-lg border border-red-900/60 bg-red-950/30 px-3 py-2 text-sm text-red-300" role="alert">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Quick Prompts */}
          <div className="px-4 sm:px-6 py-2.5 bg-dark-850 border-t border-slate-800 flex items-center space-x-2 overflow-x-auto no-scrollbar">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 flex items-center space-x-1 flex-shrink-0">
              <Lightbulb className="w-3 h-3 text-amber-400" />
              <span>Try:</span>
            </span>
            {suggestedPrompts.map((p, i) => (
              <button
                key={i}
                onClick={() => setInput(p)}
                type="button"
                disabled={isSending}
                className="text-[11px] px-3 py-1.5 rounded-md bg-dark-800 hover:bg-dark-700 text-slate-300 border border-slate-700 whitespace-nowrap transition-colors flex-shrink-0"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <form onSubmit={handleSend} className="p-3 sm:p-4 bg-dark-900 border-t border-slate-800 flex items-center gap-2 sm:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isSending}
              maxLength={4000}
              placeholder="Ask a question, request an explanation, or paste homework problem..."
              className="field-control min-w-0 flex-1 px-3 sm:px-4 py-2.5 text-xs sm:text-sm"
            />
            <button
              type="submit"
              disabled={isSending || !input.trim()}
              className="button-primary px-3 sm:px-4 py-2.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <span>{isSending ? 'Sending' : 'Send'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </DashboardLayout>
  );
}
