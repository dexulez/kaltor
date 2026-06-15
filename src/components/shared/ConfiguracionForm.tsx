'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type ConfigData = {
  id: string
  nombre_local: string
  rut_local?: string | null
  direccion?: string | null
  telefono?: string | null
  email?: string | null
  whatsapp?: string | null
  logo_url?: string | null
  iva: number
  ppm: number
  comision_debito: number
  comision_credito: number
  comision_transferencia: number
  dias_garantia_default: number
  moneda: string
  mostrar_precio_en_presupuesto: boolean
  terminos_condiciones?: string | null
  costo_insumos_promedio?: number | null
}

const TC_DEFAULT = `• El cliente declara que los datos proporcionados y el equipo entregado, cuyas características están descritas en este documento, es de su propiedad y es totalmente responsable del mismo.
• Todo equipo marcado como RIESGOSO tiene la probabilidad de daño permanente, el cliente acepta el riesgo llegando a un acuerdo mutuo entre las partes.
• Todo equipo MOJADO se considerará tipo de reparación RIESGOSA. Todo equipo MOJADO después de la entrega pierde cualquier garantía.
• Equipos con PANTALLA APAGADA NO TIENEN GARANTÍA, EL CLIENTE ASUME Y AUTORIZA SU REPARACIÓN SIENDO CONSCIENTE DE ESTO.
• En caso de garantía, la empresa no se hace responsable por daños ocasionados por mal uso o imprudencia del cliente.
• Pantallas y Glases NO TIENEN GARANTÍA.
• Las pantallas solo tienen garantía de 30 días si deja de funcionar el táctil, cualquier otro daño no aplica garantía.
• La empresa haber sesenta (60) días después de la fecha de entrega pautada en este documento.
• El cliente declara haber leído estas condiciones y aceptarlas al momento de FIRMAR.
• Documento válido SÓLO si tiene firma de un funcionario y sello de la empresa.`

