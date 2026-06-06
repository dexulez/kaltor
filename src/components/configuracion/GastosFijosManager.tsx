'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { formatCLP } from '@/lib/calculations'

// ── Tasas legales Chile ──────────────────────────────────────────────────────
const CESANTIA_EMPLEADOR = 2.4   // % que paga el empleador
const SIS_EMPLEADOR = 1.49       // Seguro invalidez y sobrevivencia
const MUTUAL_EMPLEADOR = 0.93    // Mutualidad accidentes (mínimo)
const TOTAL_CARGA_EMPLEADOR = CESANTIA_EMPLEADOR + SIS_EMPLEADOR + MUTUAL_EMPLEADOR

// Costo total empresa = sueldo × (1 + 4.82%)
function costoEmpresa(sueldo: number): number {
  return Math.round(sueldo * (1 + TOTAL_CARGA_EMPLEADOR / 100))
}
// Sueldo líquido estimado (AFP ~10.58% + Salud 7% + Cesantía 0.6%)
function sueldoLiquido(sueldo: number, afp: number, salud: number): number {
  const descuentos = afp + salud + 0.6
  return Math.round(sueldo * (1 - descuentos / 100))
}

interface GastoFijo { id: string; nombre: string; categoria: string; monto: number; activo: boolean }
interface GastoExtra { id: string; nombre: string; categoria: string; monto: number; fecha: string; nota: string | null }
interface Empleado { id: string; nombre: string; cargo: string | null; sueldo_base: number; tasa_afp: number; tasa_salud: number; tiene_comision: boolean; comision_pct: number; activo: boolean }

const CATEGORIAS = ['Arriendo', 'Luz', 'Agua', 'Teléfono', 'Internet', 'Contaduría', 'Seguros', 'Transporte', 'Marketing', 'Otro']
const CATEGORIAS_EXTRA = ['Compras extra', 'Reparación local', 'Transporte', 'Alimentación', 'Papelería', 'Publicidad', 'Otro']

