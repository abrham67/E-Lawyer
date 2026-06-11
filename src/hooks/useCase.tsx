import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Case, Profile } from '@/types/database.types';
import { apiGet } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export function useCase() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const roleLower = String(user?.role || '').toLowerCase();

  useEffect(() => {
    const fetchCase = async () => {
      try {
        if (!id) {
          navigate('/cases');
          return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');
        let data: any = null;
        try {
          data = await apiGet(`/api/cases/${id}`, token || undefined);
        } catch (primaryErr: any) {
          const status = Number(primaryErr?.status || primaryErr?.payload?.status || 0);
          const canFallback = roleLower === 'lawyer' && (status === 403 || status === 404);
          if (!canFallback) {
            const desc = primaryErr?.message || `HTTP ${status || 'error'}`;
            toast({
              title: status === 401 ? 'Please sign in' : (status === 403 ? 'Access denied' : 'Case not available'),
              description: desc,
              variant: 'destructive',
            });
            navigate('/cases');
            return;
          }

          // Fallback for lawyers: load the case from the assigned case list and match by id.
          const list = await apiGet('/api/cases', token || undefined);
          const cases = Array.isArray((list as any)?.cases) ? (list as any).cases : (Array.isArray(list) ? list : []);
          data = cases.find((c: any) => String(c.id || c._id) === String(id));
          if (!data) {
            const desc = primaryErr?.message || `HTTP ${status || 'error'}`;
            toast({
              title: status === 401 ? 'Please sign in' : (status === 403 ? 'Access denied' : 'Case not available'),
              description: desc,
              variant: 'destructive',
            });
            navigate('/cases');
            return;
          }
        }

        if (!data) {
          toast({
            title: "Case not found",
            description: "The requested case could not be found",
            variant: "destructive",
          });
          navigate('/cases');
          return;
        }

        // Helper function to safely process profile data
        const processProfile = (profileData: any): Profile | undefined => {
          if (!profileData) return undefined;
          if (typeof profileData !== 'object') return undefined;
          if ('error' in profileData) return undefined;
          return profileData as Profile;
        };

        // Transform the data to ensure it matches the Case type
        const transformedCase: Case = {
          id: data.id || data._id,
          title: data.title,
          description: data.description || '',
          // Cast the status to the specific type or default to 'pending' if invalid
          status: (data.status === 'active' || data.status === 'closed' || data.status === 'pending') 
            ? data.status 
            : 'pending',
          lawyer_id: data.lawyer_id || data.lawyerId || '',
          client_id: data.client_id || data.clientId || '',
          case_type: data.case_type,
          practice_area: data.practice_area,
          created_at: data.created_at || data.createdAt,
          updated_at: data.updated_at || data.updatedAt,
          // Use the helper function to safely process lawyer and client data
          lawyer: processProfile(data.lawyer),
          client: processProfile(data.client)
        };

        setCaseData(transformedCase);
      } catch (error: any) {
        console.error('Error fetching case:', error);
        toast({
          title: "Error loading case",
          description: error.message,
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchCase();
  }, [id, navigate, toast, roleLower]);

  return { caseData, loading };
}
