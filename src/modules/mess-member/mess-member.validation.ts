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

export const updateMemberParticipationSchema = z.object({
  body: z.object({
    participation: z.object({
      meals: z.boolean().optional(),
      sharedExpenses: z.boolean().optional(),
    }).strict().refine(
      (value) => value.meals !== undefined || value.sharedExpenses !== undefined,
      'At least one participation flag is required'
    ),
  }).strict(),
});

export type UpdateMemberParticipationPayload = z.infer<typeof updateMemberParticipationSchema>['body'];

export const acceptResidentToggleSchema = z.object({
  body: z.object({
    requestId: z.string().min(1, 'Request ID is required'),
  }).strict(),
});
