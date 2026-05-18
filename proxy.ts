import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const { nextUrl } = req
  const session = req.auth

  const isLoggedIn = !!session
  const isAdminRoute = nextUrl.pathname.startsWith('/admin')
  const isLoginRoute = nextUrl.pathname === '/login'
  const isLandingRoute = nextUrl.pathname === '/'
  const isApiRoute = nextUrl.pathname.startsWith('/api')

  // Let API routes through — Auth.js handles its own
  if (isApiRoute) return NextResponse.next()

  // Redirect authenticated users away from /login
  if (isLoginRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/', nextUrl))
  }

  // Redirect unauthenticated users to /login — except for the public
  // landing page at `/`, which renders its own signed-out tree.
  if (!isLoginRoute && !isLandingRoute && !isAdminRoute && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', nextUrl))
  }

  // Admin routes: require Auth.js session, then email allowlist
  if (isAdminRoute) {
    if (!isLoggedIn) {
      return NextResponse.redirect(new URL('/login', nextUrl))
    }
    const allowed = (process.env.ADMIN_EMAILS || 'zkhowes@gmail.com')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const email = session?.user?.email?.toLowerCase()
    if (!email || !allowed.includes(email)) {
      return NextResponse.redirect(new URL('/', nextUrl))
    }
  }

  return NextResponse.next()
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|public|files).*)'],
}
