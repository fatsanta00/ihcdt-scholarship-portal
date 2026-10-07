import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifyToken } from './lib/auth';

export async function middleware(request: NextRequest) {
  const isApiAdmin = request.nextUrl.pathname.startsWith('/api/admin');
  const isPageAdmin = request.nextUrl.pathname.startsWith('/admin') && request.nextUrl.pathname !== '/admin/login';

  // For admin APIs (like document download), we check the cookie
  if (isApiAdmin && request.nextUrl.pathname !== '/api/admin/login') {
    const token = request.cookies.get('admin_token')?.value;
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const verified = await verifyToken(token);
    if (!verified) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // For admin pages
  if (isPageAdmin) {
    const token = request.cookies.get('admin_token')?.value;
    const loginUrl = new URL('/admin/login', request.url);
    if (!token) return NextResponse.redirect(loginUrl);
    const verified = await verifyToken(token);
    if (!verified) return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
