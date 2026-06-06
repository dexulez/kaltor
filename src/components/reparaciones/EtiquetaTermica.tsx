'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import QRCode from 'react-qr-code'
import QRCodeLib from 'qrcode'

interface EtiquetaProps {
  ot: {
    id: string
    numero_ot: string
    codigo_seguimiento: string
    created_at: string
    fecha_estimada_entrega?: string | null
    estado: string
    precio_servicio?: number | null
    presupuesto_estimado?: number | null
  }
  cliente: { nombre: string; telefono: string }
  equipo: { tipo_equipo?: string | null; marca: string; modelo: string; falla_reportada?: string | null }
  config: { nombre_local: string; telefono?: string | null }
  baseUrl: string
}

function formatFecha(fecha: string) {
  return new Date(fecha.includes('T') ? fecha : fecha + 'T00:00:00').toLocaleDateString('es-CL', {
    day: '2-digit', month: '2-digit', year: 'numeric'
  })
}

function formatMonto(n?: number | null) {
  if (!n) return null
  return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(n)
}

function LabelPreview({ ot, cliente, equipo, config, baseUrl, ancho }: EtiquetaProps & { ancho: 57 | 80 }) {
  const trackingUrl = `${baseUrl}/reparaciones/${ot.id}`
  const labelWidth = ancho === 57 ? '54mm' : '76mm'
  const qrSize = ancho === 57 ? 80 : 110
  const monto = formatMonto(ot.precio_servicio ?? ot.presupuesto_estimado)

  return (
    <div
      style={{
        width: labelWidth,
        fontFamily: 'monospace',
        fontSize: ancho === 57 ? '7pt' : '8pt',
        lineHeight: 1.3,
        padding: '2mm',
        background: '#fff',
        color: '#000',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: ancho === 57 ? '9pt' : '11pt', borderBottom: '1px solid #000', paddingBottom: '1mm', marginBottom: '1.5mm' }}>
        {config.nombre_local}
      </div>
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: ancho === 57 ? '14pt' : '16pt', letterSpacing: '0.5mm', marginBottom: '1.5mm' }}>
        {ot.numero_ot}
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5mm' }}>
        <QRCode value={trackingUrl} size={qrSize} level="M" />
      </div>
      <div style={{ borderBottom: '1px dashed #555', marginBottom: '1.5mm' }} />
      <div style={{ marginBottom: '1mm' }}><span style={{ fontWeight: 'bold' }}>CLIENTE: </span>{cliente.nombre}</div>
      <div style={{ marginBottom: '1.5mm' }}><span style={{ fontWeight: 'bold' }}>TEL: </span>{cliente.telefono}</div>
      <div style={{ marginBottom: '1mm' }}><span style={{ fontWeight: 'bold' }}>EQUIPO: </span>{[equipo.marca, equipo.modelo].filter(Boolean).join(' ')}</div>
      {equipo.falla_reportada && (
        <div style={{ marginBottom: '1.5mm', wordBreak: 'break-word' }}>
          <span style={{ fontWeight: 'bold' }}>FALLA: </span>
          {equipo.falla_reportada.slice(0, ancho === 57 ? 60 : 90)}
        </div>
      )}
      <div style={{ borderBottom: '1px dashed #555', marginBottom: '1.5mm' }} />
      <div style={{ marginBottom: '1mm' }}><span style={{ fontWeight: 'bold' }}>RECIBIDO: </span>{formatFecha(ot.created_at)}</div>
      {ot.fecha_estimada_entrega && (
        <div style={{ marginBottom: '1mm' }}><span style={{ fontWeight: 'bold' }}>ENTREGA EST.: </span><span style={{ fontWeight: 'bold' }}>{formatFecha(ot.fecha_estimada_entrega)}</span></div>
      )}
      {monto && (
        <div style={{ marginBottom: '1mm' }}><span style={{ fontWeight: 'bold' }}>VALOR: </span><span style={{ fontWeight: 'bold' }}>{monto}</span></div>
      )}
      <div style={{ borderTop: '1px solid #000', marginTop: '1.5mm', paddingTop: '1mm', textAlign: 'center' }}>
        <div style={{ fontSize: '6pt', color: '#444' }}>Escanear para abrir OT en sistema</div>
      </div>
    </div>
  )
}

