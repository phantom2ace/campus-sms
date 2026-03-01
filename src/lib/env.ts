import 'dotenv/config';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing in environment variables');
  process.exit(1);
}
