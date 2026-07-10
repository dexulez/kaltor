import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
}

async function obtenerDolarClp(): Promise<number | null> {
  try {
    const res = await fetch('https://mindicador.cl/api', { cache: 'no-store' })
    if (!res.ok) return null
    const data = await res.json()
    const valor = data?.dolar?.valor
    return typeof valor === 'number' ? valor : null
  } catch {
    return null
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const precioUsd = Number(body?.precio_mensual_usd)
  if (!body || !Number.isFinite(precioUsd) || precioUsd <= 0) {
    return NextResponse.json({ error: 'precio_mensual_usd inválido' }, { status: 400 })
  }

  const dolarClp = await obtenerDolarClp()
  if (!dolarClp) {
    return NextResponse.json(
      { error: 'No se pudo obtener el tipo de cambio (mindicador.cl). Intenta nuevamente.' },
      { status: 502 }
    )
  }

  const { id } = await params
  const admin = createServiceClient()

  // Redondea a la decena más cercana y mantiene el patrón anual = mensual × 10 (2 meses gratis)
  const precioMensual = Math.round((precioUsd * dolarClp) / 10) * 10
  const precioAnual = precioMensual * 10

  const { data, error } = await admin
    .from('plans')
    .update({
      precio_mensual_usd: precioUsd,
      precio_mensual:      precioMensual,
      precio_anual:        precioAnual,
    })
    .eq('id', id)
    .select('id, nombre, slug, precio_mensual, precio_anual, precio_mensual_usd')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Plan no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, plan: data, tipoCambio: dolarClp })
}
