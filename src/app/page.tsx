import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (!session || !session.user) {
    redirect('/login');
  }

  const user = session.user as {
    role?: 'ADMIN' | 'MINISTRY_HEAD';
  };

  if (user.role === 'ADMIN') {
    redirect('/admin/dashboard');
  }

  if (user.role === 'MINISTRY_HEAD') {
    redirect('/ministry/dashboard');
  }

  // Fallback if role is not recognized or missing
  redirect('/unauthorized');
}
