'use client'

import { useState } from 'react'
import { toast } from 'sonner'

export default function SolicitudAccesoB2BForm() {
  const [enviado, setEnviado] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [form, setForm] = useState({
    nombreTaller: '', rut: '', contactoNombre: '', email: '', telefono: '', mensaje: '',
  })

  function set(campo: keyof typeof form, valor: string) {
    setForm(f => ({ ...f, [campo]: valor }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombreTaller.trim() || !form.email.trim() || !form.telefono.trim()) {
      toast.error('Completa nombre del negocio, email y teléfono')
      return
    }
    setEnviando(true)
    try {
      const res = await fetch('/api/acceso-b2b/solicitar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Error al enviar la solicitud'); return }
      setEnviado(true)
    } catch {
      toast.error('Error de conexión')
    } finally {
      setEnviando(false)
    }
  }

  if (enviado) {
    return (
      <div className="bg-white rounded-xl border shadow-sm p-6 text-center space-y-2">
        <span className="text-4xl block">✅</span>
        <p className="font-bold text-gray-900">¡Solicitud enviada!</p>
        <p className="text-sm text-gray-500">Vamos a revisar tus datos y te contactaremos pronto para activar tu acceso.</p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border shadow-sm p-5 space-y-4">
      <div>
        <h2 className="font-bold text-gray-900">¿Quieres ser cliente B2B?</h2>
        <p className="text-sm text-gray-500">Cuéntanos de tu negocio y te contactaremos para activar tu cuenta.</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Nombre del taller / negocio *</label>
        <input
          value={form.nombreTaller} onChange={e => set('nombreTaller', e.target.value)} required
          placeholder="Ej: Multiphone Repuestos"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">RUT (opcional)</label>
        <input
          value={form.rut} onChange={e => set('rut', e.target.value)}
          placeholder="76.123.456-7"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Nombre de contacto</label>
        <input
          value={form.contactoNombre} onChange={e => set('contactoNombre', e.target.value)}
          placeholder="Tu nombre"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Email *</label>
          <input
            type="email" value={form.email} onChange={e => set('email', e.target.value)} required
            placeholder="contacto@negocio.cl"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-gray-700">Teléfono *</label>
          <input
            value={form.telefono} onChange={e => set('telefono', e.target.value)} required
            placeholder="+56 9 1234 5678"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-gray-700">Mensaje (opcional)</label>
        <textarea
          value={form.mensaje} onChange={e => set('mensaje', e.target.value)} rows={3}
          placeholder="Cuéntanos qué tipo de productos te interesan, volumen estimado, etc."
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>
      <button
        type="submit" disabled={enviando}
        className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
      >
        {enviando ? 'Enviando...' : 'Solicitar acceso'}
      </button>
    </form>
  )
}
