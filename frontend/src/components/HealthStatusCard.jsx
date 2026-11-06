import React, { useState, useEffect } from 'react';
import {
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Clock,
  Globe,
  Terminal,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle
} from 'lucide-react';
import { fetchHealthStatus } from '../services/api';

export default function HealthStatusCard() {
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showRaw, setShowRaw] = useState(false);
  const [lastChecked, setLastChecked] = useState(null);

  const performHealthCheck = async () => {
    setLoading(true);
    const result = await fetchHealthStatus();
    setHealth(result);
    setLastChecked(new Date().toLocaleTimeString());
    setLoading(false);
  };

  useEffect(() => {
    performHealthCheck();
  }, []);

  const isConnected = Boolean(health?.success && health?.data?.status === 'healthy');

  return (
    <div className="rounded-xl border border-slate-800 bg-dark-900 overflow-hidden">
      {/* Top Header Bar */}
      <div className="px-5 py-4 border-b border-slate-800 flex flex-wrap items-center justify-between gap-4 bg-dark-900">
        <div className="flex items-center space-x-3">
          {/* Status Icon Indicator */}
          <div className={`p-2.5 rounded-lg border transition-colors duration-150 ${loading
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
              : isConnected
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
            }`}>
            <Server className="w-5 h-5" />
          </div>

          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-semibold text-white tracking-tight">Backend Health Verification</h2>

              {/* Dynamic Connection Status Badge (Requirement 4 & 5) */}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium tracking-wide transition-colors duration-150 ${loading
                  ? 'bg-amber-400/10 text-amber-400 border border-amber-400/30'
                  : isConnected
                    ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30'
                    : 'bg-rose-400/10 text-rose-400 border border-rose-400/30'
                }`}>
                <span className={`w-2 h-2 rounded-full mr-1.5 ${loading
                    ? 'bg-amber-400 animate-pulse'
                    : isConnected
                      ? 'bg-emerald-400'
                      : 'bg-rose-400'
                  }`}></span>
                {loading ? 'Connecting...' : isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Live communication with <code className="text-brand-purple-light font-mono">GET /api/health</code>
            </p>
          </div>
        </div>

        {/* Action Button: Re-test Connection */}
        <button
          onClick={performHealthCheck}
          disabled={loading}
          className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg text-xs font-medium bg-dark-800 hover:bg-dark-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-purple-light' : 'text-slate-400'}`} />
          <span>{loading ? 'Pinging Server...' : 'Test Connection'}</span>
        </button>
      </div>

      {/* Main Stats Grid */}
      <div className="p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Connection Status & Backend Message */}
          <div className="p-4 rounded-lg bg-dark-850 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Connection Status</span>
              {loading ? (
                <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
              ) : isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400" />
              )}
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {loading ? 'Checking...' : isConnected ? 'Connected' : 'Disconnected'}
              </div>
              {/* Requirement 6: Display backend status message */}
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                {loading
                  ? 'Request in flight...'
                  : isConnected
                    ? health?.data?.message
                    : (health?.error || 'Unable to establish connection')}
              </p>
            </div>
          </div>

          {/* Card 2: Round-trip Latency */}
          <div className="p-4 rounded-lg bg-dark-850 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Round-trip Latency</span>
              <Zap className="w-4 h-4 text-brand-blue-light" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {loading ? '--' : `${health?.latencyMs ?? 0} ms`}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Client HTTP round-trip
              </p>
            </div>
          </div>

          {/* Card 3: Backend Environment */}
          <div className="p-4 rounded-lg bg-dark-850 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Environment</span>
              <Globe className="w-4 h-4 text-brand-purple-light" />
            </div>
            <div>
              <div className="text-base font-bold text-white font-mono uppercase text-sm">
                {health?.data?.environment || 'development'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Target: <span className="font-mono text-slate-300">port 5000</span>
              </p>
            </div>
          </div>

          {/* Card 4: Last Verified / Uptime */}
          <div className="p-4 rounded-lg bg-dark-850 border border-slate-800 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-medium">Last Ping</span>
              <Clock className="w-4 h-4 text-slate-400" />
            </div>
            <div>
              <div className="text-base font-bold text-white">
                {lastChecked || 'Pending...'}
              </div>
              <p className="text-xs text-slate-400 mt-1">
                {health?.data?.uptime !== undefined
                  ? `Uptime: ${health.data.uptime}s`
                  : (isConnected ? 'Server active' : 'Offline')}
              </p>
            </div>
          </div>
        </div>

        {/* Diagnostic Error Banner (Requirement 7: Error State Handling) */}
        {!isConnected && !loading && (
          <div className="mt-4 p-4 rounded-xl bg-rose-950/30 border border-rose-800/50 flex items-start space-x-3 text-rose-300 text-xs">
            <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-200">Connection Failed: </span>
              <span>{health?.error}</span>
              <p className="mt-1 text-slate-400">
                Please make sure the Express backend server is running via <code className="text-slate-300 bg-dark-800 px-1 py-0.5 rounded">npm run dev</code> inside <code className="text-slate-300 bg-dark-800 px-1 py-0.5 rounded">backend/</code>.
              </p>
            </div>
          </div>
        )}

        {/* Collapsible Raw JSON Response Viewer */}
        <div className="mt-5 border-t border-slate-800/80 pt-4">
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center justify-between w-full text-xs font-medium text-slate-400 hover:text-slate-200 transition-colors py-1"
          >
            <span className="flex items-center space-x-2">
              <Terminal className="w-3.5 h-3.5 text-brand-purple-light" />
              <span>Inspect Raw JSON Payload from Backend</span>
            </span>
            {showRaw ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showRaw && (
            <div className="mt-3 p-4 rounded-xl bg-dark-950 border border-slate-800 font-mono text-xs overflow-x-auto">
              <pre className={isConnected ? 'text-emerald-400' : 'text-rose-400'}>
                {JSON.stringify(health?.data || { error: health?.error, status: 'disconnected' }, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
