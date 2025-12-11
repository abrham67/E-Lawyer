import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: Array<'lawyer' | 'client' | 'court' | 'admin'>;
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // Role-based protection
  if (allowedRoles) {
    // Get user role from primary field with fallback to metadata
    const userRole = String(user?.role || user?.user_metadata?.role || '').toLowerCase() as any;
    const normalizedAllowed = allowedRoles.map(r => String(r).toLowerCase()) as any;
    if (!normalizedAllowed.includes(userRole)) {
      navigate('/'); // Or show a forbidden page
      return null;
    }
  }

  return <>{children}</>;
}