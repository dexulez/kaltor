'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

const BANCOS = [
  'BancoEstado', 'BCI', 'Santander', 'Banco de Chile', 'Itaú', 'BICE',
  'Scotiabank', 'Banco Security', 'Falabella', 'Ripley', 'Consorcio', 'Otro',
]

export default function NuevaCuentaModal({ storeId }: { storeId: string }) {
  const router = useRouter()
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    nombre: '',
    banco: 'BancoEstado',
    tipo: 'corriente',
    numero: '',
    saldo_inicial: '',
  })

  function set(k: string, v: string) { setForm(f => ({ ...f, [k]: v })) }

  async function guardar() {
    if (!form.nombre.trim()) { toast.error('Ingresa un nombre para la cuenta'); return }
    setSaving(true)
    const { error } = await supabase.from('cuentas_bancarias').insert({
      store_id:      storeId,
      nombre:        form.nombre.trim(),
      banco:         form.banco,
      tipo:          form.tipo,
      numero:        form.numero.trim() || null,
      saldo_inicial: parseInt(form.saldo_inicial) || 0,
    })
    setSaving(false)
    if (error) { toast.error('Error: ' + error.message); return }
    toast.success('Cuenta creada correctamente')
    setOpen(false)
    setForm({ nombre: '', banco: 'BancoEstado', tipo: 'corriente', numero: '', saldo_inicial: '' })
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
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4" onClick={e => e.stopPropagation()}>
            <h3 className="font-bold text-gray-900 text-lg">Nueva cuenta bancaria</h3>

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nombre de la cuenta *</label>
                <input
                  value={form.nombre}
                  onChange={e => set('nombre', e.target.value)}
                  placeholder="Ej: Cuenta Corriente BCI"
                  className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Banco</label>
                  <select
                    value={form.banco}
                    onChange={e => set('banco', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    {BANCOS.map(b => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Tipo</label>
                  <select
                    value={form.tipo}
                    onChange={e => set('tipo', e.target.value)}
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="corriente">Cta. Corriente</option>
                    <option value="vista">Cta. Vista</option>
                    <option value="ahorro">Cta. Ahorro</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">N° de cuenta</label>
                  <input
                    value={form.numero}
                    onChange={e => set('numero', e.target.value)}
                    placeholder="Últimos 4 dígitos"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Saldo inicial (CLP)</label>
                  <input
                    type="number"
                    value={form.saldo_inicial}
                    onChange={e => set('saldo_inicial', e.target.value)}
                    placeholder="0"
                    className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={guardar}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Crear cuenta'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
