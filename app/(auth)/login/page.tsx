import { LoginForm } from '@/components/auth/login-form'

export const metadata = { title: 'Sign in — Kids Next Door' }

export default function LoginPage() {
  const googleEnabled = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  )
  return <LoginForm googleEnabled={googleEnabled} />
}
