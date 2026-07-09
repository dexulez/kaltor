import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'
import { obtenerConversion } from '@/lib/currency'

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  // app.kaltorpos.com, localhost y *.vercel.app → dashboard (app)
  const isApp = host.startsWith('app.') || host.includes('localhost') || host.endsWith('.vercel.app')
  if (isApp) redirect('/dashboard')

  const countryCode = headersList.get('x-vercel-ip-country')
  const conversion = await obtenerConversion(countryCode)

  return <LandingPage conversion={conversion} />
}
