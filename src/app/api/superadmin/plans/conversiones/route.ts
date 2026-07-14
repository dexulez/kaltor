import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { previsualizarPrecios } from '@/lib/currency'

const SUPER_ADMIN_EMAIL = process.env.KALTOR_SUPER_ADMIN_EMAIL

async function verifySuperAdmin(): Promise<boolean> {
  if (!SUPER_ADMIN_EMAIL) return false
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return !!user && user.email === SUPER_ADMIN_EMAIL
}

export async function GET(req: NextRequest) {
  if (!(await verifySuperAdmin())) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
  }

  const precioClp = Number(req.nextUrl.searchParams.get('clp'))
  if (!Number.isFinite(precioClp) || precioClp <= 0) {
    return NextResponse.json({ error: 'Parámetro clp inválido' }, { status: 400 })
  }

  const precios = await previsualizarPrecios(precioClp)
  if (precios.length === 0) {
    return NextResponse.json({ error: 'No se pudo obtener el tipo de cambio. Intenta nuevamente.' }, { status: 502 })
  }

  return NextResponse.json({ precios })
}
