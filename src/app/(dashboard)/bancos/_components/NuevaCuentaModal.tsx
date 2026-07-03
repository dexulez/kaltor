'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const BANCOS = [
  'BancoEstado', 'BCI', 'Santander', 'Banco de Chile', 'Itaú', 'BICE',
  'Scotiabank', 'Banco Security', 'Falabella', 'Ripley', 'Consorcio', 'Otro',
]

const POS_MARCAS = [
  'Getnet', 'Transbank', 'Mercado Pago', 'Flow', 'Kushki', 'BBVA', 'Otro',
]

export default function NuevaCuentaModal({ storeId }: { storeId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [tienePos, setTienePos] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    banco: 'BancoEstado',
    tipo_cuenta: 'corriente',
    numero: '',
    saldo_inicial: '',
    pos_marca: 'Getnet',
    pos_terminal_id: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  function handleClose() {
    setOpen(false)
    setTienePos(false)
    setForm({ nombre: '', banco: 'BancoEstado', tipo_cuenta: 'corriente', numero: '', saldo_inicial: '', pos_marca: 'Getnet', pos_terminal_id: '' })
  }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error('Ingresa un nombre para la cuenta'); return }
    setSaving(true)
    const { error } = await supabase.from('cuentas_bancarias').insert({
      store_id:        storeId,
      nombre:          form.nombre.trim(),
      titular:         form.nombre.trim(),
      banco:           form.banco,
      tipo_cuenta:     form.tipo_cuenta,
      numero:          form.numero.trim() || null,
      saldo_inicial:   parseInt(form.saldo_inicial) || 0,
      activa:          true,
      pos_marca:       tienePos ? form.pos_marca : null,
      pos_terminal_id: tienePos && form.pos_terminal_id.trim() ? form.pos_terminal_id.trim() : null,
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Cuenta creada correctamente')
    handleClose()
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition-colors"
      >
        + Nueva cuenta
      </button>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={handleClose}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg">Nueva cuenta bancaria</h3>

            {/* Nombre */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la cuenta *</label>
              <input
                value={form.nombre}
                onChange={e => set('nombre', e.target.value)}
                placeholder="Ej: Cuenta Corriente Santander"
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                autoFocus
              />
            </div>

            {/* Banco + Tipo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Banco</label>
                <select value={form.banco} onChange={e => set('banco', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
                <select value={form.tipo_cuenta} onChange={e => set('tipo_cuenta', e.target.value)}
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option value="corriente">Cta. Corriente</option>
                  <option value="vista">Cta. Vista</option>
                  <option value="ahorro">Cta. Ahorro</option>
                </select>
              </div>
            </div>

            {/* N° cuenta + Saldo */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">N° de cuenta</label>
                <input value={form.numero} onChange={e => set('numero', e.target.value)}
                  placeholder="Últimos 4 dígitos"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Saldo inicial (CLP)</label>
                <input type="number" value={form.saldo_inicial} onChange={e => set('saldo_inicial', e.target.value)}
                  placeholder="0"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
            </div>

            {/* POS toggle */}
            <div className="border-t border-gray-100 pt-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <button
                  type="button"
                  role="switch"
                  aria-checked={tienePos}
                  onClick={() => setTienePos(v => !v)}
                  className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 ${
                    tienePos ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${tienePos ? 'translate-x-4' : 'translate-x-0'}`} />
                </button>
                <div>
                  <p className="text-sm font-semibold text-gray-800">¿Tiene POS asociado?</p>
                  <p className="text-xs text-gray-400">Vincula un terminal de pago a esta cuenta</p>
                </div>
              </label>

              {tienePos && (
                <div className="mt-3 bg-blue-50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">Marca del POS</label>
                      <select value={form.pos_marca} onChange={e => set('pos_marca', e.target.value)}
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                        {POS_MARCAS.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-1">ID / N° terminal</label>
                      <input
                        value={form.pos_terminal_id}
                        onChange={e => set('pos_terminal_id', e.target.value)}
                        placeholder="Ej: 12345678"
                        className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-blue-600">
                    Los pagos con débito/crédito por este POS se asociarán a esta cuenta para la conciliación.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-2 pt-1">
              <button onClick={handleClose}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                Cancelar
              </button>
              <button onClick={guardar} disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60">
                {saving ? 'Guardando...' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
