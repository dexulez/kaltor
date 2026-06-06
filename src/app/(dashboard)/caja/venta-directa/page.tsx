import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PosVentaDirecta from '@/components/caja/PosVentaDirecta'
import AbrirCajaInline from '@/components/caja/AbrirCajaInline'
import { labelTipoEquipo } from '@/lib/tipoEquipo'

export default async function VentaDirectaPage({
  searchParams,
}: {
  searchParams: Promise<{ ot?: string }>
}) {
  const { ot: otId } = await searchParams
  const supabase = await createClient()

  const [{ data: productos }, { data: config }, { data: clientes }, { data: sesion }, { data: servicios }] = await Promise.all([
    supabase.from('products').select('*, product_categories(*)').eq('activo', true).order('nombre'),
    supabase.from('system_config').select('*').single(),
    supabase.from('customers').select('id, nombre, telefono, rut').order('nombre'),
    supabase.from('sesiones_caja').select('id, estado').eq('estado', 'abierta').order('apertura_at', { ascending: false }).limit(1).maybeSingle()
      .then(r => r.error ? { data: null } : r),
    supabase.from('repair_services').select('id, nombre, precio_base, tipo_reparacion').eq('activo', true).order('nombre'),
  ])

  const cajaAbierta = !!sesion

  // Si viene con ?ot=ID, precargar la OT en el carrito de servicios
  let otPreload = null
  if (otId) {
    const { data: otData } = await supabase
      .from('repair_orders')
      .select('id, numero_ot, precio_servicio, presupuesto_estimado, customers(nombre), equipment(tipo_equipo, marca, modelo)')
      .eq('id', otId)
      .in('estado', ['listo', 'para_entrega'])
      .single()
    if (otData) {
      const ot = otData as unknown as {
        id: string; numero_ot: string; precio_servicio: number | null; presupuesto_estimado: number | null
        customers: { nombre: string } | null
        equipment: { tipo_equipo?: string | null; marca: string; modelo: string } | null
      }
      otPreload = {
        id: ot.id,
        numero_ot: ot.numero_ot,
        cliente_nombre: ot.customers?.nombre ?? '—',
        equipo: [labelTipoEquipo(ot.equipment?.tipo_equipo), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' '),
        precio: ot.precio_servicio ?? ot.presupuesto_estimado ?? 0,
      }
    }
  }

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Venta directa</h1>
      </div>

      {!cajaAbierta ? (
        <AbrirCajaInline returnUrl={`/caja/venta-directa${otId ? `?ot=${otId}` : ''}`} />
      ) : (
        <PosVentaDirecta
          productos={productos ?? []}
          clientes={clientes ?? []}
          servicios={(servicios ?? []) as { id: string; nombre: string; precio_base: number; tipo_reparacion: string }[]}
          IVA={config?.iva ?? 19}
          PPM={config?.ppm ?? 3}
          comisionDebito={config?.comision_debito ?? 0}
          comisionCredito={config?.comision_credito ?? 0}
          otPreload={otPreload}
          ticketConfig={{
            nombre_local: config?.nombre_local ?? '',
            rut_local: config?.rut_local ?? null,
            direccion: config?.direccion ?? null,
            telefono: config?.telefono ?? null,
            email: config?.email ?? null,
            logo_url: config?.logo_url ?? null,
          }}
        />
      )}
    </div>
  )
}

