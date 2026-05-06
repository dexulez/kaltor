import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PosVentaDirecta from '@/components/caja/PosVentaDirecta'

export default async function VentaDirectaPage({
  searchParams,
}: {
  searchParams: Promise<{ ot?: string }>
}) {
  const { ot: otId } = await searchParams
  const supabase = await createClient()

  const [{ data: productos }, { data: config }, { data: clientes }] = await Promise.all([
    supabase.from('products').select('*, product_categories(*)').eq('activo', true).gt('stock_actual', 0).order('nombre'),
    supabase.from('system_config').select('*').single(),
    supabase.from('customers').select('id, nombre, telefono, rut').order('nombre'),
  ])

  // Si viene con ?ot=ID, precargar la OT en el carrito de servicios
  let otPreload = null
  if (otId) {
    const { data: otData } = await supabase
      .from('repair_orders')
      .select('id, numero_ot, precio_servicio, customers(nombre), equipment(marca, modelo)')
      .eq('id', otId)
      .eq('estado', 'listo')
      .single()
    if (otData) {
      const ot = otData as unknown as {
        id: string; numero_ot: string; precio_servicio: number | null
        customers: { nombre: string } | null
        equipment: { marca: string; modelo: string } | null
      }
      otPreload = {
        id: ot.id,
        numero_ot: ot.numero_ot,
        cliente_nombre: ot.customers?.nombre ?? '—',
        equipo: `${ot.equipment?.marca ?? ''} ${ot.equipment?.modelo ?? ''}`.trim(),
        precio: ot.precio_servicio ?? 0,
      }
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Venta directa</h1>
      </div>
      <PosVentaDirecta
        productos={productos ?? []}
        clientes={clientes ?? []}
        IVA={config?.iva ?? 19}
        PPM={config?.ppm ?? 3}
        comisionDebito={config?.comision_debito ?? 0}
        comisionCredito={config?.comision_credito ?? 0}
        otPreload={otPreload}
      />
    </div>
  )
}
