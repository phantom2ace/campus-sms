// src/lib/auth.ts

import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import prisma from './prisma';

const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        console.log('Authorize called with email:', credentials?.email);
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email and password are required');
        }

        const email = credentials.email.toLowerCase().trim();

        try {
          console.log('Querying database for user...');
          const user = await prisma.user.findUnique({
            where: { email },
            include: { ministry: true },
          });

          if (!user) {
            console.log(`Login failed: No user found for email "${email}"`);
            throw new Error('No account found with this email');
          }

          console.log('User found, comparing password...');
          const isValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isValid) {
            console.log('Invalid password for user:', email);
            throw new Error('Invalid password');
          }

          console.log('Login successful for user:', email);
          return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            ministryId: user.ministryId,
            ministryName: user.ministry?.name || null,
          };
        } catch (error) {
          console.error('Database error during authorize:', error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as {
          role?: Role;
          ministryId?: string | null;
          ministryName?: string | null;
        };
        if (u.role) {
          token.role = u.role;
        }
        token.ministryId = u.ministryId ?? null;
        token.ministryName = u.ministryName ?? null;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const s = session.user as {
          id?: string;
          role?: string;
          ministryId?: string | null;
          ministryName?: string | null;
        };
        s.id = token.sub as string | undefined;
        s.role = token.role as string | undefined;
        s.ministryId = token.ministryId as string | null | undefined;
        s.ministryName = token.ministryName as string | null | undefined;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: process.env.NODE_ENV === 'development',
};

export default authOptions;
export { authOptions };
