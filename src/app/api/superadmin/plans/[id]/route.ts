import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { convertirDesdeUsd, obtenerDolarClp } from '@/lib/currency'

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
  const precioUsdInput = Number(body?.precio_mensual_usd)
  if (!body || !Number.isFinite(precioClp) || precioClp <= 0 || !Number.isFinite(precioUsdInput) || precioUsdInput <= 0) {
    return NextResponse.json({ error: 'precio_mensual y precio_mensual_usd son requeridos y deben ser mayores a 0' }, { status: 400 })
  }

  const { id } = await params
  const admin = createServiceClient()

  const { data: planActual } = await admin
    .from('plans')
    .select('precio_mensual_usd')
    .eq('id', id)
    .single()

  // Redondea CLP a la decena más cercana y mantiene el patrón anual = mensual × 10 (2 meses gratis)
  const precioMensual = Math.round(precioClp / 10) * 10
  const precioAnual = precioMensual * 10
  const precioUsd = Math.round(precioUsdInput * 100) / 100

  const update: Record<string, unknown> = {
    precio_mensual_usd: precioUsd,
    precio_mensual:      precioMensual,
    precio_anual:        precioAnual,
  }

  // Si el USD cambió, se recalculan desde cero todos los precios manuales por país
  if (planActual && Number(planActual.precio_mensual_usd) !== precioUsd) {
    update.precios_pais = await convertirDesdeUsd(precioUsd)
  }

  const { data, error } = await admin
    .from('plans')
    .update(update)
    .eq('id', id)
    .select('id, nombre, slug, precio_mensual, precio_anual, precio_mensual_usd, precios_pais')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Plan no encontrado' }, { status: 404 })
  }

  const dolarClp = await obtenerDolarClp()
  return NextResponse.json({ ok: true, plan: data, tipoCambio: dolarClp })
}
