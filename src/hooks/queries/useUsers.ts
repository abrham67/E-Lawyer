import { useQuery } from '@tanstack/react-query';
import { useApiClient } from '../useApiClient';
import { queryKeys } from '@/lib/queryKeys';
import { User } from '@/types/api';

export function useMeQuery(enabled: boolean = true) {
  const { authedFetch } = useApiClient();
  return useQuery<User | null>({
    queryKey: queryKeys.me,
    queryFn: async () => {
      const data = await authedFetch('/api/auth/me');
      const user = (data as any)?.user || null;
      if (!user) return null;
      const id = user.id || user._id || user.user_id || user.sub || null;
      return id ? { id: String(id), ...user } : null;
    },
    enabled,
  });
}

export function useUserQuery(id?: string | null) {
  const { authedFetch } = useApiClient();
  return useQuery<User | null>({
    queryKey: queryKeys.user(id || ''),
    queryFn: async () => {
      if (!id) return null;
      const data = await authedFetch(`/api/users/${id}`);
      if (!data) return null;
      const uid = (data as any).id || (data as any)._id || id;
      return { id: String(uid), ...(data as any) } as User;
    },
    enabled: !!id,
  });
}
