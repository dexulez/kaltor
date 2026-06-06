'use client'

import { formatCLP } from '@/lib/calculations'
import { labelTipoEquipo } from '@/lib/tipoEquipo'

const TIPO_LABELS: Record<string, string> = {
  pantalla: 'Pantalla', bateria: 'Batería', placa: 'Placa madre',
  software: 'Software', camara: 'Cámara', conector: 'Conector', otro: 'Otro',
}
const METODO_NOMBRES: Record<string, string> = {
  efectivo: 'Efectivo', transferencia: 'Transferencia bancaria',
  debito: 'Tarjeta débito', credito: 'Tarjeta crédito',
}

export interface ComprobanteData {
  ot: {
    id: string
    numero_ot: string
    codigo_seguimiento: string
    created_at: string
    tipo_reparacion?: string | null
    precio_servicio?: number | null
    diagnostico_tecnico?: string | null
    dias_garantia?: number | null
    metodo_pago?: string | null
    metodo_pago_2?: string | null
    monto_pago_2?: number | null
    descuento?: number | null
    iva_aplicado?: number | null
    customers?: { nombre: string; telefono: string; rut?: string | null; email?: string | null } | null
    equipment?: {
      tipo_equipo?: string | null; marca: string; modelo: string; color?: string | null; capacidad?: string | null
      imei?: string | null; accesorios?: string[]; condicion_visual?: string[]
      falla_reportada: string
    } | null
    repair_items?: Array<{ nombre: string; cantidad: number; precio_costo: number }> | null
    user_profiles?: { nombre_completo: string } | null
  }
  config: {
    nombre_local: string
    rut_local?: string | null
    direccion?: string | null
    telefono?: string | null
    email?: string | null
    logo_url?: string | null
    terminos_condiciones?: string | null
  }
  totalFinal: number
  descuento?: number
}

