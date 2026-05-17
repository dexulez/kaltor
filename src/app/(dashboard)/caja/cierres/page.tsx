import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCLP } from '@/lib/calculations'
import ReimprimirCierreBtn from '@/components/caja/ReimprimirCierreBtn'

const TZ = 'America/Santiago'

function horaLocal(iso: string) {
  return new Date(iso).toLocaleTimeString('es-CL', { timeZone: TZ, hour: '2-digit', minute: '2-digit' })
}

export default async function CierresCajaPage() {
  const supabase = await createClient()

  const [{ data: sesiones }, { data: sysConf }] = await Promise.all([
    supabase.from('sesiones_caja')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(120),
    supabase.from('system_config')
      .select('iva, comision_debito, comision_credito, comision_transferencia')
      .maybeSingle(),
  ])

  const conf = sysConf as { iva?: number; comision_debito?: number; comision_credito?: number; comision_transferencia?: number } | null

  type Sesion = {
    id: string; fecha: string; estado: string; apertura_at: string; cierre_at: string | null
    efectivo_apertura: number; efectivo_cierre: number | null
    transbank_cierre: number | null; transferencia_cierre: number | null; otros_cierre: number | null
    diferencia_efectivo: number | null; observaciones_cierre: string | null
  }
  const lista = (sesiones ?? []) as Sesion[]
  const cerradas = lista.filter(s => s.estado === 'cerrada')

  return (
    <div className="p-6 space-y-5">
      <div>
        <Link href="/caja" className="text-sm text-blue-600 hover:underline">← Volver a Caja</Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">Historial de cierres de caja</h1>
        <p className="text-gray-500 text-sm mt-0.5">{cerradas.length} cierre{cerradas.length !== 1 ? 's' : ''} registrado{cerradas.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Resumen mes actual */}
      {cerradas.length > 0 && (() => {
        const mesActual = new Date().toISOString().slice(0, 7)
        const delMes = cerradas.filter(s => s.fecha.startsWith(mesActual))
        const totalMes = delMes.reduce((s, ses) => s + (ses.efectivo_cierre ?? 0) + (ses.transbank_cierre ?? 0) + (ses.transferencia_cierre ?? 0) + (ses.otros_cierre ?? 0), 0)
        const diasMes = delMes.length
        return (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: 'Cierres este mes', value: `${diasMes} días`, sub: null },
              { label: 'Total recaudado (mes)', value: formatCLP(totalMes), sub: diasMes > 0 ? `Promedio: ${formatCLP(Math.round(totalMes / diasMes))}` : null },
              { label: 'Diferencias', value: `${delMes.filter(s => (s.diferencia_efectivo ?? 0) !== 0).length} con diferencia`, sub: null },
            ].map((k, i) => (
              <div key={i} className="bg-white rounded-xl border p-4">
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{k.label}</p>
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                {k.sub && <p className="text-xs text-gray-400 mt-0.5">{k.sub}</p>}
              </div>
            ))}
          </div>
        )
      })()}

      {/* Lista de cierres */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="bg-gray-50 border-b px-4 py-3">
          <h2 className="font-semibold text-gray-800 text-sm">Todos los cierres</h2>
        </div>
        {cerradas.length === 0 ? (
          <p className="text-center text-gray-400 py-12 text-sm">Sin cierres registrados aún</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Fecha', 'Apertura', 'Cierre', 'Fondo', 'Efectivo', 'Transbank', 'Transfer.', 'Total', 'Diferencia', 'Acciones'].map((h, i) => (
                    <th key={i} className={`px-3 py-2.5 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'} ${i === 9 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {cerradas.map(ses => {
                  const total = (ses.efectivo_cierre ?? 0) + (ses.transbank_cierre ?? 0) + (ses.transferencia_cierre ?? 0) + (ses.otros_cierre ?? 0)
                  const dif = ses.diferencia_efectivo ?? 0
                  return (
                    <tr key={ses.id} className="hover:bg-gray-50">
                      <td className="px-3 py-3 font-medium">
                        {new Date(ses.fecha + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </td>
                      <td className="px-3 py-3 text-right text-gray-500">{horaLocal(ses.apertura_at)}</td>
                      <td className="px-3 py-3 text-right text-gray-500">{ses.cierre_at ? horaLocal(ses.cierre_at) : '—'}</td>
                      <td className="px-3 py-3 text-right text-gray-600">{formatCLP(ses.efectivo_apertura)}</td>
                      <td className="px-3 py-3 text-right">{formatCLP(ses.efectivo_cierre ?? 0)}</td>
                      <td className="px-3 py-3 text-right">{formatCLP(ses.transbank_cierre ?? 0)}</td>
                      <td className="px-3 py-3 text-right">{formatCLP(ses.transferencia_cierre ?? 0)}</td>
                      <td className="px-3 py-3 text-right font-bold text-gray-900">{formatCLP(total)}</td>
                      <td className="px-3 py-3 text-right">
                        <span className={`font-semibold text-xs px-2 py-0.5 rounded-full ${dif === 0 ? 'bg-green-100 text-green-700' : dif > 0 ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                          {dif === 0 ? '✓ Cuadra' : `${dif > 0 ? '+' : ''}${formatCLP(dif)}`}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center">
                        <ReimprimirCierreBtn
                          sesionId={ses.id}
                          fecha={ses.fecha}
                          aperturaAt={ses.apertura_at}
                          cierreAt={ses.cierre_at ?? new Date().toISOString()}
                          fondoApertura={ses.efectivo_apertura}
                          efectivoCierre={ses.efectivo_cierre ?? 0}
                          transbankCierre={ses.transbank_cierre ?? 0}
                          transferenciaCierre={ses.transferencia_cierre ?? 0}
                          otrosCierre={ses.otros_cierre ?? 0}
                          diferenciaEfectivo={ses.diferencia_efectivo ?? 0}
                          observacionesCierre={ses.observaciones_cierre}
                          ivaRate={conf?.iva ?? 19}
                          comisionDebito={conf?.comision_debito ?? 1.5}
                          comisionCredito={conf?.comision_credito ?? 2.5}
                          comisionTransferencia={conf?.comision_transferencia ?? 0}
                        />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
