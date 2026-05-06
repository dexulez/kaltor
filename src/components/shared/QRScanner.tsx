'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

// ── Tipos BarcodeDetector (Chrome/Android/Edge) ───────────────────────────────
interface DetectedBarcode { rawValue: string }
interface BarcodeDetectorInstance {
  detect(src: HTMLVideoElement | HTMLCanvasElement): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new(opts: { formats: string[] }) => BarcodeDetectorInstance

const BD_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'itf', 'data_matrix', 'aztec',
]

interface Props {
  onScan: (value: string) => void
  onClose: () => void
  hint?: string
}

// Dibuja un frame de video en un canvas e invierte los colores.
// Necesario para barcodes blancos sobre fondos de color (Xiaomi, Sony, etc.)
function invertirFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
) {
  const w = video.videoWidth
  const h = video.videoHeight
  if (!w || !h) return false
  if (canvas.width !== w) { canvas.width = w; canvas.height = h }
  ctx.drawImage(video, 0, 0)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    d[i]     = 255 - d[i]
    d[i + 1] = 255 - d[i + 1]
    d[i + 2] = 255 - d[i + 2]
    // alpha sin cambio
  }
  ctx.putImageData(img, 0, 0)
  return true
}

export default function QRScanner({ onScan, onClose, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<'iniciando' | 'listo' | 'error'>('iniciando')
  const [mensajeError, setMensajeError] = useState('')

  useEffect(() => {
    let active = true
    let stream: MediaStream | null = null

    async function startStream() {
      stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width:  { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720  },
        },
      })
      if (!active) { stream.getTracks().forEach(t => t.stop()); return null }
      const video = videoRef.current!
      video.srcObject = stream
      await video.play()
      return video
    }

    // ── Motor 1: BarcodeDetector nativo (Chrome, Edge, Android) ──────────────
    // Intenta frame normal cada tick; frame invertido cada 4 ticks
    async function startNative() {
      const BDClass = (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      if (!BDClass) return false

      const video = await startStream()
      if (!video) return true
      setEstado('listo')

      const detector = new BDClass({ formats: BD_FORMATS })
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      let tick = 0

      async function loop() {
        if (!active || !video) return
        if (video.readyState >= 2) {
          try {
            // Frame normal
            const hits = await detector.detect(video)
            if (!active) return
            if (hits.length > 0) {
              active = false
              stream?.getTracks().forEach(t => t.stop())
              onScan(hits[0].rawValue)
              return
            }
          } catch { /* sin código */ }

          // Frame invertido (cada 4 ticks ≈ ~240ms)
          tick++
          if (active && tick % 4 === 0 && ctx) {
            if (invertirFrame(video, canvas, ctx)) {
              try {
                const hits = await detector.detect(canvas)
                if (!active) return
                if (hits.length > 0) {
                  active = false
                  stream?.getTracks().forEach(t => t.stop())
                  onScan(hits[0].rawValue)
                  return
                }
              } catch { /* sin código */ }
            }
          }
        }
        if (active) requestAnimationFrame(loop)
      }

      loop()
      return true
    }

    // ── Motor 2: ZXing manual con canvas (iOS Safari, Firefox) ───────────────
    // Usa decodeFromCanvas para poder intentar frame normal e invertido
    async function startZXing() {
      const [{ BrowserMultiFormatReader }, { DecodeHintType, BarcodeFormat }] = await Promise.all([
        import('@zxing/browser'),
        import('@zxing/library'),
      ])

      const hints = new Map()
      hints.set(DecodeHintType.TRY_HARDER, true)
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13,
        BarcodeFormat.EAN_8,
        BarcodeFormat.UPC_A,
        BarcodeFormat.UPC_E,
        BarcodeFormat.CODE_128,
        BarcodeFormat.CODE_39,
        BarcodeFormat.CODE_93,
        BarcodeFormat.ITF,
        BarcodeFormat.QR_CODE,
        BarcodeFormat.DATA_MATRIX,
        BarcodeFormat.AZTEC,
      ])

      const video = await startStream()
      if (!video) return
      setEstado('listo')

      const reader = new BrowserMultiFormatReader(hints)
      const canvas = document.createElement('canvas')
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      if (!ctx) return

      let tick = 0

      function loop() {
        if (!active || !video) return
        if (video.readyState >= 2 && video.videoWidth > 0) {
          const w = video.videoWidth
          const h = video.videoHeight
          if (canvas.width !== w) { canvas.width = w; canvas.height = h }

          // Intento 1: frame normal
          ctx.drawImage(video, 0, 0)
          try {
            const result = reader.decodeFromCanvas(canvas)
            if (active) {
              active = false
              stream?.getTracks().forEach(t => t.stop())
              onScan(result.getText())
              return
            }
          } catch { /* NotFoundException — sin código en este frame */ }

          // Intento 2: frame invertido cada 2 ticks
          tick++
          if (active && tick % 2 === 0) {
            if (invertirFrame(video, canvas, ctx)) {
              try {
                const result = reader.decodeFromCanvas(canvas)
                if (active) {
                  active = false
                  stream?.getTracks().forEach(t => t.stop())
                  onScan(result.getText())
                  return
                }
              } catch { /* sin código */ }
            }
          }
        }
        if (active) requestAnimationFrame(loop)
      }

      loop()
    }

    async function init() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          setEstado('error')
          setMensajeError('Cámara no disponible. Abre la app directamente en Safari o Chrome.')
          return
        }
        const nativeOk = await startNative()
        if (!nativeOk) await startZXing()
      } catch (e) {
        if (!active) return
        const msg = e instanceof Error ? e.message : ''
        if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
          setMensajeError('Permiso de cámara denegado. Ve a Ajustes → Safari → Cámara → Permitir.')
        } else {
          setMensajeError('No se pudo iniciar la cámara. Intenta recargar la página.')
        }
        setEstado('error')
      }
    }

    init()
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()) }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">

        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <p className="font-semibold text-gray-800 text-sm">📷 Escanear código</p>
            <p className="text-xs text-gray-500">{hint ?? 'EAN-13, Code 128, QR, UPC…'}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-lg"
          >✕</button>
        </div>

        {estado === 'error' ? (
          <div className="p-8 text-center space-y-3">
            <p className="text-5xl">📷</p>
            <p className="text-sm text-red-600 font-medium">{mensajeError}</p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 text-left space-y-1">
              <p className="font-semibold">En iPhone:</p>
              <p>• Abre en <strong>Safari</strong> o <strong>Chrome para iOS</strong></p>
              <p>• <strong>Ajustes → Safari → Cámara → Permitir</strong></p>
            </div>
            <Button variant="outline" onClick={onClose} className="mt-2 w-full">Cerrar</Button>
          </div>
        ) : (
          <div className="relative bg-black">
            <video
              ref={videoRef}
              className="w-full"
              style={{ aspectRatio: '16/9' }}
              muted
              playsInline
              autoPlay
            />

            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="relative"
                  style={{
                    width: '90%',
                    height: '32%',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                  }}
                >
                  <div className="absolute top-0 left-0 w-7 h-7 border-t-[5px] border-l-[5px] border-white rounded-tl" />
                  <div className="absolute top-0 right-0 w-7 h-7 border-t-[5px] border-r-[5px] border-white rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[5px] border-l-[5px] border-white rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[5px] border-r-[5px] border-white rounded-br" />
                  {estado === 'listo' && (
                    <div className="absolute top-1/2 left-3 right-3 h-[2px] bg-red-500 opacity-90 animate-pulse" />
                  )}
                  <p className="absolute -bottom-6 left-0 right-0 text-center text-white text-[10px] opacity-70">
                    Centra el código de barras aquí
                  </p>
                </div>
              </div>
            </div>

            {estado === 'iniciando' && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
                <div className="text-center text-white space-y-2">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm">Iniciando cámara…</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50 border-t text-center space-y-0.5">
          <p className="text-xs text-gray-500 font-medium">
            Mantén el teléfono <strong>horizontal</strong> frente al código
          </p>
          <p className="text-[10px] text-gray-400">
            Soporta barcodes normales e <strong>invertidos</strong> (blancos en fondo de color)
          </p>
        </div>
      </div>
    </div>
  )
}
