'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import QRCode from 'react-qr-code'

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

function LabelContent({ ot, cliente, equipo, config, baseUrl, ancho }: EtiquetaProps & { ancho: 57 | 80 }) {
  const trackingUrl = `${baseUrl}/reparaciones/${ot.id}`
  const labelWidth = ancho === 57 ? '54mm' : '76mm'
  const qrSize = ancho === 57 ? 80 : 110
  const monto = formatMonto(ot.precio_servicio ?? ot.presupuesto_estimado)

  return (
    <div
      id="etiqueta-print"
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
      {/* Nombre del local */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: ancho === 57 ? '9pt' : '11pt', borderBottom: '1px solid #000', paddingBottom: '1mm', marginBottom: '1.5mm' }}>
        {config.nombre_local}
      </div>

      {/* Número OT */}
      <div style={{ textAlign: 'center', fontWeight: 'bold', fontSize: ancho === 57 ? '14pt' : '16pt', letterSpacing: '0.5mm', marginBottom: '1.5mm' }}>
        {ot.numero_ot}
      </div>

      {/* QR centrado */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5mm' }}>
        <QRCode value={trackingUrl} size={qrSize} level="M" />
      </div>

      {/* Línea separadora */}
      <div style={{ borderBottom: '1px dashed #555', marginBottom: '1.5mm' }} />

      {/* Datos cliente */}
      <div style={{ marginBottom: '1mm' }}>
        <span style={{ fontWeight: 'bold' }}>CLIENTE: </span>
        <span>{cliente.nombre}</span>
      </div>
      <div style={{ marginBottom: '1.5mm' }}>
        <span style={{ fontWeight: 'bold' }}>TEL: </span>
        <span>{cliente.telefono}</span>
      </div>

      {/* Datos equipo */}
      <div style={{ marginBottom: '1mm' }}>
        <span style={{ fontWeight: 'bold' }}>EQUIPO: </span>
        <span>{[equipo.marca, equipo.modelo].filter(Boolean).join(' ')}</span>
      </div>
      {equipo.falla_reportada && (
        <div style={{ marginBottom: '1.5mm', wordBreak: 'break-word' }}>
          <span style={{ fontWeight: 'bold' }}>FALLA: </span>
          <span>{equipo.falla_reportada.slice(0, ancho === 57 ? 60 : 90)}</span>
        </div>
      )}

      {/* Línea separadora */}
      <div style={{ borderBottom: '1px dashed #555', marginBottom: '1.5mm' }} />

      {/* Fechas y monto */}
      <div style={{ marginBottom: '1mm' }}>
        <span style={{ fontWeight: 'bold' }}>RECIBIDO: </span>
        <span>{formatFecha(ot.created_at)}</span>
      </div>
      {ot.fecha_estimada_entrega && (
        <div style={{ marginBottom: '1mm' }}>
          <span style={{ fontWeight: 'bold' }}>ENTREGA EST.: </span>
          <span style={{ fontWeight: 'bold' }}>{formatFecha(ot.fecha_estimada_entrega)}</span>
        </div>
      )}
      {monto && (
        <div style={{ marginBottom: '1mm' }}>
          <span style={{ fontWeight: 'bold' }}>VALOR: </span>
          <span style={{ fontWeight: 'bold' }}>{monto}</span>
        </div>
      )}

      {/* Pie de etiqueta */}
      <div style={{ borderTop: '1px solid #000', marginTop: '1.5mm', paddingTop: '1mm', textAlign: 'center' }}>
        <div style={{ fontSize: '6pt', color: '#444' }}>Escanear para abrir OT en sistema</div>
      </div>
    </div>
  )
}

export default function EtiquetaTermica({ ot, cliente, equipo, config, baseUrl }: EtiquetaProps) {
  const [open, setOpen] = useState(false)
  const [ancho, setAncho] = useState<57 | 80>(57)
  const printRef = useRef<HTMLDivElement>(null)

  function imprimir() {
    const contenido = document.getElementById('etiqueta-print')
    if (!contenido) return
    const ventana = window.open('', '_blank', 'width=400,height=600')
    if (!ventana) return
    ventana.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${ot.numero_ot}</title>
        <style>
          @page {
            size: ${ancho}mm auto;
            margin: 0;
          }
          body {
            margin: 0;
            padding: 0;
            background: #fff;
          }
          * { box-sizing: border-box; }
        </style>
      </head>
      <body>
        ${contenido.outerHTML}
      </body>
      </html>
    `)
    ventana.document.close()
    ventana.focus()
    setTimeout(() => {
      ventana.print()
      ventana.close()
    }, 350)
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
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-bold text-gray-900">Imprimir etiqueta térmica</h3>
          <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Selector de ancho */}
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

        {/* Preview */}
        <div className="p-5 overflow-auto max-h-[60vh]">
          <p className="text-xs text-gray-400 mb-3 text-center">Vista previa — tamaño aproximado</p>
          <div className="flex justify-center">
            <div
              ref={printRef}
              className="border-2 border-dashed border-gray-300 bg-white shadow-sm"
              style={{ display: 'inline-block' }}
            >
              <LabelContent
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

        {/* Acciones */}
        <div className="flex items-center justify-between px-5 py-4 border-t bg-gray-50 gap-3">
          <p className="text-xs text-gray-400">
            Impresora térmica {ancho}mm · El QR abre la OT en el sistema
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpen(false)}>Cerrar</Button>
            <Button size="sm" onClick={imprimir} className="bg-blue-600 hover:bg-blue-700 gap-1.5">
              🖨️ Imprimir
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
