import { signIn } from '@/auth'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'

export default async function LoginPage() {
  const session = await auth()
  if (session) redirect('/')

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-white">
      <div className="w-full max-w-sm flex flex-col items-center gap-8">

        {/* Wordmark */}
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-[#111] leading-none">
            Yearout
          </h1>
          <p className="mt-3 text-sm text-gray-500 tracking-wide uppercase">
            Every year. Every crew. Forever.
          </p>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gray-200" />

        {/* Auth buttons */}
        <div className="w-full flex flex-col gap-3">
          <form
            action={async () => {
              'use server'
              await signIn('google', { redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-200 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>
          </form>

          <form
            action={async () => {
              'use server'
              await signIn('apple', { redirectTo: '/' })
            }}
          >
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-black text-sm font-medium text-white hover:bg-gray-900 transition-colors"
            >
              <AppleIcon />
              Continue with Apple
            </button>
          </form>
        </div>

        <p className="text-xs text-gray-400 text-center">
          By signing in you agree to our terms of service.
          <br />
          Invite only — ask your crew&apos;s Sponsor for access.
        </p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 814 1000" fill="currentColor">
      <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-42.3-150.3-109.7L111 793.5c-50.7-74.9-87.5-190.5-87.5-300.3 0-160.8 105-245.7 208.7-245.7 55.5 0 101.7 36.7 136.5 36.7 33.2 0 85.5-39.5 148.4-39.5 24.2 0 108.2 2.6 168.1 74.9zm-56.5-191C773 127.5 780.8 78.7 780.8 37.6c0-6.4-.6-13.5-1.9-19.9-48.1 1.9-104.4 32.5-138.6 73.3-29.5 35.2-55.5 87.5-55.5 140.5 0 7 1.3 14.1 1.9 16.4 3.2.6 8.4 1.3 13.5 1.3 43.5 0 98-29.5 131.9-100.3z"/>
    </svg>
  )
}
