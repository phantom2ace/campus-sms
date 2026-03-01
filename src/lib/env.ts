import 'dotenv/config';

const isBuildTime = process.env.NODE_ENV === 'production' && !process.env.RENDER;

if (!process.env.DATABASE_URL && !isBuildTime) {
  // Only exit if we are NOT in a build environment where DB might not be connected yet
  if (process.env.NODE_ENV === 'production') {
    console.warn('DATABASE_URL is missing in environment variables. Build may fail if DB access is required.');
  }
}
