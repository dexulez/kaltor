import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import PosVentaDirecta from '@/components/caja/PosVentaDirecta'

export default async function VentaDirectaPage() {
  const supabase = await createClient()

  const [{ data: productos }, { data: config }] = await Promise.all([
    supabase.from('products').select('*, product_categories(*)').eq('activo', true).gt('stock_actual', 0).order('nombre'),
    supabase.from('system_config').select('*').single(),
  ])

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Venta directa</h1>
      </div>
      <PosVentaDirecta
        productos={productos ?? []}
        IVA={config?.iva ?? 19}
        PPM={config?.ppm ?? 3}
        comisionDebito={config?.comision_debito ?? 0}
        comisionCredito={config?.comision_credito ?? 0}
      />
    </div>
  )
}
