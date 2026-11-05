import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

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
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-sm space-y-6 p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-center text-2xl font-bold">Register</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1" htmlFor="name">Full Name</label>
            <input
              id="name"
              type="text"
              required
              className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="pw">Password</label>
            <input
              id="pw"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
              value={pw}
              onChange={e => setPw(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="pw2">Confirm Password</label>
            <input
              id="pw2"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
              value={pw2}
              onChange={e => setPw2(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded transition"
          >
            {loading ? 'Creating…' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm">
          Already have an account?{' '}
          <Link to="/login" className="text-purple-400 hover:underline">
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
