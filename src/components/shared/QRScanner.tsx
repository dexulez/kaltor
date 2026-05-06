'use client'

import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'

interface DetectedBarcode { rawValue: string; format?: string }
interface BarcodeDetectorInstance {
  detect(src: HTMLVideoElement): Promise<DetectedBarcode[]>
}
type BarcodeDetectorCtor = new(opts: { formats: string[] }) => BarcodeDetectorInstance

const SUPPORTED_FORMATS = [
  'qr_code', 'ean_13', 'ean_8', 'upc_a', 'upc_e',
  'code_128', 'code_39', 'code_93', 'itf', 'data_matrix', 'aztec',
]

interface Props {
  onScan: (value: string) => void
  onClose: () => void
  hint?: string
}

export default function QRScanner({ onScan, onClose, hint }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [estado, setEstado] = useState<'iniciando' | 'listo' | 'error'>('iniciando')
  const [mensajeError, setMensajeError] = useState('')

  useEffect(() => {
    let active = true
    let stream: MediaStream | null = null

    const BDClass = (typeof window !== 'undefined')
      ? (window as Window & { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
      : undefined

    if (!BDClass) {
      setEstado('error')
      setMensajeError('Tu navegador no soporta el escáner. Usa Chrome en Android o Edge en PC.')
      return
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (!active) { stream.getTracks().forEach(t => t.stop()); return }
        const video = videoRef.current
        if (!video) return
        video.srcObject = stream
        await video.play()
        setEstado('listo')

        const detector = new BDClass!({ formats: SUPPORTED_FORMATS })

        async function loop() {
          if (!active || !video) return
          if (video.readyState >= 2) {
            try {
              const hits = await detector.detect(video)
              if (!active) return
              if (hits.length > 0) {
                active = false
                stream?.getTracks().forEach(t => t.stop())
                onScan(hits[0].rawValue)
                return
              }
            } catch { /* frame sin código */ }
          }
          if (active) requestAnimationFrame(loop)
        }
        loop()
      } catch {
        if (active) {
          setEstado('error')
          setMensajeError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
        }
      }
    }

    start()
    return () => { active = false; stream?.getTracks().forEach(t => t.stop()) }
  }, [onScan])

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-3">
      <div className="bg-white rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-gray-50">
          <div>
            <p className="font-semibold text-gray-800 text-sm">📷 Escanear código</p>
            <p className="text-xs text-gray-500">{hint ?? 'QR, EAN-13, Code 128, UPC…'}</p>
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
            <p className="text-xs text-gray-400">
              El escáner funciona en Chrome para Android y Edge/Chrome en PC.
            </p>
            <Button variant="outline" onClick={onClose} className="mt-2">Cerrar</Button>
          </div>
        ) : (
          <div className="relative bg-black">
            {/* 4:3 para mejor captura de barcodes horizontales */}
            <video
              ref={videoRef}
              className="w-full"
              style={{ aspectRatio: '4/3' }}
              muted
              playsInline
            />

            {/* Overlay con guía rectangular para barcode */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Oscurecer zonas fuera del área de escaneo */}
              <div className="absolute inset-0 bg-black/50" />
              {/* Ventana limpia rectangular centrada */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div
                  className="relative"
                  style={{
                    width: '80%',
                    height: '25%',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                  }}
                >
                  {/* Esquinas blancas */}
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-white rounded-tl" />
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-white rounded-tr" />
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-white rounded-bl" />
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-white rounded-br" />
                  {/* Línea roja de escaneo */}
                  {estado === 'listo' && (
                    <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500 opacity-90 animate-pulse" />
                  )}
                </div>
              </div>
            </div>

            {estado === 'iniciando' && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="text-center text-white space-y-2">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm animate-pulse">Iniciando cámara...</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50 border-t text-center">
          <p className="text-xs text-gray-500">
            Apunta el código de barras o QR al centro del recuadro
          </p>
        </div>
      </div>
    </div>
  )
}
