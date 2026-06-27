import { createClient, createServiceClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import ConfirmarPedidoForm from './ConfirmarPedidoForm'
import HistorialProveedor, { HistorialOC } from './HistorialProveedor'
import { tieneSubPermiso } from '@/lib/modulos'

export default async function PedidoProveedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = createServiceClient()

  const [{ data: orden }, itemsResult, { data: cfg }] = await Promise.all([
    supabase.from('purchase_orders')
      .select('id, numero_oc, estado, created_at, confirmado_proveedor_at, comprobante_envio_url, notas, supplier_id, suppliers(nombre, telefono, email, whatsapp)')
      .eq('id', id).single(),
    supabase.from('purchase_order_items')
      .select('id, nombre, cantidad_solicitada, cantidad_recibida, precio_unitario, disponible_proveedor, cantidad_disponible_proveedor, precio_cotizado, precio_aceptado, nota_proveedor, alternativa, descuento_tipo, descuento_valor, descuento_desde_cantidad')
      .eq('purchase_order_id', id)
      .order('nombre'),
    supabase.from('system_config')
      .select('nombre_local, rut_local, direccion, telefono, logo_url')
      .maybeSingle(),
  ])

  if (!orden) notFound()

  // Fallback si columnas nuevas no existen aún
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let items: any[] | null = itemsResult.data
  if (!items && itemsResult.error) {
    const { data: itemsFallback } = await supabase
      .from('purchase_order_items')
      .select('id, nombre, cantidad_solicitada, precio_unitario, disponible_proveedor')
      .eq('purchase_order_id', id)
      .order('nombre')
    items = itemsFallback
  }

  // Historial completo del proveedor (todas las OCs con este supplier)
  const supplierId = (orden as Record<string, unknown>).supplier_id as string | null
  let historial: HistorialOC[] = []

  if (supplierId) {
    const { data: hData } = await supabase
      .from('purchase_orders')
      .select(`
        id, numero_oc, estado, total, created_at, fecha_recepcion, costo_envio_total, comprobante_pago_urls, monto_pagado,
        purchase_order_items(
          id, nombre, cantidad_solicitada, cantidad_recibida,
          precio_unitario, precio_aceptado, precio_cotizado, disponible_proveedor
        )
      `)
      .eq('supplier_id', supplierId)
      .neq('estado', 'cancelada')
      .order('created_at', { ascending: false })
      .limit(50)

    historial = ((hData ?? []) as (HistorialOC & { monto_pagado: number | null })[])
      .map(o => ({ ...o, monto_pagado: o.monto_pagado ?? 0 }))
  }

  // Esta misma página la abre el proveedor (sin sesión) y también el admin (vía el botón
  // "Link" del detalle de la OC, en el mismo navegador donde ya tiene sesión iniciada).
  // Solo en ese segundo caso se habilita seleccionar OCs y registrar un pago consolidado.
  const supabaseAuth = await createClient()
  const { data: { user: usuarioAutenticado } } = await supabaseAuth.auth.getUser()
  let puedePagar = false
  if (usuarioAutenticado) {
    const { data: perfil } = await supabaseAuth
      .from('user_profiles')
      .select('permisos_modulos, roles(nombre)')
      .eq('id', usuarioAutenticado.id)
      .single()
    const rolesData = perfil?.roles as { nombre?: string } | { nombre?: string }[] | null
    const rolNombre = (Array.isArray(rolesData) ? rolesData[0]?.nombre : rolesData?.nombre) ?? ''
    const permisos = perfil?.permisos_modulos as Record<string, boolean> | null
    puedePagar = tieneSubPermiso('compras.pagar', rolNombre, permisos)
  }

  const local = cfg as { nombre_local?: string; rut_local?: string | null; direccion?: string | null; telefono?: string | null; logo_url?: string | null } | null
  const ya_confirmado = !!(orden as Record<string, unknown>).confirmado_proveedor_at
  const supplierNombre = Array.isArray((orden as Record<string, unknown>).suppliers)
    ? ((orden as Record<string, unknown>).suppliers as { nombre: string }[])[0]?.nombre
    : ((orden as Record<string, unknown>).suppliers as { nombre: string } | null)?.nombre ?? 'Proveedor'

  type Item = { id: string; nombre: string; cantidad_solicitada: number; cantidad_recibida?: number; precio_unitario: number; disponible_proveedor: boolean | null; cantidad_disponible_proveedor?: number | null; precio_cotizado?: number | null; precio_aceptado?: number | null; nota_proveedor?: string | null; alternativa?: string | null; descuento_tipo?: string | null; descuento_valor?: number | null; descuento_desde_cantidad?: number | null }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          {local?.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={local.logo_url} alt="Logo" className="h-10 max-w-24 object-contain" />
          )}
          <div>
            <p className="font-bold text-gray-900">{local?.nombre_local ?? 'TechRepair'}</p>
            {local?.telefono && <p className="text-xs text-gray-500">Tel: {local.telefono}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {/* Encabezado pedido actual */}
        <div className="bg-white rounded-xl border shadow-sm p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Solicitud de pedido</p>
              <p className="text-2xl font-bold font-mono text-blue-700">{(orden as Record<string, unknown>).numero_oc as string}</p>
              <p className="text-sm text-gray-600 mt-0.5">
                {new Date((orden as Record<string, unknown>).created_at as string)
                  .toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
            </div>
            {ya_confirmado && (
              <span className="bg-green-100 text-green-700 text-xs font-semibold px-3 py-1.5 rounded-full">
                ✓ Confirmado
              </span>
            )}
          </div>
          {typeof (orden as Record<string, unknown>).notas === 'string' && (
            <p className="text-xs text-gray-400 mt-2 italic">
              {((orden as Record<string, unknown>).notas as string).replace('[SOLICITUD] ', '')}
            </p>
          )}
        </div>

        {/* Formulario de confirmación / estado */}
        <ConfirmarPedidoForm
          ordenId={id}
          items={(items ?? []) as Item[]}
          yaConfirmado={ya_confirmado}
          comprobanteUrl={(orden as Record<string, unknown>).comprobante_envio_url as string | null}
          estado={(orden as Record<string, unknown>).estado as string}
        />

        {/* ── Historial completo del proveedor ── */}
        {historial.length > 0 && (
          <HistorialProveedor
            historial={historial}
            currentOrderId={id}
            nombreLocal={local?.nombre_local ?? 'nosotros'}
            supplierNombre={supplierNombre}
            puedePagar={puedePagar}
          />
        )}
      </div>
    </div>
  )
}
