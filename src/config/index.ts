import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  env: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:3000',
  apiBaseUrl: process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 5000}`,
  db: {
    uri: process.env.MONGODB_URI || process.env.DATABASE_URL || 'mongodb://localhost:27017/mess_os_local',
  },
  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET || (() => { throw new Error('JWT_ACCESS_SECRET is not defined'); })(),
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '1h',
    refreshSecret: process.env.JWT_REFRESH_SECRET || (() => { throw new Error('JWT_REFRESH_SECRET is not defined'); })(),
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  smtp: {
    user: process.env.SMTP_USER || (() => { throw new Error('SMTP_USER is not defined'); })(),
    pass: process.env.SMTP_PASS || (() => { throw new Error('SMTP_PASS is not defined'); })(),
    from: process.env.SMTP_FROM || 'noreply@messmanager.com'
  },
  sslcommerz: {
    storeId: process.env.SSLCOMMERZ_STORE_ID || '',
    storePassword: process.env.SSLCOMMERZ_STORE_PASSWORD || '',
    isSandbox: process.env.SSLCOMMERZ_IS_SANDBOX !== 'false',
    transactionPrefix: process.env.SSLCOMMERZ_TRANSACTION_PREFIX || 'MOS'
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'bynara',
    apiKey: process.env.AI_API_KEY || '',
    baseUrl: process.env.AI_BASE_URL || 'https://router.bynara.id/v1',
    model: process.env.AI_MODEL || 'mistral-large',
    maxTokens: Number(process.env.AI_MAX_TOKENS || 2000)
  }
};
