'use client'

import { useChat } from '@ai-sdk/react'
import { useEffect, useRef, useState } from 'react'
import { MessageCircle, X, Send, Bot, Loader2 } from 'lucide-react'

interface Props {
  context: 'landing' | 'app'
  accentColor?: string
  bgColor?: string
  welcomeMessage?: string
  placeholder?: string
}

export default function ChatWidget({
  context,
  accentColor = '#FF7A1A',
  bgColor = '#101B26',
  welcomeMessage = '¡Hola! ¿En qué puedo ayudarte?',
  placeholder = 'Escribe tu pregunta…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [hasNew, setHasNew] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const { messages, input, handleInputChange, handleSubmit, isLoading, error } = useChat({
    api: '/api/chat',
    body: { context },

    initialMessages: [
      {
        id: 'welcome',
        role: 'assistant',
        content: welcomeMessage,
      },
    ],
  })

  // Scroll al último mensaje
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    if (!open && messages.length > 1) setHasNew(true)
  }, [messages, open])

  useEffect(() => {
    if (open) {
      setHasNew(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  return (
    <>
      {/* Panel de chat */}
      {open && (
        <div style={{
          position: 'fixed', bottom: 88, right: 24, zIndex: 1000,
          width: 360, maxWidth: 'calc(100vw - 48px)',
          backgroundColor: '#fff',
          borderRadius: 20,
          boxShadow: '0 8px 48px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          maxHeight: 'calc(100vh - 140px)',
          animation: 'chatIn 0.22s ease',
        }}>
          {/* Header */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 18px',
            backgroundColor: bgColor,
            flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%',
                backgroundColor: accentColor,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
              }}>
                <Bot size={18} color="#fff" strokeWidth={1.8} />
              </div>
              <div>
                <p style={{ color: '#fff', fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.2 }}>Asistente Kaltor</p>
                <p style={{ color: '#fff', fontSize: 11, opacity: 0.55, margin: 0 }}>
                  {context === 'app' ? 'Soporte del sistema' : 'Información y ventas'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: '#fff', opacity: 0.6, display: 'flex' }}
            >
              <X size={18} />
            </button>
          </div>

          {/* Mensajes */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map(m => (
              <div key={m.id} style={{
                display: 'flex',
                justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              }}>
                <div style={{
                  maxWidth: '82%',
                  padding: '10px 13px',
                  borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                  backgroundColor: m.role === 'user' ? accentColor : '#f3f4f6',
                  color: m.role === 'user' ? '#fff' : '#1a1a1a',
                  fontSize: 13.5, lineHeight: 1.55,
                  whiteSpace: 'pre-wrap',
                }}>
                  {m.content}
                </div>
              </div>
            ))}

            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '10px 14px',
                  borderRadius: '16px 16px 16px 4px',
                  backgroundColor: '#f3f4f6',
                  display: 'flex', gap: 5, alignItems: 'center',
                }}>
                  {[0, 1, 2].map(i => (
                    <span key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      backgroundColor: '#9ca3af',
                      display: 'inline-block',
                      animation: `chatDot 1.2s ease-in-out ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', opacity: 0.8 }}>
                Ocurrió un error. Intenta de nuevo.
              </p>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={handleSubmit}
            style={{
              display: 'flex', gap: 8, padding: '12px 14px',
              borderTop: '1px solid #f0f0f0',
              flexShrink: 0,
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder={placeholder}
              disabled={isLoading}
              style={{
                flex: 1, padding: '9px 13px',
                borderRadius: 10, border: '1.5px solid #e5e7eb',
                fontSize: 13, outline: 'none',
                backgroundColor: isLoading ? '#f9fafb' : '#fff',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => (e.target.style.borderColor = accentColor)}
              onBlur={e => (e.target.style.borderColor = '#e5e7eb')}
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              style={{
                width: 38, height: 38, borderRadius: 10, border: 'none', cursor: 'pointer',
                backgroundColor: input.trim() && !isLoading ? accentColor : '#e5e7eb',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'background-color 0.2s',
              }}
            >
              {isLoading
                ? <Loader2 size={16} color="#fff" style={{ animation: 'spin 1s linear infinite' }} />
                : <Send size={15} color={input.trim() ? '#fff' : '#9ca3af'} />
              }
            </button>
          </form>
        </div>
      )}

      {/* Botón flotante */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          position: 'fixed', bottom: 24, right: 24, zIndex: 1000,
          width: 56, height: 56, borderRadius: '50%',
          backgroundColor: open ? bgColor : accentColor,
          border: 'none', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.22)',
          transition: 'all 0.25s ease',
          transform: open ? 'scale(0.92)' : 'scale(1)',
        }}
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1.08)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
      >
        {open
          ? <X size={22} color="#fff" />
          : <MessageCircle size={22} color="#fff" />
        }
        {hasNew && !open && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 10, height: 10, borderRadius: '50%',
            backgroundColor: '#22c55e',
            border: '2px solid #fff',
          }} />
        )}
      </button>

      <style>{`
        @keyframes chatIn {
          from { opacity: 0; transform: translateY(12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes chatDot {
          0%, 80%, 100% { transform: scale(0.7); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </>
  )
}