export default function EtiquetaTermica({ ot, cliente, equipo, config, baseUrl }: EtiquetaProps) {
  const [open, setOpen] = useState(false)
  const [ancho, setAncho] = useState<57 | 80>(57)
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [imprimiendo, setImprimiendo] = useState(false)

  const trackingUrl = `${baseUrl}/reparaciones/${ot.id}`

  // Generar QR como PNG cada vez que cambia el ancho o se abre el modal
  useEffect(() => {
    if (!open) return
    const size = ancho === 57 ? 160 : 220
    QRCodeLib.toDataURL(trackingUrl, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }).then(setQrDataUrl).catch(() => setQrDataUrl(''))
  }, [open, ancho, trackingUrl])

  async function imprimir() {
    if (!qrDataUrl) return
    setImprimiendo(true)

    const monto = formatMonto(ot.precio_servicio ?? ot.presupuesto_estimado)
    const labelWidth = ancho === 57 ? '54mm' : '76mm'
    const qrSize = ancho === 57 ? 160 : 220
    const fontSize = ancho === 57 ? '7pt' : '8pt'
    const titleSize = ancho === 57 ? '9pt' : '11pt'
    const otSize = ancho === 57 ? '14pt' : '16pt'
    const falla = equipo.falla_reportada?.slice(0, ancho === 57 ? 60 : 90) ?? ''
    const equipo_str = [equipo.marca, equipo.modelo].filter(Boolean).join(' ')

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>${ot.numero_ot}</title>
<style>
  @page { size: ${ancho}mm auto; margin: 0; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #fff; width: 100%; }
</style>
</head>
<body>
<div style="width:100%;font-family:monospace;font-size:${fontSize};line-height:1.3;padding:2mm;background:#fff;color:#000;">
  <div style="text-align:center;font-weight:bold;font-size:${titleSize};border-bottom:1px solid #000;padding-bottom:1mm;margin-bottom:1.5mm;">${config.nombre_local}</div>
  <div style="text-align:center;font-weight:bold;font-size:${otSize};letter-spacing:0.5mm;margin-bottom:1.5mm;">${ot.numero_ot}</div>
  <div style="display:flex;justify-content:center;margin-bottom:1.5mm;">
    <img src="${qrDataUrl}" style="display:block;width:${qrSize}px;height:${qrSize}px;max-width:90%;" />
  </div>
  <div style="border-bottom:1px dashed #555;margin-bottom:1.5mm;"></div>
  <div style="margin-bottom:1mm;"><strong>CLIENTE: </strong>${cliente.nombre}</div>
  <div style="margin-bottom:1.5mm;"><strong>TEL: </strong>${cliente.telefono}</div>
  <div style="margin-bottom:1mm;"><strong>EQUIPO: </strong>${equipo_str}</div>
  ${falla ? `<div style="margin-bottom:1.5mm;word-break:break-word;"><strong>FALLA: </strong>${falla}</div>` : ''}
  <div style="border-bottom:1px dashed #555;margin-bottom:1.5mm;"></div>
  <div style="margin-bottom:1mm;"><strong>RECIBIDO: </strong>${formatFecha(ot.created_at)}</div>
  ${ot.fecha_estimada_entrega ? `<div style="margin-bottom:1mm;"><strong>ENTREGA EST.: </strong><strong>${formatFecha(ot.fecha_estimada_entrega)}</strong></div>` : ''}
  ${monto ? `<div style="margin-bottom:1mm;"><strong>VALOR: </strong><strong>${monto}</strong></div>` : ''}
  <div style="border-top:1px solid #000;margin-top:1.5mm;padding-top:1mm;text-align:center;">
    <div style="font-size:6pt;color:#444;">Escanear para abrir OT en sistema</div>
  </div>
</div>
</body>
</html>`

    try {
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const ventana = window.open(url, '_blank')
      if (!ventana) {
        alert('Permite ventanas emergentes para imprimir')
        URL.revokeObjectURL(url)
        setImprimiendo(false)
        return
      }
      ventana.addEventListener('load', () => {
        setTimeout(() => {
          ventana.focus()
          ventana.print()
          URL.revokeObjectURL(url)
        }, 300)
      })
    } finally {
      setImprimiendo(false)
    }
  }

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)} className="gap-1.5 border-gray-300 text-gray-600 hover:bg-gray-50">
        🏷️ Imprimir etiqueta
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setOpen(false)}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900">Imprimir etiqueta térmica</h3>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-3 border-b bg-gray-50 flex items-center gap-3">
          <span className="text-sm font-medium text-gray-600">Ancho impresora:</span>
          {([57, 80] as const).map(w => (
            <button
              key={w}
              onClick={() => setAncho(w)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${ancho === w ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-100'}`}
            >
              {w}mm
            </button>
          ))}
        </div>

        <div className="p-5 overflow-auto max-h-[60vh]">
          <p className="text-xs text-gray-400 mb-3 text-center">Vista previa — tamaño aproximado</p>
          <div className="flex justify-center">
            <div className="border-2 border-dashed border-gray-300 bg-white shadow-sm" style={{ display: 'inline-block' }}>
              <LabelPreview
                ot={ot}
                cliente={cliente}
                equipo={equipo}
                config={config}
                baseUrl={baseUrl}
                ancho={ancho}
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50 gap-3">
          <p className="text-xs text-gray-400">
            Impresora térmica {ancho}mm · El QR abre la OT en el sistema
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button
              size="sm"
              onClick={imprimir}
              disabled={!qrDataUrl || imprimiendo}
              className="bg-blue-600 hover:bg-blue-700 gap-1.5"
            >
              {imprimiendo ? '⏳ Preparando...' : '🖨️ Imprimir'}
            </Button>
          </div>
        </div>

      </div>
    </div>
  )
}
