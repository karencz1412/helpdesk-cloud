import dotenv from 'dotenv';
dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 4000),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://helpdesk_user:helpdesk_password@localhost:5432/helpdesk',
  jwtSecret: process.env.JWT_SECRET || 'dev_secret_change_me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '8h',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  uploadDir: process.env.UPLOAD_DIR || 'uploads'
};
