import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'
import { obtenerConversion } from '@/lib/currency'
import { detectarIdioma, esLangValido } from '@/lib/i18n/landing'
import { createServiceClient } from '@/lib/supabase/server'

async function cargarPrecios(): Promise<Record<string, { mensual: number; anual: number }>> {
  const admin = createServiceClient()
  const { data: plans } = await admin.from('plans').select('slug, precio_mensual, precio_anual')
  const precios: Record<string, { mensual: number; anual: number }> = {}
  for (const p of plans ?? []) {
    precios[p.slug] = { mensual: p.precio_mensual, anual: p.precio_anual }
  }
  return precios
}

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  // app.kaltorpos.com, localhost y *.vercel.app → dashboard (app)
  const isApp = host.startsWith('app.') || host.includes('localhost') || host.endsWith('.vercel.app')
  if (isApp) redirect('/dashboard')

  const countryCode = headersList.get('x-vercel-ip-country')
  const conversion = await obtenerConversion(countryCode)
  const precios = await cargarPrecios()

  const cookieStore = await cookies()
  const langCookie = cookieStore.get('kaltor_lang')?.value
  const lang = esLangValido(langCookie) ? langCookie : detectarIdioma(countryCode)

  return <LandingPage conversion={conversion} lang={lang} precios={precios} />
}
