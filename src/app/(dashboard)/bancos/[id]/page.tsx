import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import MovimientosManager from './_components/MovimientosManager'

export const dynamic = 'force-dynamic'

const TIPO_LABEL: Record<string, string> = {
  corriente: 'Cuenta Corriente',
  vista:     'Cuenta Vista',
  ahorro:    'Cuenta de Ahorro',
}

export default async function CuentaBancariaPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('store_id')
    .eq('id', user!.id)
    .single()

  const storeId = perfil?.store_id

  const { data: cuenta, error } = await supabase
    .from('cuentas_bancarias')
    .select('id, nombre, banco, tipo_cuenta, numero, saldo_inicial, activa, pos_marca, pos_terminal_id, created_at')
    .eq('id', id)
    .eq('store_id', storeId)
    .single()

  if (error || !cuenta) notFound()

  const { data: movimientos } = await supabase
    .from('movimientos_bancarios')
    .select('id, fecha, descripcion, monto, tipo, conciliado, notas, created_at')
    .eq('cuenta_id', id)
    .order('fecha', { ascending: false })
    .order('created_at', { ascending: false })

  const movs = movimientos ?? []
  const totalAbonos = movs.filter(m => m.tipo === 'abono').reduce((s, m) => s + m.monto, 0)
  const totalCargos = movs.filter(m => m.tipo === 'cargo').reduce((s, m) => s + m.monto, 0)
  const saldoActual = (cuenta.saldo_inicial ?? 0) + totalAbonos - totalCargos
  const pendientes = movs.filter(m => !m.conciliado).length

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap">
        <Link href="/bancos" className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
          ← Bancos
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-bold text-gray-900">{cuenta.nombre ?? cuenta.banco}</h1>
        {cuenta.pos_marca && (
          <span className="text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full flex items-center gap-1">
            💳 POS {cuenta.pos_marca}
            {cuenta.pos_terminal_id && <span className="font-mono">· {cuenta.pos_terminal_id}</span>}
          </span>
        )}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="sm:col-span-2 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-5 text-white">
          <p className="text-sm text-blue-200">
            {TIPO_LABEL[cuenta.tipo_cuenta] ?? cuenta.tipo_cuenta} · {cuenta.banco}
          </p>
          {cuenta.numero && <p className="text-xs text-blue-300 font-mono">···· {cuenta.numero.slice(-4)}</p>}
          <p className="text-3xl font-bold mt-2">${saldoActual.toLocaleString('es-CL')}</p>
          <p className="text-xs text-blue-200 mt-1">Saldo actual</p>
          {cuenta.pos_marca && (
            <p className="text-xs text-blue-300 mt-2 flex items-center gap-1">
              💳 POS {cuenta.pos_marca} vinculado
              {cuenta.pos_terminal_id && ` · Terminal ${cuenta.pos_terminal_id}`}
            </p>
          )}
        </div>

        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Total abonos</p>
          <p className="text-2xl font-bold text-green-700">+${totalAbonos.toLocaleString('es-CL')}</p>
          <p className="text-xs text-gray-400 mt-1">{movs.filter(m => m.tipo === 'abono').length} movimientos</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-xs font-semibold text-red-600 uppercase tracking-wide mb-1">Total cargos</p>
          <p className="text-2xl font-bold text-red-700">-${totalCargos.toLocaleString('es-CL')}</p>
          <p className="text-xs text-gray-400 mt-1">{movs.filter(m => m.tipo === 'cargo').length} movimientos</p>
        </div>
      </div>

      {pendientes > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2 text-sm text-amber-700 font-medium">
          ⚠ {pendientes} movimiento{pendientes !== 1 ? 's' : ''} pendiente{pendientes !== 1 ? 's' : ''} de conciliar
        </div>
      )}

      <MovimientosManager
        cuentaId={id}
        storeId={storeId!}
        movimientos={movs}
        saldoInicial={cuenta.saldo_inicial ?? 0}
      />
    </div>
  )
}
