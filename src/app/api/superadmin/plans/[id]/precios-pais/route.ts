import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { PAIS_MONEDA } from '@/lib/currency'

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
  const precios = body?.precios_pais
  if (!precios || typeof precios !== 'object' || Array.isArray(precios)) {
    return NextResponse.json({ error: 'precios_pais inválido' }, { status: 400 })
  }

  const limpio: Record<string, number> = {}
  for (const [pais, valor] of Object.entries(precios)) {
    if (!PAIS_MONEDA[pais]) continue
    const num = Number(valor)
    if (!Number.isFinite(num) || num <= 0) continue
    limpio[pais] = Math.round(num * 100) / 100
  }

  const { id } = await params
  const admin = createServiceClient()

  const { data, error } = await admin
    .from('plans')
    .update({ precios_pais: limpio })
    .eq('id', id)
    .select('id, nombre, slug, precios_pais')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Plan no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, plan: data })
}
