'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Movimiento {
  id: string
  fecha: string
  descripcion: string
  monto: number
  tipo: string
  conciliado: boolean
  notas: string | null
  created_at: string
}

interface Props {
  cuentaId: string
  storeId: string
  movimientos: Movimiento[]
  saldoInicial: number
}

export default function MovimientosManager({ cuentaId, storeId, movimientos: initial, saldoInicial }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [movimientos, setMovimientos] = useState<Movimiento[]>(initial)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [filtro, setFiltro] = useState<'todos' | 'pendientes' | 'conciliados'>('todos')
  const [form, setForm] = useState({
    fecha: new Date().toISOString().split('T')[0],
    descripcion: '',
    monto: '',
    tipo: 'abono' as 'abono' | 'cargo',
    notas: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function agregarMovimiento() {
    if (!form.descripcion.trim()) { toast.error('Ingresa una descripción'); return }
    if (!form.monto || parseInt(form.monto) <= 0) { toast.error('Ingresa un monto válido'); return }
    setSaving(true)
    const payload = {
      store_id:    storeId,
      cuenta_id:   cuentaId,
      fecha:       form.fecha,
      descripcion: form.descripcion.trim(),
      monto:       parseInt(form.monto),
      tipo:        form.tipo,
      notas:       form.notas.trim() || null,
      conciliado:  false,
    }
    const { data, error } = await supabase
      .from('movimientos_bancarios')
      .insert(payload)
      .select('id, fecha, descripcion, monto, tipo, conciliado, notas, created_at')
      .single()
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    setMovimientos(prev => [data as Movimiento, ...prev])
    toast.success('Movimiento registrado')
    setShowForm(false)
    setForm({ fecha: new Date().toISOString().split('T')[0], descripcion: '', monto: '', tipo: 'abono', notas: '' })
    router.refresh()
  }

  async function toggleConciliado(mov: Movimiento) {
    if (toggling) return
    setToggling(mov.id)
    const nuevo = !mov.conciliado
    const { error } = await supabase
      .from('movimientos_bancarios')
      .update({ conciliado: nuevo })
      .eq('id', mov.id)
    setToggling(null)
    if (error) { toast.error('Error: ' + error.message); return }
    setMovimientos(prev => prev.map(m => m.id === mov.id ? { ...m, conciliado: nuevo } : m))
    toast.success(nuevo ? 'Marcado como conciliado' : 'Marcado como pendiente')
  }

  async function eliminarMovimiento(id: string) {
    if (!confirm('¿Eliminar este movimiento?')) return
    const { error } = await supabase.from('movimientos_bancarios').delete().eq('id', id)
    if (error) { toast.error('Error: ' + error.message); return }
    setMovimientos(prev => prev.filter(m => m.id !== id))
    toast.success('Movimiento eliminado')
  }

  const movsFiltrados = movimientos.filter(m => {
    if (filtro === 'pendientes') return !m.conciliado
    if (filtro === 'conciliados') return m.conciliado
    return true
  })

  // Saldo acumulado desde el inicio (en orden cronológico)
  const movsCronologico = [...movimientos].sort((a, b) => {
    const da = new Date(`${a.fecha}T${a.created_at.split('T')[1] ?? '00:00:00'}`)
    const db = new Date(`${b.fecha}T${b.created_at.split('T')[1] ?? '00:00:00'}`)
    return da.getTime() - db.getTime()
  })
  let saldoAcum = saldoInicial
  const saldoMap = new Map<string, number>()
  for (const m of movsCronologico) {
    saldoAcum += m.tipo === 'abono' ? m.monto : -m.monto
    saldoMap.set(m.id, saldoAcum)
  }

  const pendientes = movimientos.filter(m => !m.conciliado).length

  return (
    <div className="space-y-4">
      {/* Header tabla */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 text-sm">
          {(['todos', 'pendientes', 'conciliados'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${
                filtro === f ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'todos' ? `Todos (${movimientos.length})` :
               f === 'pendientes' ? `Pendientes (${pendientes})` :
               `Conciliados (${movimientos.length - pendientes})`}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
        >
          {showForm ? '✕ Cancelar' : '+ Agregar movimiento'}
        </button>
      </div>

      {/* Formulario nuevo movimiento */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-5 space-y-4">
          <p className="font-semibold text-gray-800">Nuevo movimiento</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => set('fecha', e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => set('tipo', 'abono')}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    form.tipo === 'abono' ? 'bg-green-600 text-white border-green-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  + Abono
                </button>
                <button
                  type="button"
                  onClick={() => set('tipo', 'cargo')}
                  className={`flex-1 py-2 rounded-xl border text-sm font-semibold transition-colors ${
                    form.tipo === 'cargo' ? 'bg-red-600 text-white border-red-600' : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  − Cargo
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Descripción *</label>
              <input
                value={form.descripcion}
                onChange={e => set('descripcion', e.target.value)}
                placeholder="Ej: Depósito ventas del día"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Monto (CLP) *</label>
              <input
                type="number"
                min={1}
                value={form.monto}
                onChange={e => set('monto', e.target.value)}
                placeholder="0"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">Notas (opcional)</label>
            <input
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              placeholder="Referencia, N° de comprobante, etc."
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={agregarMovimiento}
              disabled={saving}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
            >
              {saving ? 'Guardando...' : 'Registrar movimiento'}
            </button>
          </div>
        </div>
      )}

      {/* Tabla de movimientos */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {movsFiltrados.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            {filtro === 'pendientes' ? 'No hay movimientos pendientes de conciliar' :
             filtro === 'conciliados' ? 'No hay movimientos conciliados aún' :
             'Sin movimientos registrados'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Fecha</th>
                  <th className="text-left px-4 py-3 text-gray-500 font-semibold">Descripción</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Monto</th>
                  <th className="text-right px-4 py-3 text-gray-500 font-semibold">Saldo</th>
                  <th className="text-center px-4 py-3 text-gray-500 font-semibold">Conciliado</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {movsFiltrados.map(mov => {
                  const saldoFila = saldoMap.get(mov.id) ?? 0
                  return (
                    <tr key={mov.id} className={mov.conciliado ? 'bg-green-50/40' : ''}>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                        {new Date(`${mov.fecha}T12:00:00`).toLocaleDateString('es-CL', { day: 'numeric', month: 'short' })}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-900 font-medium">{mov.descripcion}</p>
                        {mov.notas && <p className="text-xs text-gray-400 mt-0.5">{mov.notas}</p>}
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`font-bold ${mov.tipo === 'abono' ? 'text-green-700' : 'text-red-700'}`}>
                          {mov.tipo === 'abono' ? '+' : '−'}${mov.monto.toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <span className={`text-sm font-semibold ${saldoFila >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                          ${saldoFila.toLocaleString('es-CL')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleConciliado(mov)}
                          disabled={toggling === mov.id}
                          title={mov.conciliado ? 'Marcar como pendiente' : 'Marcar como conciliado'}
                          className={`w-7 h-7 rounded-full border-2 flex items-center justify-center mx-auto transition-colors ${
                            mov.conciliado
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-400'
                          } ${toggling === mov.id ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                        >
                          {mov.conciliado && <span className="text-xs font-bold">✓</span>}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => eliminarMovimiento(mov.id)}
                          className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                        >
                          ×
                        </button>
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
