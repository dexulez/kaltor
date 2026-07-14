import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import LandingPage from '@/components/landing/LandingPage'
import { conversionParaPlan, obtenerConversion, type ConversionInfo } from '@/lib/currency'
import { detectarIdioma, esLangValido } from '@/lib/i18n/landing'
import { createServiceClient } from '@/lib/supabase/server'

type PlanRow = {
  slug: string
  precio_mensual: number
  precio_anual: number
  precio_mensual_usd: number
  precios_pais: Record<string, number> | null
}

async function cargarPrecios(): Promise<PlanRow[]> {
  const admin = createServiceClient()
  const { data: plans } = await admin
    .from('plans')
    .select('slug, precio_mensual, precio_anual, precio_mensual_usd, precios_pais')
  return plans ?? []
}

export default async function Home() {
  const headersList = await headers()
  const host = headersList.get('host') ?? ''
  // app.kaltorpos.com, localhost y *.vercel.app → dashboard (app)
  const isApp = host.startsWith('app.') || host.includes('localhost') || host.endsWith('.vercel.app')
  if (isApp) redirect('/dashboard')

  const countryCode = headersList.get('x-vercel-ip-country')
  const conversion = await obtenerConversion(countryCode)
  const planRows = await cargarPrecios()

  const precios: Record<string, { mensual: number; anual: number }> = {}
  const conversionPorPlan: Record<string, ConversionInfo | null> = {}
  for (const p of planRows) {
    precios[p.slug] = { mensual: p.precio_mensual, anual: p.precio_anual }
    conversionPorPlan[p.slug] = conversionParaPlan(countryCode, {
      precio_mensual: p.precio_mensual,
      precio_mensual_usd: p.precio_mensual_usd,
      precios_pais: p.precios_pais ?? {},
    })
  }

  const cookieStore = await cookies()
  const langCookie = cookieStore.get('kaltor_lang')?.value
  const lang = esLangValido(langCookie) ? langCookie : detectarIdioma(countryCode)

  return <LandingPage conversion={conversion} lang={lang} precios={precios} conversionPorPlan={conversionPorPlan} />
}
