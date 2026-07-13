import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient, createServiceClient } from '@/lib/supabase/server'

function slugify(label: string): string {
  return label
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'tipo'
}

async function getStoreId() {
  const supabase = await createAuthClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createServiceClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('store_id')
    .eq('id', user.id)
    .single()

  return profile?.store_id ?? null
}

export async function GET() {
  const storeId = await getStoreId()
  if (!storeId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const admin = createServiceClient()
  const { data, error } = await admin
    .from('equipment_types')
    .select('id, store_id, value, label, icon, template, orden')
    .eq('store_id', storeId)
    .order('orden')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tipos: data })
}

export async function POST(req: NextRequest) {
  const storeId = await getStoreId()
  if (!storeId) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { label, icon, template } = await req.json() as { label: string; icon: string; template: string }
  if (!label?.trim()) return NextResponse.json({ error: 'El nombre es obligatorio' }, { status: 400 })

  const admin = createServiceClient()

  const { data: existentes } = await admin
    .from('equipment_types')
    .select('value, orden')
    .eq('store_id', storeId)

  const base = slugify(label)
  let value = base
  let n = 2
  while (existentes?.some(t => t.value === value)) {
    value = `${base}_${n}`
    n++
  }
  const orden = Math.max(-1, ...(existentes ?? []).map(t => t.orden)) + 1

  const { data, error } = await admin
    .from('equipment_types')
    .insert({
      store_id: storeId,
      value,
      label: label.trim(),
      icon: icon?.trim() || '🔧',
      template: template?.trim() || 'otro',
      orden,
    })
    .select('id, store_id, value, label, icon, template, orden')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ tipo: data })
}
