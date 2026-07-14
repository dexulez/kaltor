import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { obtenerDolarClp } from '@/lib/currency'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
}

export async function GET() {
  if (!(await verifySuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const dolarClp = await obtenerDolarClp()
  if (!dolarClp) {
    return NextResponse.json({ error: 'No se pudo obtener el tipo de cambio' }, { status: 502 })
  }

  return NextResponse.json({ dolarClp })
}
