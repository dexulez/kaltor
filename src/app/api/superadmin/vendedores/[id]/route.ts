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
  if (!body) return NextResponse.json({ error: 'Body inválido' }, { status: 400 })

  const { action } = body
  const admin = createServiceClient()
  const { id: vendedorId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: vendedor, error: vendedorErr } = await admin
    .from('vendedores_externos')
    .select('id, estado')
    .eq('id', vendedorId)
    .single()

  if (vendedorErr || !vendedor) {
    return NextResponse.json({ error: 'Vendedor no encontrado' }, { status: 404 })
  }

  try {
    switch (action) {
      case 'aprobar': {
        const { error } = await admin.from('vendedores_externos').update({
          estado: 'activo',
          aprobado_at: new Date().toISOString(),
          aprobado_por: user?.email ?? null,
        }).eq('id', vendedorId)
        if (error) throw error
        break
      }

      case 'rechazar': {
        const { error } = await admin.from('vendedores_externos').update({ estado: 'rechazado' }).eq('id', vendedorId)
        if (error) throw error
        break
      }

      case 'suspender': {
        const { error } = await admin.from('vendedores_externos').update({ estado: 'suspendido' }).eq('id', vendedorId)
        if (error) throw error
        break
      }

      case 'reactivar': {
        const { error } = await admin.from('vendedores_externos').update({ estado: 'activo' }).eq('id', vendedorId)
        if (error) throw error
        break
      }

      case 'marcar_comision_pagada': {
        const comisionId = body.comision_id as string | undefined
        if (!comisionId) return NextResponse.json({ error: 'comision_id requerido' }, { status: 400 })
        const { error } = await admin.from('comisiones_vendedor').update({
          estado: 'pagada',
          pagada_at: new Date().toISOString(),
          pagada_por: user?.email ?? null,
        }).eq('id', comisionId).eq('vendedor_id', vendedorId)
        if (error) throw error
        break
      }

      case 'marcar_todas_pagadas': {
        const { error } = await admin.from('comisiones_vendedor').update({
          estado: 'pagada',
          pagada_at: new Date().toISOString(),
          pagada_por: user?.email ?? null,
        }).eq('vendedor_id', vendedorId).eq('estado', 'pendiente')
        if (error) throw error
        break
      }

      default:
        return NextResponse.json({ error: `Acción desconocida: ${action}` }, { status: 400 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
