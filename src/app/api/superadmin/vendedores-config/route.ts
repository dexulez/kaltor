import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
}

export async function PATCH(req: NextRequest) {
  if (!(await verifySuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const body = await req.json().catch(() => null)
  const tope = Number(body?.tope_descuento_pct)
  if (!Number.isFinite(tope) || tope < 0 || tope > 100) {
    return NextResponse.json({ error: 'tope_descuento_pct inválido (0-100)' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { error } = await admin
    .from('config_vendedores')
    .update({ tope_descuento_pct: tope })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
