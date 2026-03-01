
import 'dotenv/config';

console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('NEXTAUTH_SECRET is set:', !!process.env.NEXTAUTH_SECRET);
console.log('DATABASE_URL is set:', !!process.env.DATABASE_URL);
