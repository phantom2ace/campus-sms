import 'dotenv/config';

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.RENDER;

if (!process.env.DATABASE_URL && !isBuildTime) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('DATABASE_URL is missing in environment variables. Build may fail if DB access is required.');
  }
}

if (!process.env.NEXTAUTH_URL && !isBuildTime) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('NEXTAUTH_URL is missing in environment variables. Login might fail or loop in production.');
  }
}

if (!process.env.NEXTAUTH_SECRET && !isBuildTime) {
  if (process.env.NODE_ENV === 'production') {
    console.warn('NEXTAUTH_SECRET is missing in environment variables. Login will fail in production.');
  }
}
