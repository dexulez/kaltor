import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'comprobantes-pago'

async function ensureBucket() {
  const admin = createServiceClient()
  const { data: buckets } = await admin.storage.listBuckets()
  const existe = buckets?.some(b => b.id === BUCKET)
  if (!existe) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5242880 })
  }
}

export async function POST(request: NextRequest) {
  // Verificar sesión
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const ordenId = formData.get('orden_id') as string
  if (!ordenId) return NextResponse.json({ error: 'orden_id requerido' }, { status: 400 })

  const archivos = formData.getAll('archivos') as File[]
  if (!archivos.length) return NextResponse.json({ error: 'Sin archivos' }, { status: 400 })

  // Asegurar que el bucket existe (crea si no)
  await ensureBucket()

  const admin = createServiceClient()
  const urls: string[] = []
  const errores: string[] = []

  for (const file of archivos) {
    if (!file.size) continue
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path = `${ordenId}/${safeName}`

    const bytes = await file.arrayBuffer()
    const { error } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false })

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

  // Actualizar purchase_orders con las nuevas URLs
  const { data: oc } = await admin
    .from('purchase_orders')
    .select('comprobante_pago_urls')
    .eq('id', ordenId)
    .single()

  const existing = (oc?.comprobante_pago_urls as string[] | null) ?? []
  await admin
    .from('purchase_orders')
    .update({ comprobante_pago_urls: [...existing, ...urls] })
    .eq('id', ordenId)

  return NextResponse.json({ ok: true, urls, errores })
}
