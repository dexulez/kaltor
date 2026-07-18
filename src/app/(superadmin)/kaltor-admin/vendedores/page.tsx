import { createServiceClient } from '@/lib/supabase/server'
import VendedoresTable, { VendedorRow } from './_components/VendedoresTable'
import ConfigVendedores from './_components/ConfigVendedores'

export const dynamic = 'force-dynamic'

export default async function VendedoresPage() {
  const admin = createServiceClient()

  const [{ data: vendedores }, { data: stores }, { data: comisiones }, { data: config }] = await Promise.all([
    admin.from('vendedores_externos')
      .select('id, codigo, nombre, email, telefono, estado, created_at')
      .order('created_at', { ascending: false }),
    admin.from('stores').select('vendedor_id').not('vendedor_id', 'is', null),
    admin.from('comisiones_vendedor').select('vendedor_id, monto, estado'),
    admin.from('config_vendedores').select('tope_descuento_pct').eq('id', 1).maybeSingle(),
  ])

  const clientesPorVendedor: Record<string, number> = {}
  for (const s of stores ?? []) {
    if (!s.vendedor_id) continue
    clientesPorVendedor[s.vendedor_id] = (clientesPorVendedor[s.vendedor_id] ?? 0) + 1
  }

  const comisionPendiente: Record<string, number> = {}
  const comisionPagada: Record<string, number> = {}
  for (const c of comisiones ?? []) {
    const target = c.estado === 'pagada' ? comisionPagada : comisionPendiente
    target[c.vendedor_id] = (target[c.vendedor_id] ?? 0) + Number(c.monto)
  }

  const rows: VendedorRow[] = (vendedores ?? []).map(v => ({
    ...v,
    clientes: clientesPorVendedor[v.id] ?? 0,
    comision_pendiente: comisionPendiente[v.id] ?? 0,
    comision_pagada: comisionPagada[v.id] ?? 0,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Vendedores externos</h1>
        <p className="text-gray-500 text-sm mt-1">
          Afiliados que invitan nuevos clientes con su código y ganan comisión recurrente.
        </p>
      </div>

      <ConfigVendedores topeInicial={config?.tope_descuento_pct ?? 15} />

      <VendedoresTable vendedores={rows} />
    </div>
  )
}
