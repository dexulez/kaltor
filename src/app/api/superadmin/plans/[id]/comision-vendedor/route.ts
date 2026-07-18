import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

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
  const raw = body?.comision_vendedor_monto

  // Vacío/null = sin comisión para este plan
  const monto = raw === null || raw === '' || raw === undefined ? null : Number(raw)
  if (monto !== null && (!Number.isFinite(monto) || monto < 0)) {
    return NextResponse.json({ error: 'comision_vendedor_monto inválido' }, { status: 400 })
  }

  const { id } = await params
  const admin = createServiceClient()

  const { data, error } = await admin
    .from('plans')
    .update({ comision_vendedor_monto: monto })
    .eq('id', id)
    .select('id, comision_vendedor_monto')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message ?? 'Plan no encontrado' }, { status: 404 })
  }

  return NextResponse.json({ ok: true, plan: data })
}
