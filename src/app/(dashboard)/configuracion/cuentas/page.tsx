import { createClient } from '@/lib/supabase/server'
import CuentasBancariasManager from '@/components/configuracion/CuentasBancariasManager'
import Link from 'next/link'

export default async function CuentasBancariasPage() {
  const supabase = await createClient()
  const { data: cuentas } = await supabase
    .from('cuentas_bancarias')
    .select('*')
    .order('orden')
    .then(r => r.error ? { data: [] } : r)

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/configuracion" className="text-sm text-blue-600 hover:underline">← Configuración</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Cuentas bancarias</h1>
        <p className="text-gray-500 text-sm mt-0.5">
          Agrega las cuentas donde recibes pagos. Los clientes las verán en el enlace de pagos.{' '}
          <Link href="/pagar" target="_blank" className="text-blue-600 hover:underline font-medium">Ver enlace público →</Link>
        </p>
      </div>
      <CuentasBancariasManager cuentasIniciales={(cuentas ?? []) as Parameters<typeof CuentasBancariasManager>[0]['cuentasIniciales']} />
    </div>
  )
}
