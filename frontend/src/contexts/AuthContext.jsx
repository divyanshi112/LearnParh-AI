import React, { createContext, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

function readStoredSession() {
  try {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    return token ? { token, user } : { token: null, user: null };
  } catch {
    return { token: null, user: null };
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readStoredSession);

  const value = useMemo(() => ({
    token: session.token,
    user: session.user,
    isAuthenticated: Boolean(session.token),
    signIn(token, user) {
      try {
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        throw new Error('Unable to save your sign-in. Check your browser storage settings and try again.');
      }
      setSession({ token, user });
    },
    signOut() {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setSession({ token: null, user: null });
    },
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider.');
  return context;
}
