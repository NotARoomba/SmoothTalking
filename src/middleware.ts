import { NextResponse, NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
    const token = request.cookies.get('authToken')?.value;
    if (token && request.nextUrl.pathname !== '/profile') {
        return NextResponse.redirect(new URL('/profile', request.url))
    } else if (!token && request.nextUrl.pathname === '/profile') {
        return NextResponse.redirect(new URL('/auth', request.url))
    }
  return NextResponse.next()
}
 
export const config = {
  matcher: ['/auth', '/reset-password', '/profile'],
}