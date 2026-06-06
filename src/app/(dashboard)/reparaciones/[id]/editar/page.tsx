import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import EditarOTCompleto from '@/components/reparaciones/EditarOTCompleto'

export default async function EditarOTPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: ot }, { data: tecnicos }, { data: repuestosRaw }] = await Promise.all([
    supabase.from('repair_orders')
      .select('*, customers(*), equipment(*), user_profiles(id, nombre_completo)')
      .eq('id', id)
      .single(),
    supabase.from('user_profiles').select('id, nombre_completo').order('nombre_completo'),
    supabase.from('repair_items')
      .select('id, nombre, cantidad, precio_costo, precio_venta, costo_envio, product_id')
      .eq('repair_order_id', id)
      .order('created_at'),
  ])

  if (!ot) notFound()

  // Asegurar que el técnico actual siempre aparezca
  const otRaw = ot as Record<string, unknown>
  const tecnicoActual = (otRaw.user_profiles as { id: string; nombre_completo: string } | null)
  const tecnicosBase = (tecnicos ?? []) as { id: string; nombre_completo: string }[]
  const tecnicosList = tecnicoActual && !tecnicosBase.find(t => t.id === tecnicoActual.id)
    ? [tecnicoActual, ...tecnicosBase]
    : tecnicosBase

  type RepuestoItem = { id: string; nombre: string; cantidad: number; precio_costo: number; precio_venta?: number; costo_envio: number; product_id: string | null }
  const repuestosIniciales = (repuestosRaw ?? [] as RepuestoItem[]).map(r => ({
    _key: r.id,
    product_id: (r as RepuestoItem).product_id,
    nombre: (r as RepuestoItem).nombre,
    cantidad: (r as RepuestoItem).cantidad,
    precio_costo: (r as RepuestoItem).precio_costo,
    precio_venta: (r as RepuestoItem).precio_venta ?? 0,
  }))

  return (
    <div className="p-6 space-y-5 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <Link href={`/reparaciones/${id}`} className="text-sm text-blue-600 hover:underline">← Volver a la OT</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">
            Editar OT — <span className="font-mono text-blue-700">{(ot as { numero_ot: string }).numero_ot}</span>
          </h1>
        </div>
      </div>
      <EditarOTCompleto
        ot={ot as Parameters<typeof EditarOTCompleto>[0]['ot']}
        tecnicos={tecnicosList}
        repuestosIniciales={repuestosIniciales}
      />
    </div>
  )
}
