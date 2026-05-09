'use client'

// Renderizador simple de Markdown sin dependencias externas
export default function ManualContenido({ contenido }: { contenido: string }) {
  const html = contenido
    // Headings
    .replace(/^### (.+)$/gm, '<h3 class="text-base font-bold text-gray-800 mt-5 mb-2">$1</h3>')
    .replace(/^## (.+)$/gm, '<h2 class="text-lg font-bold text-gray-900 mt-6 mb-2 border-b pb-1">$1</h2>')
    .replace(/^# (.+)$/gm, '<h1 class="text-xl font-bold text-gray-900 mt-6 mb-3">$1</h1>')
    // Bold e italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Código inline
    .replace(/`([^`]+)`/g, '<code class="bg-gray-100 text-red-600 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
    // Bloques de código
    .replace(/```([\s\S]*?)```/g, '<pre class="bg-gray-900 text-green-400 p-4 rounded-xl text-sm font-mono overflow-x-auto my-3 whitespace-pre-wrap">$1</pre>')
    // Listas con -
    .replace(/^- (.+)$/gm, '<li class="ml-4 list-disc text-gray-700">$1</li>')
    .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="my-2 space-y-1">${match}</ul>`)
    // Listas numeradas
    .replace(/^\d+\. (.+)$/gm, '<li class="ml-4 list-decimal text-gray-700">$1</li>')
    // Separador
    .replace(/^---$/gm, '<hr class="my-4 border-gray-200">')
    // Párrafos (líneas que no son otro elemento)
    .replace(/^(?!<[hul]|<hr|<pre)(.+)$/gm, '<p class="text-gray-700 leading-relaxed">$1</p>')
    // Saltos dobles
    .replace(/\n\n/g, '\n')

  return (
    <div
      className="prose-manual text-sm space-y-1"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
