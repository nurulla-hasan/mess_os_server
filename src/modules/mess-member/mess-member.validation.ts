import { z } from 'zod';

const emptyToUndefined = (value: unknown) => value === '' ? undefined : value;

export const requestJoinSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(1, 'Invite code is required'),
  }),
});

export const getMembersSchema = z.object({
  query: z.object({
    page: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    limit: z.preprocess(emptyToUndefined, z.string().regex(/^\d+$/).optional()),
    status: z.preprocess(emptyToUndefined, z.enum(['pending', 'active', 'rejected', 'removed']).optional()),
    searchTerm: z.preprocess(emptyToUndefined, z.string().trim().max(100).optional()),
  }).strict(),
});

export const updatePendingMemberStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'rejected']),
  }).strict(),
});
