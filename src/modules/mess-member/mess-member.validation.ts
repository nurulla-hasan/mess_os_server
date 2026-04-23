import { z } from 'zod';

export const requestJoinSchema = z.object({
  body: z.object({
    inviteCode: z.string().min(1, 'Invite code is required'),
  }),
});

export const updateRoleSchema = z.object({
  body: z.object({
    messRole: z.enum(['manager', 'member']),
  }),
});
