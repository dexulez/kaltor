import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

const BUCKET = 'comprobantes-contabilidad'

const TABLAS_PERMITIDAS = ['pagos_previsionales', 'declaraciones_f29', 'obligaciones_tributarias'] as const
type TablaPermitida = typeof TABLAS_PERMITIDAS[number]

async function ensureBucket() {
  const admin = createServiceClient()
  const { data: buckets } = await admin.storage.listBuckets()
  const existe = buckets?.some(b => b.id === BUCKET)
  if (!existe) {
    await admin.storage.createBucket(BUCKET, { public: true, fileSizeLimit: 5242880 })
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const formData = await request.formData()
  const tabla = formData.get('tabla') as string
  const registroId = formData.get('registro_id') as string
  const archivo = formData.get('archivo') as File | null

  if (!TABLAS_PERMITIDAS.includes(tabla as TablaPermitida)) {
    return NextResponse.json({ error: 'Tabla no permitida' }, { status: 400 })
  }
  if (!registroId) return NextResponse.json({ error: 'registro_id requerido' }, { status: 400 })
  if (!archivo || !archivo.size) return NextResponse.json({ error: 'Sin archivo' }, { status: 400 })

  await ensureBucket()

  const admin = createServiceClient()
  const ext = archivo.name.split('.').pop()?.toLowerCase() ?? 'jpg'
  const path = `${tabla}/${registroId}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const bytes = await archivo.arrayBuffer()
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
    .upload(path, bytes, { contentType: archivo.type, upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 })
  }

  const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)

  const { error: updateError } = await admin
    .from(tabla as TablaPermitida)
    .update({ comprobante_url: publicUrl })
    .eq('id', registroId)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, url: publicUrl })
}
