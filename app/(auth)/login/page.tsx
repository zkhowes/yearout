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
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-gray-900 bg-black text-sm font-medium text-white hover:bg-gray-900 transition-colors shadow-sm"
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

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M15.096 14.318c-.354.816-.524 1.18-.98 1.9-.636.999-1.533 2.245-2.643 2.255-1.1.012-1.383-.717-2.876-.708-1.493.009-1.803.722-2.903.71-1.11-.01-1.96-1.137-2.596-2.136C1.42 13.558.783 10.135 2.53 7.87c.62-.803 1.722-1.352 2.9-1.366 1.094-.018 2.126.756 2.794.756.668 0 1.92-.935 3.236-.798.55.023 2.097.222 3.089 1.677-.08.05-1.844 1.078-1.823 3.216.024 2.557 2.243 3.408 2.27 3.418-.02.061-.355 1.222-.9 2.424v.001Zm-4.843-13.2c.492-.597.866-1.44.728-2.302-.8.053-1.737.534-2.287 1.162-.5.573-.914 1.43-.754 2.248.873.027 1.776-.47 2.313-1.108Z" fill="white"/>
    </svg>
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
