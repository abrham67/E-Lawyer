import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: any; // Replace with your user type
  session: any; // Replace with your session type
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null); // Replace with your user type
  const [session, setSession] = useState<any>(null); // Replace with your session type
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Fetch user profile from backend using JWT
  const fetchUserProfile = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const response = await fetch('/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        const u = data?.user || null;
        // Normalize Mongo document to have `id` and ensure role casing
        const normalized = u
          ? {
              id: u.id || u._id || u.user_id || null,
              role: u.role,
              ...u,
            }
          : null;
        setUser(normalized);
      } else {
        // Fallback to a lighter session check endpoint that never 500s
        const fallback = await fetch('/api/auth/me/session', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }).catch(() => null);
        if (fallback && fallback.ok) {
          const d = await fallback.json();
          const u = d?.user || null;
          setUser(u ? { id: u.id || u._id || null, role: u.role, ...u } : null);
        } else {
          setUser(null);
        }
      }
    } catch {
      setUser(null);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUserProfile();
    // ...existing code...
    return () => { };
  }, [navigate]);

  const signOut = async () => {
    localStorage.removeItem('token');
    setUser(null);
    navigate('/auth');
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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