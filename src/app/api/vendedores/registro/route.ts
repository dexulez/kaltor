import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

function generarCodigoBase(nombre: string): string {
  return nombre
    .normalize('NFD').replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 20) || 'vendedor'
}

export async function POST(req: NextRequest) {
  let body: {
    nombre: string
    email: string
    password: string
    telefono?: string
    rut?: string
    banco?: string
    tipo_cuenta?: string
    numero_cuenta?: string
    titular_cuenta?: string
  }

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { nombre, email, password, telefono, rut, banco, tipo_cuenta, numero_cuenta, titular_cuenta } = body

  if (!nombre?.trim() || !email?.trim() || !password) {
    return NextResponse.json({ error: 'Nombre, correo y contraseña son obligatorios' }, { status: 400 })
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: authData, error: authErr } = await admin.auth.admin.createUser({
    email: email.toLowerCase().trim(),
    password,
    email_confirm: true,
  })

  if (authErr || !authData.user) {
    const msg = authErr?.message ?? ''
    if (msg.includes('already registered') || msg.includes('already been registered')) {
      return NextResponse.json({ error: 'Ya existe una cuenta con ese correo' }, { status: 409 })
    }
    return NextResponse.json({ error: msg || 'Error al crear el usuario' }, { status: 500 })
  }

  const userId = authData.user.id

  // Generar un código único: base + sufijo aleatorio si hay colisión
  const base = generarCodigoBase(nombre)
  let codigo = base
  for (let intento = 0; intento < 5; intento++) {
    const { data: existente } = await admin
      .from('vendedores_externos').select('id').eq('codigo', codigo).maybeSingle()
    if (!existente) break
    codigo = `${base}-${Math.random().toString(36).slice(2, 6)}`
  }

  const { error: vendedorErr } = await admin.from('vendedores_externos').insert({
    user_id:        userId,
    codigo,
    nombre:         nombre.trim(),
    email:          email.toLowerCase().trim(),
    telefono:       telefono?.trim() || null,
    rut:            rut?.trim() || null,
    banco:          banco?.trim() || null,
    tipo_cuenta:    tipo_cuenta?.trim() || null,
    numero_cuenta:  numero_cuenta?.trim() || null,
    titular_cuenta: titular_cuenta?.trim() || null,
    estado:         'pendiente',
  })

  if (vendedorErr) {
    await admin.auth.admin.deleteUser(userId)
    return NextResponse.json({ error: 'Error al registrar vendedor: ' + vendedorErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
