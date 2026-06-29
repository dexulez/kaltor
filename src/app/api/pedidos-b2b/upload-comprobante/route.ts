import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'comprobantes-pago'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const pedidoId = formData.get('pedido_id') as string
  if (!pedidoId) return NextResponse.json({ error: 'pedido_id requerido' }, { status: 400 })

  const archivos = formData.getAll('archivos') as File[]
  if (!archivos.length) return NextResponse.json({ error: 'Sin archivos' }, { status: 400 })

  const admin = createServiceClient()
  const urls: string[] = []
  const errores: string[] = []

  for (const file of archivos) {
    if (!file.size) continue
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `b2b-${pedidoId}/${safeName}`

    const bytes = await file.arrayBuffer()
    const { error } = await admin.storage.from(BUCKET).upload(path, bytes, { contentType: file.type, upsert: false })
    if (error) {
      errores.push(`${file.name}: ${error.message}`)
      continue
    }
    const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
    urls.push(publicUrl)
  }

  if (urls.length === 0) {
    return NextResponse.json(
      { error: errores.length ? errores.join(', ') : 'No se pudo subir ningún archivo' },
      { status: 500 }
    )
  }

  const { data: pedido } = await admin.from('sales_orders').select('comprobante_pago_urls').eq('id', pedidoId).single()
  const existing = (pedido?.comprobante_pago_urls as string[] | null) ?? []
  await admin.from('sales_orders').update({ comprobante_pago_urls: [...existing, ...urls] }).eq('id', pedidoId)

  return NextResponse.json({ ok: true, urls, errores })
}
