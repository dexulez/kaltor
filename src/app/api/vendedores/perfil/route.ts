import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { nombre, telefono, rut, banco, tipo_cuenta, numero_cuenta, titular_cuenta } = body
  if (!nombre?.trim()) {
    return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })
  }

  const admin = createServiceClient()
  const { error } = await admin
    .from('vendedores_externos')
    .update({
      nombre: nombre.trim(),
      telefono: telefono?.trim() || null,
      rut: rut?.trim() || null,
      banco: banco?.trim() || null,
      tipo_cuenta: tipo_cuenta?.trim() || null,
      numero_cuenta: numero_cuenta?.trim() || null,
      titular_cuenta: titular_cuenta?.trim() || null,
    })
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
