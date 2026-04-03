import { User } from '../user/user.model';
import { AppError } from '../../shared/utils/apiError';
import bcrypt from 'bcrypt';
import * as jsonwebtoken from 'jsonwebtoken';
import { config } from '../../config';

export const registerUser = async (payload: any) => {
  const existing = await User.findOne({ email: payload.email });
  if (existing) throw new AppError(400, 'Email already formally tied to system');
  
  const passwordHash = await bcrypt.hash(payload.password, 10);
  const user = await User.create({ ...payload, passwordHash });
  
  return user;
};

export const loginUser = async (payload: any) => {
  const user = await User.findOne({ email: payload.email }).select('+passwordHash');
  if (!user || user.status === 'blocked') throw new AppError(401, 'Credentials completely unverified or structurally blocked');
  
  const isMatch = await bcrypt.compare(payload.password, user.passwordHash);
  if (!isMatch) throw new AppError(401, 'Credentials completely unverified');

  const accessToken = jsonwebtoken.sign(
    { userId: user._id, globalRole: user.globalRole }, 
    config.jwt.accessSecret, 
    { expiresIn: config.jwt.accessEpiresIn }
  );

  const refreshToken = jsonwebtoken.sign(
    { userId: user._id, globalRole: user.globalRole }, 
    config.jwt.refreshSecret, 
    { expiresIn: config.jwt.refreshExpiresIn }
  );

  return { user, accessToken, refreshToken };
};