export default function ConfiguracionForm({ config }: { config: ConfigData }) {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [tcFormat, setTcFormat] = useState<'a5h' | 'a5v' | 'a4'>('a5h')

  const [form, setForm] = useState({
    nombre_local: config.nombre_local,
    rut_local: config.rut_local ?? '',
    direccion: config.direccion ?? '',
    telefono: config.telefono ?? '',
    email: config.email ?? '',
    whatsapp: config.whatsapp ?? '',
    logo_url: config.logo_url ?? '',
    iva: String(config.iva ?? 19),
    ppm: String(config.ppm ?? 3),
    comision_debito: String(config.comision_debito ?? 0),
    comision_credito: String(config.comision_credito ?? 0),
    comision_transferencia: String(config.comision_transferencia ?? 0),
    dias_garantia_default: String(config.dias_garantia_default ?? 30),
    moneda: config.moneda ?? 'CLP',
    mostrar_precio_en_presupuesto: config.mostrar_precio_en_presupuesto,
    mostrar_tecnico_pdf: (config as Record<string, unknown>).mostrar_tecnico_pdf !== false,
    terminos_condiciones: config.terminos_condiciones ?? TC_DEFAULT,
    costo_insumos_promedio: String(config.costo_insumos_promedio ?? 0),
  })

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  async function handleLogoUpload(file: File) {
    if (!file) return
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return }
    if (file.size > 2 * 1024 * 1024) { toast.error('La imagen no puede superar 2 MB'); return }

    setUploadingLogo(true)
    const ext = file.name.split('.').pop()
    const path = `logos/logo_${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('public')
      .upload(path, file, { upsert: true })

    if (uploadError) {
      // Si el bucket no existe, guardar como base64 URL
      const reader = new FileReader()
      reader.onload = e => {
        set('logo_url', e.target?.result as string)
        toast.success('Logo cargado (base64 local)')
      }
      reader.readAsDataURL(file)
      setUploadingLogo(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('public').getPublicUrl(path)
    set('logo_url', publicUrl)
    toast.success('Logo subido correctamente')
    setUploadingLogo(false)
  }

  function handleImprimirTC() {
    const win = window.open('', '_blank', 'width=700,height=900')
    if (!win) { toast.error('Permite popups para imprimir'); return }

    const clausulas = form.terminos_condiciones.split('\n').filter(Boolean)
    const pageCSS = tcFormat === 'a5h'
      ? '@page{size:A5 landscape;margin:10mm}'
      : tcFormat === 'a5v'
      ? '@page{size:A5 portrait;margin:10mm}'
      : '@page{size:A4;margin:12mm}'
    const cols = tcFormat === 'a5v' ? 1 : 2
    const fontSize = tcFormat === 'a4' ? '9pt' : '8.5pt'

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Términos y Condiciones — ${form.nombre_local}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,Helvetica,sans-serif;font-size:${fontSize};color:#111;background:#fff}
  ${pageCSS}
</style>
</head>
<body>
  <div style="display:flex;justify-content:space-between;align-items:flex-start;border-bottom:2px solid #1e3a5f;padding-bottom:3mm;margin-bottom:4mm">
    <div style="display:flex;align-items:center;gap:3mm">
      ${form.logo_url ? `<img src="${form.logo_url}" style="max-height:12mm;max-width:40mm;object-fit:contain" alt="Logo">` : '<span style="font-size:18pt">🔧</span>'}
      <div>
        <div style="font-size:11pt;font-weight:bold">${form.nombre_local}</div>
        ${form.rut_local ? `<div style="font-size:7.5pt">RUT: ${form.rut_local}</div>` : ''}
        ${form.direccion ? `<div style="font-size:7.5pt">${form.direccion}</div>`       : ''}
        ${form.telefono  ? `<div style="font-size:7.5pt">Tel: ${form.telefono}</div>`   : ''}
      </div>
    </div>
    <div style="text-align:right">
      <div style="font-size:7pt;color:#6b7280;text-transform:uppercase;letter-spacing:0.5px">Orden de Trabajo N°</div>
      <div style="font-size:16pt;font-weight:bold;font-family:monospace;color:#1e3a5f;border-bottom:1px solid #9ca3af;min-width:40mm;padding-bottom:1mm">&nbsp;</div>
      <div style="font-size:7pt;color:#9ca3af;margin-top:1mm">Completar al momento de la entrega</div>
    </div>
  </div>

  <div style="text-align:center;font-size:11pt;font-weight:bold;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:4mm;color:#1e3a5f">
    Cláusulas y Condiciones de Servicio
  </div>

  <ol style="line-height:1.6;padding-left:5mm;column-count:${cols};column-gap:8mm;margin:0">
    ${clausulas.map(l => `<li style="margin-bottom:2mm;break-inside:avoid">${l.replace(/^•\s*/, '')}</li>`).join('')}
  </ol>

  <div style="margin-top:6mm;display:flex;gap:16mm;border-top:1px solid #e5e7eb;padding-top:4mm">
    <div style="flex:1;text-align:center">
      <div style="height:14mm;border-bottom:1.5px solid #111;margin-bottom:2mm"></div>
      <div style="font-size:7.5pt;color:#555">Firma y RUT cliente — Acepta las condiciones</div>
    </div>
    <div style="flex:1;text-align:center">
      <div style="height:14mm;border-bottom:1.5px solid #111;margin-bottom:2mm"></div>
      <div style="font-size:7.5pt;color:#555">Firma técnico / Sello empresa</div>
    </div>
  </div>
</body>
</html>`

    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  async function handleSave() {
    if (!config.id) { toast.error('No se encontró configuración'); return }
    setLoading(true)

    const { error } = await supabase.from('system_config').update({
      nombre_local: form.nombre_local.trim(),
      rut_local: form.rut_local.trim() || null,
      direccion: form.direccion.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      logo_url: form.logo_url.trim() || null,
      iva: parseFloat(form.iva) || 0,
      ppm: parseFloat(form.ppm) || 0,
      comision_debito: parseFloat(form.comision_debito) || 0,
      comision_credito: parseFloat(form.comision_credito) || 0,
      comision_transferencia: parseFloat(form.comision_transferencia) || 0,
      dias_garantia_default: parseInt(form.dias_garantia_default) || 0,
      moneda: form.moneda.trim() || 'CLP',
      mostrar_precio_en_presupuesto: form.mostrar_precio_en_presupuesto,
      mostrar_tecnico_pdf: form.mostrar_tecnico_pdf,
      terminos_condiciones: form.terminos_condiciones.trim() || null,
      costo_insumos_promedio: parseInt(form.costo_insumos_promedio) || 0,
    }).eq('id', config.id)

    if (error) {
      // Si falla por columna nueva, reintentar sin ella
      if (error.message.includes('mostrar_tecnico_pdf')) {
        const { error: err2 } = await supabase.from('system_config').update({
          nombre_local: form.nombre_local.trim(), rut_local: form.rut_local.trim() || null,
          direccion: form.direccion.trim() || null, telefono: form.telefono.trim() || null,
          email: form.email.trim() || null, whatsapp: form.whatsapp.trim() || null,
          logo_url: form.logo_url.trim() || null,
          iva: parseFloat(form.iva) || 0, ppm: parseFloat(form.ppm) || 0,
          comision_debito: parseFloat(form.comision_debito) || 0,
          comision_credito: parseFloat(form.comision_credito) || 0,
          comision_transferencia: parseFloat(form.comision_transferencia) || 0,
          dias_garantia_default: parseInt(form.dias_garantia_default) || 0,
          moneda: form.moneda.trim() || 'CLP',
          mostrar_precio_en_presupuesto: form.mostrar_precio_en_presupuesto,
          terminos_condiciones: form.terminos_condiciones.trim() || null,
          costo_insumos_promedio: parseInt(form.costo_insumos_promedio) || 0,
        }).eq('id', config.id)
        if (err2) { toast.error('Error al guardar: ' + err2.message); setLoading(false); return }
      } else {
        toast.error('Error al guardar: ' + error.message); setLoading(false); return
      }
    }

    toast.success('Configuración guardada correctamente')
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="space-y-5">

      {/* Datos del negocio */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Datos del negocio</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Nombre del local</Label>
            <Input value={form.nombre_local} onChange={e => set('nombre_local', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>RUT local</Label>
            <Input value={form.rut_local} onChange={e => set('rut_local', e.target.value)} placeholder="76123456-7" />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label>Dirección</Label>
            <Input value={form.direccion} onChange={e => set('direccion', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Teléfono</Label>
            <Input value={form.telefono} onChange={e => set('telefono', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>WhatsApp</Label>
            <Input value={form.whatsapp} onChange={e => set('whatsapp', e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Moneda</Label>
            <Input value={form.moneda} onChange={e => set('moneda', e.target.value)} />
          </div>
        </div>
      </div>

      {/* Logo */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Logo de la empresa</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Subir imagen (PNG, JPG — máx 2MB)</Label>
              <input
                type="file"
                accept="image/*"
                disabled={uploadingLogo}
                onChange={e => e.target.files?.[0] && handleLogoUpload(e.target.files[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {uploadingLogo && <p className="text-xs text-blue-600 animate-pulse">Subiendo logo...</p>}
            </div>
            <div className="space-y-1.5">
              <Label>O ingresar URL del logo</Label>
              <Input
                value={form.logo_url}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="https://ejemplo.com/logo.png"
              />
            </div>
          </div>
          {form.logo_url && (
            <div className="flex flex-col items-center gap-2">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Vista previa</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={form.logo_url}
                alt="Logo preview"
                className="max-h-24 max-w-full object-contain border rounded-lg p-2 bg-gray-50"
                onError={e => { (e.target as HTMLImageElement).style.display = 'none' }}
              />
              <button onClick={() => set('logo_url', '')} className="text-xs text-red-500 hover:underline">
                Eliminar logo
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Impuestos */}
      <div className="bg-white rounded-xl border p-5 space-y-4">
        <h2 className="font-semibold text-gray-800">Impuestos y comisiones</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5"><Label>IVA (%)</Label><Input type="number" min={0} step="0.01" value={form.iva} onChange={e => set('iva', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>PPM (%)</Label><Input type="number" min={0} step="0.01" value={form.ppm} onChange={e => set('ppm', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Garantía por defecto (días)</Label><Input type="number" min={0} value={form.dias_garantia_default} onChange={e => set('dias_garantia_default', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Comisión débito (%)</Label><Input type="number" min={0} step="0.01" value={form.comision_debito} onChange={e => set('comision_debito', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Comisión crédito (%)</Label><Input type="number" min={0} step="0.01" value={form.comision_credito} onChange={e => set('comision_credito', e.target.value)} /></div>
          <div className="space-y-1.5"><Label>Comisión transferencia (%)</Label><Input type="number" min={0} step="0.01" value={form.comision_transferencia} onChange={e => set('comision_transferencia', e.target.value)} /></div>
          <div className="space-y-1.5">
            <Label>Costo insumos promedio (CLP/OT)</Label>
            <Input type="number" min={0} value={form.costo_insumos_promedio} onChange={e => set('costo_insumos_promedio', e.target.value)} placeholder="0" />
            <p className="text-xs text-gray-400">Se descuenta por OT en cálculo de rentabilidad</p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.mostrar_precio_en_presupuesto} onChange={e => set('mostrar_precio_en_presupuesto', e.target.checked)} />
          Mostrar precio en presupuesto al cliente
        </label>
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" checked={form.mostrar_tecnico_pdf} onChange={e => set('mostrar_tecnico_pdf', e.target.checked)} />
          Mostrar nombre del técnico en el comprobante PDF
        </label>
      </div>

      {/* Términos y condiciones */}
      <div className="bg-white rounded-xl border p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-800">Términos y condiciones</h2>
            <p className="text-xs text-gray-500 mt-0.5">Se imprimen en el comprobante de recepción de equipos</p>
          </div>
          <div className="flex items-center gap-3 shrink-0 flex-wrap justify-end">
            <div className="flex items-center gap-1">
              {(['a5h', 'a5v', 'a4'] as const).map(f => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setTcFormat(f)}
                  className={`px-2.5 py-1 text-xs font-medium rounded border transition-colors ${tcFormat === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400'}`}
                >
                  {f === 'a5h' ? 'A5 Horiz.' : f === 'a5v' ? 'A5 Vert.' : 'A4'}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={handleImprimirTC}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-300 transition-colors"
            >
              🖨️ Imprimir T&C
            </button>
            <button
              type="button"
              onClick={() => set('terminos_condiciones', TC_DEFAULT)}
              className="text-xs text-blue-600 hover:underline"
            >
              Restaurar predeterminado
            </button>
          </div>
        </div>
        <textarea
          value={form.terminos_condiciones}
          onChange={e => set('terminos_condiciones', e.target.value)}
          rows={12}
          className="w-full border rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono leading-relaxed resize-y"
          placeholder="Escribe los términos y condiciones que aparecerán en el comprobante..."
        />
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
          {loading ? 'Guardando...' : 'Guardar configuración'}
        </Button>
      </div>
    </div>
  )
}
