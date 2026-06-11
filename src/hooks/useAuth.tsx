/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  id: string;
  email: string;
  role: string;
  [key: string]: any;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user profile from backend using HTTP-only cookies
  // Cookies are automatically sent with credentials: 'include'
  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/me', {
        credentials: 'include', // Include cookies in request
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        const u = data?.user || null;
        // Normalize Mongo document to have `id` and ensure role casing
        const normalized = u
          ? {
              id: u.id || u._id || u.user_id || null,
              email: u.email,
              role: u.role,
              ...u,
            }
          : null;
        setUser(normalized);
      } else if (response.status === 401) {
        // Unauthorized - no valid session
        setUser(null);
      } else {
        // Try fallback endpoint for lighter session check
        const fallback = await fetch('/api/auth/me/session', {
          credentials: 'include'
        }).catch(() => null);

        if (fallback && fallback.ok) {
          const d = await fallback.json();
          const u = d?.user || null;
          setUser(u ? {
            id: u.id || u._id || null,
            email: u.email,
            role: u.role,
            ...u
          } : null);
        } else {
          setUser(null);
        }
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const signOut = async () => {
    try {
      // Call logout endpoint to clear server-side session
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      }).catch(() => null); // Ignore errors, proceed with local cleanup
    } finally {
      setUser(null);
      navigate('/auth');
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}