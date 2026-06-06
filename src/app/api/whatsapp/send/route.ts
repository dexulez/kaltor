import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { telefono, mensaje } = await req.json()
    if (!telefono || !mensaje) return NextResponse.json({ ok: false, error: 'Faltan datos' })

    const supabase = createServiceClient()
    const { data: cfg } = await supabase
      .from('system_config')
      .select('wa_url, wa_apikey, wa_instancia, wa_activo')
      .single()

    if (!cfg?.wa_activo || !cfg.wa_url || !cfg.wa_apikey) {
      return NextResponse.json({ ok: false, error: 'WhatsApp no configurado' })
    }

    // Normalizar número: solo dígitos, sin espacios ni +
    const numero = telefono.replace(/\D/g, '')
    const instancia = cfg.wa_instancia ?? 'default'

    const res = await fetch(`${cfg.wa_url}/message/sendText/${instancia}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': cfg.wa_apikey,
      },
      body: JSON.stringify({ number: numero, text: mensaje }),
      signal: AbortSignal.timeout(8000),
    })

    return NextResponse.json({ ok: res.ok, status: res.status })
  } catch {
    return NextResponse.json({ ok: false, error: 'Error de conexión con WhatsApp' })
  }
}