export default function ComprobanteOT({ ot, config, totalFinal, descuento = 0 }: ComprobanteData) {
  const precioBase = ot.precio_servicio ?? 0
  const repuestosTotal = (ot.repair_items ?? []).reduce((s, i) => s + i.precio_costo * i.cantidad, 0)
  const subtotalBruto = precioBase + repuestosTotal
  const subtotalConDescuento = Math.max(0, subtotalBruto - descuento)
  const ivaImporte = Math.round(subtotalConDescuento - subtotalConDescuento / 1.19)
  const netoImporte = subtotalConDescuento - ivaImporte

  const fecha = new Date(ot.created_at).toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  function handleImprimir() {
    const content = document.getElementById('comprobante-ot-content')?.innerHTML
    if (!content) return

    const win = window.open('', '_blank', 'width=620,height=900')
    if (!win) { alert('Permite popups para imprimir'); return }

    win.document.write(`<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Comprobante ${ot.numero_ot}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8pt; color: #000; background: #fff; }
  @page { size: A5; margin: 6mm; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 2px; vertical-align: top; }
  .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 3mm; margin-bottom: 3mm; }
  .header .empresa { font-size: 11pt; font-weight: bold; }
  .section-title { font-weight: bold; border-bottom: 1px solid #555; margin: 2mm 0 1mm; padding-bottom: 0.5mm; font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.5px; }
  .total-row { border-top: 2px solid #000; margin-top: 1mm; padding-top: 1mm; font-weight: bold; font-size: 10pt; }
  .firmas { display: flex; gap: 8mm; margin-top: 6mm; }
  .firma-box { flex: 1; }
  .firma-line { border-top: 1px solid #000; padding-top: 1mm; text-align: center; font-size: 7pt; }
  .firma-space { height: 12mm; }
  .ot-num { font-size: 9pt; font-weight: bold; color: #1a4e9f; font-family: monospace; }
  .descuento { color: #c0392b; }
  .row-total { display: flex; justify-content: space-between; }
  .text-right { text-align: right; }
  img.logo { max-height: 14mm; max-width: 45mm; display: block; margin: 0 auto 2mm; }
  .qr-section { font-size: 7pt; color: #555; text-align: right; }
  .metodo-pago { margin-top: 1mm; font-size: 8pt; }
</style>
</head>
<body>${content}</body>
</html>`)
    win.document.close()
    setTimeout(() => { win.focus(); win.print(); }, 300)
  }

  return (
    <div>
      {/* Botón imprimir (no se imprime) */}
      <div className="flex gap-3 mb-4 print:hidden">
        <button
          onClick={handleImprimir}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold shadow"
        >
          🖨️ Imprimir comprobante A5
        </button>
      </div>

      {/* Preview del comprobante */}
      <div className="bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden" style={{ maxWidth: '560px' }}>
        <div className="bg-gray-50 px-4 py-2 border-b border-dashed border-gray-300 text-xs text-gray-400 font-medium print:hidden">
          Vista previa — A5 (148×210mm)
        </div>

        <div id="comprobante-ot-content" style={{ padding: '6mm', fontFamily: 'Arial, sans-serif', fontSize: '8pt', color: '#000' }}>

          {/* Header empresa */}
          <div className="header" style={{ textAlign: 'center', borderBottom: '2px solid #000', paddingBottom: '3mm', marginBottom: '3mm' }}>
            {config.logo_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={config.logo_url} alt="Logo" className="logo" />
            )}
            <div className="empresa" style={{ fontSize: '11pt', fontWeight: 'bold' }}>{config.nombre_local}</div>
            {config.rut_local && <div>RUT: {config.rut_local}</div>}
            {config.direccion && <div>{config.direccion}</div>}
            {config.telefono && <div>Tel: {config.telefono}</div>}
            {config.email && <div>{config.email}</div>}
          </div>

          {/* OT + fecha */}
          <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #aaa', paddingBottom: '2mm', marginBottom: '2mm' }}>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '9pt' }}>ORDEN DE TRABAJO</div>
              <div className="ot-num">{ot.numero_ot}</div>
              <div>Fecha: {fecha}</div>
              <div>Garantía: {ot.dias_garantia ?? 30} días</div>
            </div>
            <div className="qr-section">
              <div>Código seguimiento:</div>
              <div style={{ fontFamily: 'monospace', fontSize: '8pt' }}>{ot.codigo_seguimiento}</div>
              {ot.user_profiles?.nombre_completo && (
                <div style={{ marginTop: '2mm' }}>Técnico: {ot.user_profiles.nombre_completo}</div>
              )}
            </div>
          </div>

          {/* Cliente */}
          <div style={{ marginBottom: '2mm' }}>
            <div className="section-title">Cliente</div>
            <table><tbody>
              <tr><td style={{ width: '35%' }}><strong>Nombre:</strong></td><td>{ot.customers?.nombre ?? '—'}</td></tr>
              <tr><td><strong>Teléfono:</strong></td><td>{ot.customers?.telefono ?? '—'}</td></tr>
              {ot.customers?.rut && <tr><td><strong>RUT:</strong></td><td>{ot.customers.rut}</td></tr>}
              {ot.customers?.email && <tr><td><strong>Email:</strong></td><td>{ot.customers.email}</td></tr>}
            </tbody></table>
          </div>

          {/* Equipo */}
          <div style={{ marginBottom: '2mm' }}>
            <div className="section-title">Equipo</div>
            <table><tbody>
              <tr><td style={{ width: '35%' }}><strong>Equipo:</strong></td><td><strong>{[labelTipoEquipo(ot.equipment?.tipo_equipo), ot.equipment?.marca, ot.equipment?.modelo].filter(Boolean).join(' ')}</strong></td></tr>
              {(ot.equipment?.color || ot.equipment?.capacidad) && (
                <tr><td><strong>Características:</strong></td><td>{[ot.equipment?.color, ot.equipment?.capacidad].filter(Boolean).join(' · ')}</td></tr>
              )}
              {ot.equipment?.imei && <tr><td><strong>IMEI:</strong></td><td style={{ fontFamily: 'monospace' }}>{ot.equipment.imei}</td></tr>}
              {ot.equipment?.accesorios?.length ? <tr><td><strong>Accesorios:</strong></td><td>{ot.equipment.accesorios.join(', ')}</td></tr> : null}
              {ot.equipment?.condicion_visual?.length ? <tr><td><strong>Condición:</strong></td><td>{ot.equipment.condicion_visual.join(', ')}</td></tr> : null}
            </tbody></table>
          </div>

          {/* Servicio */}
          <div style={{ marginBottom: '2mm' }}>
            <div className="section-title">Servicio</div>
            <table><tbody>
              <tr><td style={{ width: '35%' }}><strong>Tipo:</strong></td><td>{ot.tipo_reparacion ? (TIPO_LABELS[ot.tipo_reparacion] ?? ot.tipo_reparacion) : '—'}</td></tr>
              <tr><td><strong>Falla:</strong></td><td>{ot.equipment?.falla_reportada ?? '—'}</td></tr>
              {ot.diagnostico_tecnico && <tr><td><strong>Diagnóstico:</strong></td><td>{ot.diagnostico_tecnico}</td></tr>}
            </tbody></table>
          </div>

          {/* Cobro */}
          <div style={{ marginBottom: '2mm' }}>
            <div className="section-title">Detalle de cobro</div>
            <table><tbody>
              <tr>
                <td>Servicio técnico</td>
                <td className="text-right" style={{ textAlign: 'right' }}>{formatCLP(precioBase)}</td>
              </tr>
              {(ot.repair_items ?? []).map((item, i) => (
                <tr key={i}>
                  <td>{item.nombre} × {item.cantidad}</td>
                  <td style={{ textAlign: 'right' }}>{formatCLP(item.precio_costo * item.cantidad)}</td>
                </tr>
              ))}
              {descuento > 0 && (
                <tr className="descuento" style={{ color: '#c0392b' }}>
                  <td>Descuento</td>
                  <td style={{ textAlign: 'right' }}>−{formatCLP(descuento)}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1px solid #ccc' }}>
                <td>Neto</td>
                <td style={{ textAlign: 'right' }}>{formatCLP(netoImporte)}</td>
              </tr>
              <tr>
                <td>IVA 19%</td>
                <td style={{ textAlign: 'right' }}>{formatCLP(ivaImporte)}</td>
              </tr>
            </tbody></table>
            <div className="row-total" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2px solid #000', marginTop: '1mm', paddingTop: '1mm', fontWeight: 'bold', fontSize: '10pt' }}>
              <span>TOTAL</span>
              <span>{formatCLP(totalFinal)}</span>
            </div>
            <div className="metodo-pago">
              <strong>Método de pago:</strong> {METODO_NOMBRES[ot.metodo_pago ?? 'efectivo'] ?? ot.metodo_pago}
              {ot.metodo_pago_2 && ot.monto_pago_2 ? (
                <> + {METODO_NOMBRES[ot.metodo_pago_2] ?? ot.metodo_pago_2} ({formatCLP(ot.monto_pago_2)})</>
              ) : null}
            </div>
          </div>

          {/* Firmas */}
          <div className="firmas" style={{ display: 'flex', gap: '8mm', marginTop: '8mm' }}>
            <div className="firma-box" style={{ flex: 1 }}>
              <div style={{ height: '14mm', borderBottom: '1px solid #000' }} />
              <div className="firma-line" style={{ paddingTop: '1mm', textAlign: 'center', fontSize: '7pt' }}>
                Firma y RUT cliente
              </div>
            </div>
            <div className="firma-box" style={{ flex: 1 }}>
              <div style={{ height: '14mm', borderBottom: '1px solid #000' }} />
              <div className="firma-line" style={{ paddingTop: '1mm', textAlign: 'center', fontSize: '7pt' }}>
                Firma técnico / Sello empresa
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