export default function GastosFijosManager() {
  const supabase = createClient()
  const [gastos, setGastos] = useState<GastoFijo[]>([])
  const [extras, setExtras] = useState<GastoExtra[]>([])
  const [empleados, setEmpleados] = useState<Empleado[]>([])
  const [loading, setLoading] = useState(true)
  const [mesExtras, setMesExtras] = useState(() => new Date().toISOString().slice(0, 7))

  // Forms
  const [showGasto, setShowGasto] = useState(false)
  const [showExtra, setShowExtra] = useState(false)
  const [showEmpleado, setShowEmpleado] = useState(false)
  const [gastoForm, setGastoForm] = useState({ nombre: '', categoria: 'Arriendo', monto: '' })
  const [extraForm, setExtraForm] = useState({ nombre: '', categoria: 'Otro', monto: '', fecha: new Date().toISOString().slice(0, 10), nota: '' })
  const [empForm, setEmpForm] = useState({ nombre: '', cargo: '', sueldo_base: '', tasa_afp: '10.58', tasa_salud: '7.0', tiene_comision: false, comision_pct: '0' })
  const [saving, setSaving] = useState(false)

  const cargar = useCallback(async () => {
    const [mesStart, mesEnd] = [`${mesExtras}-01`, `${mesExtras}-31`]
    const [{ data: g }, { data: e }, { data: ex }] = await Promise.all([
      supabase.from('gastos_fijos').select('*').eq('activo', true).order('categoria').order('nombre'),
      supabase.from('empleados_taller').select('*').eq('activo', true).order('nombre'),
      supabase.from('gastos_extras').select('*').gte('fecha', mesStart).lte('fecha', mesEnd).order('fecha', { ascending: false }),
    ])
    setGastos((g ?? []) as GastoFijo[])
    setEmpleados((e ?? []) as Empleado[])
    setExtras((ex ?? []) as GastoExtra[])
    setLoading(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mesExtras])

  useEffect(() => { cargar() }, [cargar])

  async function agregarGasto() {
    if (!gastoForm.nombre.trim() || !gastoForm.monto) return
    setSaving(true)
    const { error } = await supabase.from('gastos_fijos').insert({
      nombre: gastoForm.nombre.trim(),
      categoria: gastoForm.categoria,
      monto: parseInt(gastoForm.monto) || 0,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Gasto agregado')
    setGastoForm({ nombre: '', categoria: 'Arriendo', monto: '' })
    setShowGasto(false)
    setSaving(false)
    cargar()
  }

  async function eliminarGasto(id: string) {
    await supabase.from('gastos_fijos').update({ activo: false }).eq('id', id)
    toast.success('Gasto eliminado')
    cargar()
  }

  async function agregarExtra() {
    if (!extraForm.nombre.trim() || !extraForm.monto) return
    setSaving(true)
    const { error } = await supabase.from('gastos_extras').insert({
      nombre: extraForm.nombre.trim(),
      categoria: extraForm.categoria,
      monto: parseInt(extraForm.monto) || 0,
      fecha: extraForm.fecha,
      nota: extraForm.nota.trim() || null,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Gasto extra registrado')
    setExtraForm({ nombre: '', categoria: 'Otro', monto: '', fecha: new Date().toISOString().slice(0, 10), nota: '' })
    setShowExtra(false)
    setSaving(false)
    cargar()
  }

  async function eliminarExtra(id: string) {
    await supabase.from('gastos_extras').delete().eq('id', id)
    toast.success('Gasto eliminado')
    cargar()
  }

  async function agregarEmpleado() {
    if (!empForm.nombre.trim() || !empForm.sueldo_base) return
    setSaving(true)
    const { error } = await supabase.from('empleados_taller').insert({
      nombre: empForm.nombre.trim(),
      cargo: empForm.cargo.trim() || null,
      sueldo_base: parseInt(empForm.sueldo_base) || 0,
      tasa_afp: parseFloat(empForm.tasa_afp) || 10.58,
      tasa_salud: parseFloat(empForm.tasa_salud) || 7.0,
      tiene_comision: empForm.tiene_comision,
      comision_pct: parseFloat(empForm.comision_pct) || 0,
    })
    if (error) { toast.error(error.message); setSaving(false); return }
    toast.success('Empleado agregado')
    setEmpForm({ nombre: '', cargo: '', sueldo_base: '', tasa_afp: '10.58', tasa_salud: '7.0', tiene_comision: false, comision_pct: '0' })
    setShowEmpleado(false)
    setSaving(false)
    cargar()
  }

  async function eliminarEmpleado(id: string) {
    await supabase.from('empleados_taller').update({ activo: false }).eq('id', id)
    toast.success('Empleado eliminado')
    cargar()
  }

  const totalGastos = gastos.reduce((s, g) => s + g.monto, 0)
  const totalExtrasSum = extras.reduce((s, g) => s + g.monto, 0)
  const totalEmpleados = empleados.reduce((s, e) => s + costoEmpresa(e.sueldo_base), 0)
  const totalGeneral = totalGastos + totalEmpleados

  if (loading) return <div className="p-8 text-center text-gray-400">Cargando...</div>

  return (
    <div className="space-y-6">

      {/* ── Resumen total ────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Gastos fijos operacionales', value: totalGastos, color: 'text-blue-700' },
          { label: `Extras / diarios (${mesExtras})`, value: totalExtrasSum, color: 'text-orange-600' },
          { label: 'Costo total empleados', value: totalEmpleados, color: 'text-purple-700' },
          { label: 'TOTAL COSTOS FIJOS MENSUALES', value: totalGeneral, color: 'text-green-700 text-xl' },
        ].map((item, i) => (
          <div key={i} className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">{item.label}</p>
            <p className={`font-bold mt-1 ${item.color}`}>{formatCLP(item.value)}</p>
          </div>
        ))}
      </div>

      {/* ── Gastos operacionales ─────────────────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
          <div>
            <h2 className="font-semibold text-gray-800">Gastos fijos operacionales</h2>
            <p className="text-xs text-gray-400 mt-0.5">Arriendo, servicios básicos, contaduría, seguros, etc.</p>
          </div>
          <Button size="sm" onClick={() => setShowGasto(s => !s)} className="bg-blue-600 hover:bg-blue-700">
            {showGasto ? '✕ Cancelar' : '+ Agregar gasto'}
          </Button>
        </div>

        {showGasto && (
          <div className="p-4 bg-blue-50 border-b space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input placeholder="Ej: Arriendo local" value={gastoForm.nombre}
                  onChange={e => setGastoForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Categoría</Label>
                <select value={gastoForm.categoria} onChange={e => setGastoForm(f => ({ ...f, categoria: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400">
                  {CATEGORIAS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Monto mensual (CLP)</Label>
                <Input type="number" min={0} placeholder="315000" value={gastoForm.monto}
                  onChange={e => setGastoForm(f => ({ ...f, monto: e.target.value }))} />
              </div>
            </div>
            <Button size="sm" onClick={agregarGasto} disabled={saving} className="bg-blue-600 hover:bg-blue-700">
              {saving ? 'Guardando...' : 'Agregar'}
            </Button>
          </div>
        )}

        {gastos.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Sin gastos fijos registrados</p>
        ) : (
          <div>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Nombre', 'Categoría', 'Monto mensual', ''].map((h, i) => (
                    <th key={i} className={`px-4 py-2 text-xs text-gray-500 font-medium ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {gastos.map(g => (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{g.nombre}</td>
                    <td className="px-4 py-2.5 text-gray-500">{g.categoria}</td>
                    <td className="px-4 py-2.5 text-right font-semibold text-blue-700">{formatCLP(g.monto)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => eliminarGasto(g.id)} className="text-red-400 hover:text-red-600 text-xs">Eliminar</button>
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-50 font-semibold border-t-2">
                  <td colSpan={2} className="px-4 py-2.5 text-gray-700">TOTAL GASTOS OPERACIONALES</td>
                  <td className="px-4 py-2.5 text-right text-blue-700">{formatCLP(totalGastos)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Gastos diarios / extras ──────────────────────────────────── */}
      {(() => {
        const totalExtras = extras.reduce((s, g) => s + g.monto, 0)
        return (
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 bg-orange-50 border-b border-orange-100">
              <div>
                <h2 className="font-semibold text-gray-800">Gastos diarios / extras</h2>
                <p className="text-xs text-gray-400 mt-0.5">Gastos puntuales no recurrentes: reparaciones, compras imprevistas, etc.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={mesExtras}
                  onChange={e => setMesExtras(e.target.value)}
                  className="border rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-orange-400"
                />
                <Button size="sm" onClick={() => setShowExtra(s => !s)} className="bg-orange-500 hover:bg-orange-600">
                  {showExtra ? '✕ Cancelar' : '+ Registrar gasto'}
                </Button>
              </div>
            </div>

            {showExtra && (
              <div className="p-4 bg-orange-50 border-b space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Descripción</Label>
                    <input
                      value={extraForm.nombre}
                      onChange={e => setExtraForm(f => ({ ...f, nombre: e.target.value }))}
                      placeholder="Ej: Cinta adhesiva, traslado..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Categoría</Label>
                    <select value={extraForm.categoria} onChange={e => setExtraForm(f => ({ ...f, categoria: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400">
                      {CATEGORIAS_EXTRA.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Monto (CLP)</Label>
                    <input type="number" min={0} placeholder="5000"
                      value={extraForm.monto} onChange={e => setExtraForm(f => ({ ...f, monto: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Fecha</Label>
                    <input type="date" value={extraForm.fecha}
                      onChange={e => setExtraForm(f => ({ ...f, fecha: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-xs">Nota (opcional)</Label>
                    <input value={extraForm.nota} onChange={e => setExtraForm(f => ({ ...f, nota: e.target.value }))}
                      placeholder="Detalle del gasto..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                  </div>
                </div>
                <Button size="sm" onClick={agregarExtra} disabled={saving} className="bg-orange-500 hover:bg-orange-600">
                  {saving ? 'Guardando...' : 'Registrar'}
                </Button>
              </div>
            )}

            {extras.length === 0 ? (
              <p className="text-center text-gray-400 py-8 text-sm">Sin gastos extras en {mesExtras}</p>
            ) : (
              <div>
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      {['Fecha', 'Descripción', 'Categoría', 'Nota', 'Monto', ''].map((h, i) => (
                        <th key={i} className={`px-4 py-2 text-xs text-gray-500 font-medium ${i < 3 ? 'text-left' : i === 4 ? 'text-right' : ''}`}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {extras.map(g => (
                      <tr key={g.id} className="hover:bg-gray-50">
                        <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">
                          {new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-4 py-2.5 font-medium text-gray-800">{g.nombre}</td>
                        <td className="px-4 py-2.5 text-gray-500">{g.categoria}</td>
                        <td className="px-4 py-2.5 text-gray-400 text-xs">{g.nota ?? '—'}</td>
                        <td className="px-4 py-2.5 text-right font-semibold text-orange-600">{formatCLP(g.monto)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <button onClick={() => eliminarExtra(g.id)} className="text-red-400 hover:text-red-600 text-xs">Eliminar</button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-50 font-semibold border-t-2">
                      <td colSpan={4} className="px-4 py-2.5 text-gray-700">TOTAL EXTRAS {mesExtras}</td>
                      <td className="px-4 py-2.5 text-right text-orange-600">{formatCLP(totalExtras)}</td>
                      <td />
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )
      })()}

      {/* ── Empleados ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 bg-gray-50 border-b">
          <div>
            <h2 className="font-semibold text-gray-800">Empleados y costos laborales</h2>
            <p className="text-xs text-gray-400 mt-0.5">Sueldo bruto + imposiciones legales (Cesantía empleador 2.4% + SIS 1.49% + Mutual 0.93%)</p>
          </div>
          <Button size="sm" onClick={() => setShowEmpleado(s => !s)} className="bg-purple-600 hover:bg-purple-700">
            {showEmpleado ? '✕ Cancelar' : '+ Agregar empleado'}
          </Button>
        </div>

        {showEmpleado && (
          <div className="p-4 bg-purple-50 border-b space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Nombre</Label>
                <Input placeholder="Juan García" value={empForm.nombre}
                  onChange={e => setEmpForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cargo</Label>
                <Input placeholder="Técnico, Vendedor..." value={empForm.cargo}
                  onChange={e => setEmpForm(f => ({ ...f, cargo: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Sueldo base (CLP)</Label>
                <Input type="number" min={0} placeholder="428000" value={empForm.sueldo_base}
                  onChange={e => setEmpForm(f => ({ ...f, sueldo_base: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">AFP trabajador (%)</Label>
                <Input type="number" min={0} max={15} step={0.01} value={empForm.tasa_afp}
                  onChange={e => setEmpForm(f => ({ ...f, tasa_afp: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Salud trabajador (%)</Label>
                <Input type="number" min={0} max={15} step={0.01} value={empForm.tasa_salud}
                  onChange={e => setEmpForm(f => ({ ...f, tasa_salud: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">¿Tiene comisión?</Label>
                <div className="flex items-center gap-2 pt-2">
                  <input type="checkbox" checked={empForm.tiene_comision}
                    onChange={e => setEmpForm(f => ({ ...f, tiene_comision: e.target.checked }))}
                    className="w-4 h-4 accent-purple-600" />
                  <span className="text-sm text-gray-700">Sí, tiene comisión</span>
                </div>
              </div>
              {empForm.tiene_comision && (
                <div className="space-y-1">
                  <Label className="text-xs">Comisión (% sobre ventas)</Label>
                  <Input type="number" min={0} max={100} step={0.1} value={empForm.comision_pct}
                    onChange={e => setEmpForm(f => ({ ...f, comision_pct: e.target.value }))} />
                </div>
              )}
            </div>

            {/* Preview del costo */}
            {empForm.sueldo_base && (
              <div className="bg-white border border-purple-200 rounded-lg p-3 text-xs space-y-1">
                <p className="font-semibold text-purple-700 mb-1">Estimación de costos:</p>
                <div className="grid grid-cols-2 gap-x-4">
                  <span className="text-gray-600">Sueldo bruto:</span>
                  <span className="font-medium">{formatCLP(parseInt(empForm.sueldo_base) || 0)}</span>
                  <span className="text-gray-600">AFP ({empForm.tasa_afp}%) — empleado:</span>
                  <span className="text-red-500">-{formatCLP(Math.round((parseInt(empForm.sueldo_base) || 0) * parseFloat(empForm.tasa_afp) / 100))}</span>
                  <span className="text-gray-600">Salud ({empForm.tasa_salud}%) — empleado:</span>
                  <span className="text-red-500">-{formatCLP(Math.round((parseInt(empForm.sueldo_base) || 0) * parseFloat(empForm.tasa_salud) / 100))}</span>
                  <span className="text-gray-600">Cesantía (0.6%) — empleado:</span>
                  <span className="text-red-500">-{formatCLP(Math.round((parseInt(empForm.sueldo_base) || 0) * 0.006))}</span>
                  <span className="font-medium text-gray-700">Sueldo líquido estimado:</span>
                  <span className="font-bold text-green-700">{formatCLP(sueldoLiquido(parseInt(empForm.sueldo_base) || 0, parseFloat(empForm.tasa_afp), parseFloat(empForm.tasa_salud)))}</span>
                  <span className="text-gray-600">Cesantía (2.4%) — empresa:</span>
                  <span className="text-orange-500">+{formatCLP(Math.round((parseInt(empForm.sueldo_base) || 0) * 0.024))}</span>
                  <span className="text-gray-600">SIS (1.49%) — empresa:</span>
                  <span className="text-orange-500">+{formatCLP(Math.round((parseInt(empForm.sueldo_base) || 0) * 0.0149))}</span>
                  <span className="text-gray-600">Mutual (0.93%) — empresa:</span>
                  <span className="text-orange-500">+{formatCLP(Math.round((parseInt(empForm.sueldo_base) || 0) * 0.0093))}</span>
                  <span className="font-semibold text-purple-700">COSTO TOTAL EMPRESA:</span>
                  <span className="font-bold text-purple-700">{formatCLP(costoEmpresa(parseInt(empForm.sueldo_base) || 0))}</span>
                </div>
              </div>
            )}

            <Button size="sm" onClick={agregarEmpleado} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving ? 'Guardando...' : 'Agregar empleado'}
            </Button>
          </div>
        )}

        {empleados.length === 0 ? (
          <p className="text-center text-gray-400 py-8 text-sm">Sin empleados registrados</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Empleado', 'Cargo', 'Sueldo bruto', 'Desc. empleado', 'Sueldo líquido', 'Carga empresa (4.82%)', 'Costo total empresa', ''].map((h, i) => (
                    <th key={i} className={`px-3 py-2 text-xs text-gray-500 font-medium ${i < 2 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {empleados.map(e => {
                  const descEmpleado = Math.round(e.sueldo_base * (e.tasa_afp + e.tasa_salud + 0.6) / 100)
                  const liquido = e.sueldo_base - descEmpleado
                  const cargaEmpresa = costoEmpresa(e.sueldo_base) - e.sueldo_base
                  return (
                    <tr key={e.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2.5 font-medium text-gray-800">{e.nombre}</td>
                      <td className="px-3 py-2.5 text-gray-500">{e.cargo ?? '—'}</td>
                      <td className="px-3 py-2.5 text-right">{formatCLP(e.sueldo_base)}</td>
                      <td className="px-3 py-2.5 text-right text-red-500">-{formatCLP(descEmpleado)}</td>
                      <td className="px-3 py-2.5 text-right text-green-700 font-medium">{formatCLP(liquido)}</td>
                      <td className="px-3 py-2.5 text-right text-orange-500">+{formatCLP(cargaEmpresa)}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-purple-700">{formatCLP(costoEmpresa(e.sueldo_base))}</td>
                      <td className="px-3 py-2.5 text-right">
                        <button onClick={() => eliminarEmpleado(e.id)} className="text-red-400 hover:text-red-600 text-xs">Eliminar</button>
                      </td>
                    </tr>
                  )
                })}
                <tr className="bg-gray-50 font-semibold border-t-2">
                  <td colSpan={6} className="px-3 py-2.5 text-gray-700">TOTAL COSTO LABORAL</td>
                  <td className="px-3 py-2.5 text-right text-purple-700">{formatCLP(totalEmpleados)}</td>
                  <td />
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Nota legal ───────────────────────────────────────────────── */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3 text-xs text-amber-800 space-y-1">
        <p className="font-semibold">ℹ️ Tasas legales Chile (referenciales)</p>
        <p><strong>Empleado paga:</strong> AFP (variable según AFP, ~10.58% promedio) + Salud 7% (Fonasa/Isapre) + Cesantía 0.6%</p>
        <p><strong>Empleador paga sobre el sueldo:</strong> Cesantía 2.4% + SIS 1.49% + Mutual/ACHS 0.93% = <strong>4.82% adicional</strong></p>
        <p>Estas tasas son referenciales. Consulta con tu contador para tasas exactas según contrato y AFP de cada trabajador.</p>
      </div>
    </div>
  )
}
