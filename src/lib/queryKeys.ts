export const queryKeys = {
  me: ['me'] as const,
  user: (id: string | null | undefined) => ['user', id] as const,
  profile: (id: string | null | undefined) => ['profile', id] as const,
  cases: (scope?: string | null) => ['cases', scope] as const,
  documents: ['documents'] as const,
  messages: ['messages'] as const,
};
