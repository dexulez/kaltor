import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import NuevaCuentaModal from './_components/NuevaCuentaModal'

export const dynamic = 'force-dynamic'

const TIPO_LABEL: Record<string, string> = {
  corriente: 'Cta. Corriente',
  vista:     'Cta. Vista',
  ahorro:    'Cta. Ahorro',
}

export default async function BancosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('store_id')
    .eq('id', user!.id)
    .single()

  const storeId = perfil?.store_id

  const { data: cuentas } = await supabase
    .from('cuentas_bancarias')
    .select('id, nombre, banco, tipo_cuenta, numero, saldo_inicial, activa')
    .eq('store_id', storeId)
    .eq('activa', true)
    .order('created_at', { ascending: true })

  const { data: movimientos } = await supabase
    .from('movimientos_bancarios')
    .select('cuenta_id, tipo, monto, conciliado')
    .eq('store_id', storeId)

  function calcularSaldo(cuentaId: string, saldoInicial: number) {
    const movs = (movimientos ?? []).filter((m: { cuenta_id: string }) => m.cuenta_id === cuentaId)
    const abonos = movs.filter((m: { tipo: string }) => m.tipo === 'abono').reduce((s: number, m: { monto: number }) => s + m.monto, 0)
    const cargos  = movs.filter((m: { tipo: string }) => m.tipo === 'cargo').reduce((s: number, m: { monto: number }) => s + m.monto, 0)
    return saldoInicial + abonos - cargos
  }

  function pendientesConciliacion(cuentaId: string) {
    return (movimientos ?? []).filter((m: { cuenta_id: string; conciliado: boolean }) => m.cuenta_id === cuentaId && !m.conciliado).length
  }

  const saldoTotal = (cuentas ?? []).reduce((s, c) => s + calcularSaldo(c.id, c.saldo_inicial ?? 0), 0)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bancos</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gestiona tus cuentas bancarias y conciliaciones</p>
        </div>
        <NuevaCuentaModal storeId={storeId!} />
      </div>

      {/* Saldo total */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
        <p className="text-sm font-medium text-blue-200">Saldo total en bancos</p>
        <p className="text-3xl font-bold mt-1">${saldoTotal.toLocaleString('es-CL')}</p>
        <p className="text-xs text-blue-200 mt-1">
          {(cuentas ?? []).length} cuenta{(cuentas ?? []).length !== 1 ? 's' : ''} activa{(cuentas ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Lista de cuentas */}
      {!cuentas || cuentas.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 py-16 text-center">
          <p className="text-4xl mb-3">🏦</p>
          <p className="font-semibold text-gray-700 mb-1">Sin cuentas bancarias</p>
          <p className="text-sm text-gray-400">Agrega tu primera cuenta para llevar el control de tus movimientos</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cuentas.map(cuenta => {
            const saldo = calcularSaldo(cuenta.id, cuenta.saldo_inicial ?? 0)
            const pendientes = pendientesConciliacion(cuenta.id)
            return (
              <Link
                key={cuenta.id}
                href={`/bancos/${cuenta.id}`}
                className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 hover:shadow-md hover:border-blue-300 transition-all group"
              >
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">
                      {cuenta.nombre ?? cuenta.banco}
                    </p>
                    <p className="text-sm text-gray-500">{cuenta.banco}</p>
                  </div>
                  <span className="text-xs font-medium bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                    {TIPO_LABEL[cuenta.tipo_cuenta] ?? cuenta.tipo_cuenta}
                  </span>
                </div>
                {cuenta.numero && (
                  <p className="text-xs text-gray-400 font-mono mb-3">···· {cuenta.numero.slice(-4)}</p>
                )}
                <div className="border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500 mb-0.5">Saldo disponible</p>
                  <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                    ${saldo.toLocaleString('es-CL')}
                  </p>
                  {pendientes > 0 && (
                    <p className="text-xs text-amber-600 font-medium mt-2">
                      ⚠ {pendientes} movimiento{pendientes !== 1 ? 's' : ''} sin conciliar
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
