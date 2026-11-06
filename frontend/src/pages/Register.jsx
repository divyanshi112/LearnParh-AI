import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';
import { GraduationCap } from 'lucide-react';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (pw !== pw2) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const resp = await registerUser({ name, email, password: pw });
      if (resp.success) {
        navigate('/login');
      } else {
        setError(resp.message ?? 'Registration failed');
      }
    } catch (err) {
      setError('Network error – cannot reach the server');
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
            <h1 className="text-2xl font-semibold tracking-tight text-white">Create your account</h1>
            <p className="mt-2 text-sm text-slate-400">Set up your student workspace to get started.</p>
          </div>
        {error && <p role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">{error}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="name">Full name</label>
            <input
              id="name"
              type="text"
              required
              autoComplete="name"
              className="field-control px-3 py-2.5"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="email"
              className="field-control px-3 py-2.5"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="field-control px-3 py-2.5"
              value={pw}
              onChange={e => setPw(e.target.value)}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-300" htmlFor="pw2">Confirm password</label>
            <input
              id="pw2"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              className="field-control px-3 py-2.5"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="button-primary w-full rounded-lg py-2.5 text-sm font-medium"
          >
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-brand-blue-light hover:underline">
            Login here
          </Link>
        </p>
        </div>
      </div>
    </div>
  );
}
