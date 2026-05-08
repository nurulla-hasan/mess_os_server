import { z } from 'zod';

export const requestJoinSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(1, 'Invite code is required'),
  }),
});

export const getMembersSchema = z.object({
  query: z.object({
    status: z.enum(['pending', 'active', 'rejected', 'removed']).optional(),
    searchTerm: z.string().trim().max(100).optional(),
  }).strict(),
});

export const updateRoleSchema = z.object({
  body: z.object({
    messRole: z.enum(['manager', 'member']),
  }),
});
