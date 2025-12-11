import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Case, Profile } from '@/types/database.types';

export function useCase() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [caseData, setCaseData] = useState<Case | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const fetchCase = async () => {
      try {
        if (!id) {
          navigate('/cases');
          return;
        }

        setLoading(true);
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/cases/${id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
        if (!response.ok) {
          const msg = await response.text();
          const status = response.status;
          const desc = msg || `${status} ${response.statusText}`;
          toast({
            title: status === 401 ? 'Please sign in' : (status === 403 ? 'Access denied' : 'Case not available'),
            description: desc,
            variant: 'destructive',
          });
          navigate('/cases');
          return;
        }
        const data = await response.json();

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
  }, [id, navigate, toast]);

  return { caseData, loading };
}
