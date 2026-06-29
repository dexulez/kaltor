import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  let body: {
    nombreTaller?: string; rut?: string; contactoNombre?: string
    email?: string; telefono?: string; mensaje?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const nombreTaller = (body.nombreTaller ?? '').trim()
  const email = (body.email ?? '').trim()
  const telefono = (body.telefono ?? '').trim()
  if (!nombreTaller || !email || !telefono) {
    return NextResponse.json({ error: 'Nombre del negocio, email y teléfono son obligatorios' }, { status: 400 })
  }

  const admin = createServiceClient()

  const { data: solicitud, error } = await admin.from('b2b_access_requests').insert({
    nombre_taller: nombreTaller,
    rut: body.rut?.trim() || null,
    contacto_nombre: body.contactoNombre?.trim() || null,
    email,
    telefono,
    mensaje: body.mensaje?.trim() || null,
  }).select('id').single()

  if (error || !solicitud) {
    return NextResponse.json({ error: 'Error al registrar la solicitud: ' + error?.message }, { status: 500 })
  }

  await admin.from('notifications').insert({
    tipo: 'solicitud_b2b',
    titulo: `Nueva solicitud de acceso B2B: ${nombreTaller}`,
    mensaje: `${body.contactoNombre ? body.contactoNombre + ' · ' : ''}${email} · ${telefono}`,
    url: '/usuarios',
    leida: false,
  })

  return NextResponse.json({ ok: true })
}
