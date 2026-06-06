'use client'

import { useState } from 'react'
import { formatCLP } from '@/lib/calculations'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Props {
  costosFijos: number
  pvPromedio: number
  cvPromedio: number
  ventasActualesPeriodo?: number   // total bruto del período seleccionado
  diasPeriodo?: number             // días del rango seleccionado
}

export default function PuntoEquilibrioCalculator({ costosFijos, pvPromedio, cvPromedio, ventasActualesPeriodo = 0, diasPeriodo = 30 }: Props) {
  const [pv, setPv] = useState(String(pvPromedio || ''))
  const [cv, setCv] = useState(String(cvPromedio || ''))
  const [comision, setComision] = useState('0')
  const [utilidadAI, setUtilidadAI] = useState('')   // antes de impuesto
  const [utilidadDI, setUtilidadDI] = useState('')   // después de impuesto
  const [tasaImp, setTasaImp] = useState('27')        // tasa impuesto Chile 27%

  const CF  = costosFijos
  const PV  = parseFloat(pv) || 0
  const CV  = parseFloat(cv) || 0
  const com = parseFloat(comision) || 0
  const UAI = parseFloat(utilidadAI) || 0
  const UDI = parseFloat(utilidadDI) || 0
  const tasa = parseFloat(tasaImp) || 27

  // a) Margen de contribución
  const mc = PV - CV - (PV * com / 100)

  // b) Razón de contribución
  const Rc = PV > 0 ? mc / PV : 0

  // Proyecciones por período (CF mensual × factor)
  const PERIODOS = [
    { label: 'Diario',     dias: 1,    factor: 1/30 },
    { label: 'Semanal',    dias: 7,    factor: 7/30 },
    { label: 'Mensual',    dias: 30,   factor: 1 },
    { label: 'Trimestral', dias: 90,   factor: 3 },
    { label: 'Anual',      dias: 365,  factor: 12 },
    { label: `Período (${diasPeriodo}d)`, dias: diasPeriodo, factor: diasPeriodo / 30 },
  ]

  // c) Cantidad y ventas de equilibrio
  const Qe = mc > 0 ? CF / mc : 0
  const Ve = Rc > 0 ? CF / Rc : 0

  // d) Cantidad y ventas requeridas (antes de impuesto)
  const Qr_AI = mc > 0 && UAI > 0 ? (CF + UAI) / mc : 0
  const Vr_AI = Rc > 0 && UAI > 0 ? (CF + UAI) / Rc : 0

  // e) Cantidad y ventas requeridas (después de impuesto)
  const UAI_desde_DI = UDI > 0 ? UDI / (1 - tasa / 100) : 0
  const Qr_DI = mc > 0 && UDI > 0 ? (CF + UAI_desde_DI) / mc : 0
  const Vr_DI = Rc > 0 && UDI > 0 ? (CF + UAI_desde_DI) / Rc : 0

  const valido = PV > 0 && CV > 0 && mc > 0 && CF > 0

  return (
    <div className="space-y-5">

      {/* Aviso si no hay costos fijos */}
      {CF === 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded-xl px-5 py-3 text-sm text-amber-800 flex items-center gap-2">
          <span>⚠️</span>
          <span>No tienes gastos fijos registrados. <Link href="/configuracion/gastos-fijos" className="underline font-semibold">Configúralos aquí →</Link></span>
        </div>
      )}

      {/* Inputs */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Parámetros del producto / servicio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label>Precio de venta (PV) — CLP</Label>
            <Input type="number" min={0} value={pv} onChange={e => setPv(e.target.value)}
              placeholder="Ej: 35000" />
            <p className="text-xs text-gray-400">Precio unitario promedio cobrado al cliente</p>
          </div>
          <div className="space-y-1.5">
            <Label>Costo variable (CV) — CLP</Label>
            <Input type="number" min={0} value={cv} onChange={e => setCv(e.target.value)}
              placeholder="Ej: 15000" />
            <p className="text-xs text-gray-400">Costo del repuesto o producto por unidad</p>
          </div>
          <div className="space-y-1.5">
            <Label>Comisión de ventas (%)</Label>
            <Input type="number" min={0} max={100} step={0.1} value={comision}
              onChange={e => setComision(e.target.value)} placeholder="Ej: 12" />
            <p className="text-xs text-gray-400">% sobre PV pagado al vendedor/técnico</p>
          </div>
        </div>

        {/* mc preview */}
        {PV > 0 && (
          <div className="bg-gray-50 rounded-lg px-4 py-3 text-sm">
            <span className="font-medium text-gray-700">Margen de contribución (mc): </span>
            <span className={`font-bold text-lg ${mc > 0 ? 'text-green-700' : 'text-red-600'}`}>{formatCLP(Math.round(mc))}</span>
            <span className="text-gray-400 ml-2 text-xs">= {formatCLP(PV)} − {formatCLP(CV)} − comisión {formatCLP(Math.round(PV * com / 100))}</span>
          </div>
        )}
      </div>

      {/* Resultados de equilibrio */}
      {valido && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-5 py-3">
            <h2 className="font-semibold text-white">Punto de Equilibrio</h2>
            <p className="text-xs text-blue-200">Con costos fijos mensuales de {formatCLP(CF)}</p>
          </div>
          <div className="p-5 space-y-4">
            {/* Fórmulas visuales */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Margen contribución (mc)', formula: 'PV − CV − Comisión', value: formatCLP(Math.round(mc)), color: 'bg-blue-50 border-blue-200 text-blue-700' },
                { label: 'Razón contribución (Rc)', formula: 'mc ÷ PV', value: `${(Rc * 100).toFixed(2)}%`, color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
                { label: 'Cantidad equilibrio (Qe)', formula: 'CF ÷ mc', value: `${Math.ceil(Qe).toLocaleString('es-CL')} unidades`, color: 'bg-amber-50 border-amber-200 text-amber-700' },
                { label: 'Ventas equilibrio (Ve)', formula: 'CF ÷ Rc = Qe × PV', value: formatCLP(Math.round(Ve)), color: 'bg-green-50 border-green-300 text-green-700' },
              ].map((item, i) => (
                <div key={i} className={`rounded-xl border p-4 ${item.color}`}>
                  <p className="text-xs font-medium opacity-70 mb-1">{item.label}</p>
                  <p className="font-mono text-xs opacity-50 mb-2">{item.formula}</p>
                  <p className="font-bold text-lg leading-tight">{item.value}</p>
                </div>
              ))}
            </div>

            {/* Explicación */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-xs text-blue-800 space-y-1">
              <p className="font-semibold">¿Qué significa esto?</p>
              <p>Necesitas vender al menos <strong>{Math.ceil(Qe).toLocaleString('es-CL')} unidades/servicios</strong> al mes para no perder dinero.</p>
              <p>Eso equivale a ingresos de <strong>{formatCLP(Math.round(Ve))}/mes</strong> en punto de equilibrio.</p>
            </div>
          </div>
        </div>
      )}

      {/* Proyecciones por período */}
      {valido && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gray-800 px-5 py-3">
            <h2 className="font-semibold text-white">Proyecciones de ventas por período</h2>
            <p className="text-xs text-gray-400 mt-0.5">Cuánto necesitas vender en cada período para cubrir los costos fijos</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Período', 'CF proporcional', 'Unidades mínimas (Qe)', 'Ventas mínimas (Ve)', ...(ventasActualesPeriodo > 0 ? ['Ventas reales', 'Estado'] : [])].map((h, i) => (
                    <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {PERIODOS.map((p, i) => {
                  const cfP = Math.round(CF * p.factor)
                  const qeP = mc > 0 ? Math.ceil(cfP / mc) : 0
                  const veP = Rc > 0 ? Math.round(cfP / Rc) : 0
                  const esPeriodo = p.dias === diasPeriodo
                  const ventasReales = esPeriodo && ventasActualesPeriodo > 0 ? ventasActualesPeriodo : null
                  const superaEquilibrio = ventasReales !== null && ventasReales >= veP
                  return (
                    <tr key={i} className={`hover:bg-gray-50 ${esPeriodo ? 'bg-blue-50 font-semibold' : ''}`}>
                      <td className="px-4 py-2.5 text-gray-800">
                        {p.label}
                        {esPeriodo && <span className="ml-1.5 text-xs bg-blue-200 text-blue-800 px-1.5 py-0.5 rounded-full font-normal">seleccionado</span>}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatCLP(cfP)}</td>
                      <td className="px-4 py-2.5 text-right text-amber-700">{qeP.toLocaleString('es-CL')} unid.</td>
                      <td className="px-4 py-2.5 text-right text-green-700 font-bold">{formatCLP(veP)}</td>
                      {ventasActualesPeriodo > 0 && (
                        <>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800">
                            {ventasReales !== null ? formatCLP(ventasReales) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            {ventasReales !== null ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${superaEquilibrio ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {superaEquilibrio ? '✓ Sobre equilibrio' : '✕ Bajo equilibrio'}
                              </span>
                            ) : '—'}
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {ventasActualesPeriodo === 0 && (
            <p className="text-xs text-gray-400 px-5 py-2 bg-gray-50 border-t">
              Las ventas reales del período aparecerán automáticamente cuando existan datos de ventas en el rango de fechas seleccionado.
            </p>
          )}
        </div>
      )}

      {/* Cálculo de rentabilidad exigida */}
      {valido && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="bg-gradient-to-r from-green-700 to-green-800 px-5 py-3">
            <h2 className="font-semibold text-white">Cálculo de Rentabilidad Exigida</h2>
            <p className="text-xs text-green-200">¿Cuánto necesito vender para ganar una utilidad objetivo?</p>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label>Utilidad deseada ANTES de impuesto (CLP)</Label>
                <Input type="number" min={0} value={utilidadAI} onChange={e => setUtilidadAI(e.target.value)} placeholder="Ej: 1845000" />
              </div>
              <div className="space-y-1.5">
                <Label>Utilidad deseada DESPUÉS de impuesto (CLP)</Label>
                <Input type="number" min={0} value={utilidadDI} onChange={e => setUtilidadDI(e.target.value)} placeholder="Ej: 2128000" />
              </div>
              <div className="space-y-1.5">
                <Label>Tasa de impuesto (%)</Label>
                <Input type="number" min={0} max={100} step={0.1} value={tasaImp} onChange={e => setTasaImp(e.target.value)} />
                <p className="text-xs text-gray-400">Chile: 27% (Renta 1ª Cat.) o 17% PyME</p>
              </div>
            </div>

            {/* Resultados */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    {['Escenario', 'Fórmula', 'Cantidad requerida (Qr)', 'Ventas requeridas (Vr)'].map((h, i) => (
                      <th key={i} className={`px-4 py-2.5 text-xs text-gray-500 font-medium ${i === 0 ? 'text-left' : 'text-right'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">Solo equilibrio (utilidad = 0)</td>
                    <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">CF ÷ mc</td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700">{Math.ceil(Qe).toLocaleString('es-CL')} unid.</td>
                    <td className="px-4 py-3 text-right font-semibold text-green-700">{formatCLP(Math.round(Ve))}</td>
                  </tr>
                  {UAI > 0 && (
                    <tr className="hover:bg-blue-50 bg-blue-50/30">
                      <td className="px-4 py-3 font-medium text-blue-800">Utilidad {formatCLP(UAI)} antes de impuesto</td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">(CF + UAI) ÷ mc</td>
                      <td className="px-4 py-3 text-right font-semibold text-blue-700">{Math.ceil(Qr_AI).toLocaleString('es-CL')} unid.</td>
                      <td className="px-4 py-3 text-right font-bold text-blue-700">{formatCLP(Math.round(Vr_AI))}</td>
                    </tr>
                  )}
                  {UDI > 0 && (
                    <tr className="hover:bg-green-50 bg-green-50/30">
                      <td className="px-4 py-3 font-medium text-green-800">
                        Utilidad {formatCLP(UDI)} después de impuesto
                        <p className="text-xs text-gray-400 font-normal">UAI equivalente: {formatCLP(Math.round(UAI_desde_DI))}</p>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs text-gray-400">(CF + UAI) ÷ mc</td>
                      <td className="px-4 py-3 text-right font-semibold text-green-700">{Math.ceil(Qr_DI).toLocaleString('es-CL')} unid.</td>
                      <td className="px-4 py-3 text-right font-bold text-green-700">{formatCLP(Math.round(Vr_DI))}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Fórmulas reference */}
            <div className="bg-gray-50 border rounded-xl px-4 py-3 text-xs text-gray-600 space-y-1">
              <p className="font-semibold text-gray-700 mb-1">Fórmulas aplicadas (modelo Costo-Volumen-Utilidad):</p>
              <p><strong>mc</strong> = PV − CV − (PV × comisión%)</p>
              <p><strong>Rc</strong> = mc ÷ PV</p>
              <p><strong>Qe</strong> = CF ÷ mc &nbsp;|&nbsp; <strong>Ve</strong> = CF ÷ Rc = Qe × PV</p>
              <p><strong>Qr</strong> = (CF + Utilidad AI) ÷ mc &nbsp;|&nbsp; <strong>Vr</strong> = (CF + Utilidad AI) ÷ Rc</p>
              <p><strong>Para utilidad después de impuesto:</strong> UAI = UDI ÷ (1 − tasa)</p>
            </div>
          </div>
        </div>
      )}

      {!valido && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-400">
          <p className="text-2xl mb-2">⚖️</p>
          <p className="font-medium text-gray-600">Ingresa el precio de venta y el costo variable para calcular el punto de equilibrio</p>
        </div>
      )}
    </div>
  )
}
