import { createServiceClient } from '@/lib/supabase/server'

/**
 * Envío de WhatsApp para usar desde API routes (server-side).
 * No usar desde componentes cliente — usar `enviarWA` de `@/lib/whatsapp` para eso.
 */
export async function enviarWAServer(telefono: string | null | undefined, mensaje: string): Promise<void> {
  if (!telefono) return
  try {
    const supabase = createServiceClient()
    const { data: cfg } = await supabase
      .from('system_config')
      .select('wa_url, wa_apikey, wa_instancia, wa_activo')
      .single()

    if (!cfg?.wa_activo || !cfg.wa_url || !cfg.wa_apikey) return

    const numero = telefono.replace(/\D/g, '')
    await fetch(`${cfg.wa_url}/message/sendText/${cfg.wa_instancia ?? 'default'}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: cfg.wa_apikey },
      body: JSON.stringify({ number: numero, text: mensaje }),
      signal: AbortSignal.timeout(8000),
    })
  } catch { /* silently fail — WA es secundario */ }
}
