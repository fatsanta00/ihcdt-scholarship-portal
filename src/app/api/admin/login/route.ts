import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { password } = await req.json();
    
    // In a real app you might check against a db user, here we use an env var
    const validPassword = process.env.ADMIN_PASSWORD || 'admin123';
    
    if (password === validPassword) {
      const token = await signToken({ role: 'admin' });
      
      const cookieStore = await cookies();
      cookieStore.set('admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
      });
      
      return NextResponse.json({ success: true });
    }
    
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  } catch (error) {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
