import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const oId = z.string().refine(isValidObjectId, { message: 'Invalid ObjectId format' });

export const createPaymentSchema = z.object({
  body: z.object({
    messMemberId: oId,
    amount: z.number().positive(),
    method: z.string().min(1),
    reference: z.string().optional()
  }).strict()
});

// Approvals only need params validation realistically.
export const updatePaymentStatusSchema = z.object({
  params: z.object({ paymentId: oId }).strict()
});
