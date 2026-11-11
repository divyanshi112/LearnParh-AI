import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const resp = await loginUser({ email, password });
      if (resp.success) {
        signIn(resp.token, resp.user);
        navigate('/dashboard', { replace: true });
      } else {
        setError(resp.message || 'Login failed');
      }
    } catch (err) {
      setError(err.message || 'Could not complete sign-in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-dark-950 px-4 py-10 text-slate-100">
      <div className="w-full max-w-md">
        <div className="mb-8 flex items-center justify-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-blue text-white">
            <GraduationCap className="h-5 w-5" />
          </span>
          <span className="text-lg font-semibold tracking-tight">LearnPath <span className="text-brand-blue-light">AI</span></span>
        </div>
        <div className="space-y-6 rounded-xl border border-slate-800 bg-dark-900 p-6 sm:p-8">
          <div className="text-center">
            <h1 className="text-2xl font-semibold tracking-tight text-white">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-400">Sign in to continue to your study workspace.</p>
          </div>
          {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
          <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field-control px-3 py-2.5"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
              className="field-control px-3 py-2.5"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full rounded-lg py-2.5 text-sm font-medium"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Don’t have an account?{' '}
          <Link to="/register" className="font-medium text-brand-blue-light hover:underline">
            Create an account
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
