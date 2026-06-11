import { useCallback } from 'react';
import { useAuth } from './useAuth';
import { getApiErrorMessage, safeParseApiResponse } from '@/lib/apiError';

export function useApiClient() {
  const { signOut } = useAuth();

  const authedFetch = useCallback(async (input: string, init?: RequestInit & { skipAuth?: boolean }) => {
    const token = init?.headers && typeof (init.headers as any).Authorization === 'string'
      ? undefined
      : localStorage.getItem('token') || undefined;

    const headers = {
      ...(init?.headers ?? {}),
      ...(token && !init?.skipAuth ? { Authorization: `Bearer ${token}` } : {}),
    } as Record<string, string>;

    const res = await fetch(input, { ...init, headers });
    const text = await res.text();
    const parsed = safeParseApiResponse(text);

    if (res.status === 401 || res.status === 403) {
      await signOut();
      const err: any = new Error('Unauthorized');
      err.status = res.status;
      err.payload = parsed;
      throw err;
    }
    if (!res.ok) {
      const message = typeof parsed === 'string'
        ? parsed
        : getApiErrorMessage(parsed, 'Request failed');
      const err: any = new Error(message);
      err.status = res.status;
      err.payload = parsed;
      throw err;
    }

    return parsed;
  }, [signOut]);

  return { authedFetch };
}
