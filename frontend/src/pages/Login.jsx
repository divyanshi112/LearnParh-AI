import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { loginUser } from '../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const resp = await loginUser({ email, password });
      if (resp.success) {
        // store JWT safely – for demo we use localStorage (could be HttpOnly cookie later)
        localStorage.setItem('token', resp.token);
        // optional: store minimal user info
        localStorage.setItem('user', JSON.stringify(resp.user));
        navigate('/');
      } else {
        setError(resp.message || 'Login failed');
      }
    } catch (err) {
      setError('Network error – could not reach the server');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900 text-white">
      <div className="w-full max-w-sm space-y-6 p-6 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-center text-2xl font-bold">Login</h2>
        {error && <p className="text-red-500 text-center">{error}</p>}
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm mb-1" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              required
              className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={6}
              className="w-full px-3 py-2 rounded bg-gray-700 focus:outline-none"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="w-full py-2 bg-purple-600 hover:bg-purple-500 rounded transition"
          >
            Sign In
          </button>
        </form>
        <p className="text-center text-sm">
          Don’t have an account?{' '}
          <Link to="/register" className="text-purple-400 hover:underline">
            Register here
          </Link>
        </p>
      </div>
    </div>
  );
}

