import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { obtenerDolarClp } from '@/lib/currency'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await verifySuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const precioClp = Number(body?.precio_mensual)
  if (!body || !Number.isFinite(precioClp) || precioClp <= 0) {
    return NextResponse.json({ error: 'precio_mensual inválido' }, { status: 400 })
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
  const precioMensual = Math.round(precioClp / 10) * 10
  const precioAnual = precioMensual * 10
  const precioUsd = Math.round((precioMensual / dolarClp) * 100) / 100

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
