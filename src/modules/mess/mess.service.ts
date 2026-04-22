import crypto from 'crypto';
import { Mess } from './mess.model';
import { MessMember } from '../mess-member/mess-member.model';
import { AppError } from '../../shared/utils/apiError';

// Generate a short random uppercase invite code (e.g. "A3F2B1C4")
const generateInviteCode = (): string =>
  crypto.randomBytes(4).toString('hex').toUpperCase();

export const createMess = async (userId: string, payload: { name: string; address: string; settings?: any }) => {
  const inviteCode = generateInviteCode();

  const mess = await Mess.create({ ...payload, inviteCode });

  // Add the creator as the manager of the newly created mess
  await MessMember.create({
    messId: mess._id,
    userId,
    messRole: 'manager',
    status: 'active',
    joinedAt: new Date(),
  });

  return mess;
};

export const getMess = async (messId: string) => {
  const mess = await Mess.findById(messId);
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const updateMess = async (messId: string, payload: { name?: string; address?: string; settings?: any }) => {
  const mess = await Mess.findByIdAndUpdate(messId, payload, { new: true, runValidators: true });
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const regenerateInviteCode = async (messId: string) => {
  const inviteCode = generateInviteCode();
  const mess = await Mess.findByIdAndUpdate(messId, { inviteCode }, { new: true });
  if (!mess) throw new AppError(404, 'Mess not found');
  return mess;
};

export const transferOwnership = async (messId: string, currentManagerId: string, newManagerUserId: string) => {
  // Verify the target user is an active member of this mess
  const newManager = await MessMember.findOne({ messId, userId: newManagerUserId, status: 'active' });
  if (!newManager) throw new AppError(400, 'Target user is not an active member of this mess');

  // Demote the current manager to member
  await MessMember.findOneAndUpdate(
    { messId, userId: currentManagerId },
    { messRole: 'member' }
  );

  // Promote the new user to manager
  await MessMember.findOneAndUpdate(
    { messId, userId: newManagerUserId },
    { messRole: 'manager' }
  );

  return { message: 'Ownership transferred successfully' };
};
