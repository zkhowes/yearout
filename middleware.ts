import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth

  const isLoggedIn = !!session
  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isAdminLogin = nextUrl.pathname === '/admin/login'
  const isLoginRoute = nextUrl.pathname === '/login'
  const isApiRoute = nextUrl.pathname.startsWith('/api')

  // Let API routes through — Auth.js handles its own
  if (isApiRoute) return NextResponse.next()

  // Redirect authenticated users away from /login
  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  // Redirect unauthenticated users to /login
  if (!isLoginRoute && !isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Admin routes: require Auth.js session first
  if (isAdminRoute && !isAdminLogin && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Admin routes: require second-factor cookie
  if (isAdminRoute && !isAdminLogin) {
    const adminSession = req.cookies.get('admin_session')
    if (!adminSession || adminSession.value !== 'granted') {
      return NextResponse.redirect(new URL('/admin/login', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|files).*)'],
}
