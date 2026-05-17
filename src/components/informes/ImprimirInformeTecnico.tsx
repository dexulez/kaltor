'use client'

interface TecResumen {
  nombre: string
  ots: number
  ingresosBruto: number
  ivaTotal: number
  netoTotal: number
  ppm: number
  costoRep: number
  comBanco: number
  comisionTotal: number
  insumos: number
  gananciaGen: number
}

interface Props {
  tecnicos: TecResumen[]
  desde: string
  hasta: string
  nombreLocal: string
}

export default function ImprimirInformeTecnico({ tecnicos, desde, hasta, nombreLocal }: Props) {
  function fmt(n: number) {
    return n.toLocaleString('es-CL', { style: 'currency', currency: 'CLP' })
  }

  function imprimir() {
    const totalBruto = tecnicos.reduce((s, t) => s + t.ingresosBruto, 0)
    const totalNeto  = tecnicos.reduce((s, t) => s + t.netoTotal, 0)
    const totalIva   = tecnicos.reduce((s, t) => s + t.ivaTotal, 0)
    const totalPpm   = tecnicos.reduce((s, t) => s + t.ppm, 0)
    const totalRep   = tecnicos.reduce((s, t) => s + t.costoRep, 0)
    const totalBco   = tecnicos.reduce((s, t) => s + t.comBanco, 0)
    const totalCom   = tecnicos.reduce((s, t) => s + t.comisionTotal, 0)
    const totalIns   = tecnicos.reduce((s, t) => s + t.insumos, 0)
    const totalGan   = tecnicos.reduce((s, t) => s + t.gananciaGen, 0)

    const filas = tecnicos.map(t => `
      <tr>
        <td>${t.nombre}</td>
        <td class="r">${t.ots}</td>
        <td class="r">${fmt(t.ingresosBruto)}</td>
        <td class="r">${fmt(t.netoTotal)}</td>
        <td class="r red">${fmt(t.ivaTotal)}</td>
        <td class="r red">${fmt(t.ppm)}</td>
        <td class="r red">${fmt(t.costoRep)}</td>
        <td class="r orange">${fmt(t.comBanco)}</td>
        <td class="r purple">${fmt(t.comisionTotal)}</td>
        <td class="r green">${fmt(t.gananciaGen)}</td>
      </tr>`).join('')

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Informe por técnico — ${nombreLocal}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:Arial,sans-serif;font-size:8pt;color:#111;padding:10mm}
  @page{size:A4 landscape;margin:10mm}
  h1{font-size:13pt;font-weight:bold;margin-bottom:1mm}
  h2{font-size:9pt;font-weight:bold;background:#1e3a5f;color:#fff;padding:2mm 3mm;margin:5mm 0 2mm;border-radius:4px}
  .sub{font-size:8pt;color:#555;margin-bottom:4mm}
  table{width:100%;border-collapse:collapse;font-size:7.5pt}
  th{background:#f1f5f9;padding:2mm 2.5mm;text-align:right;font-weight:bold;border-bottom:2px solid #cbd5e1;white-space:nowrap}
  th:first-child{text-align:left}
  td{padding:1.5mm 2.5mm;border-bottom:1px solid #e2e8f0;vertical-align:top}
  .r{text-align:right}
  .red{color:#dc2626}
  .orange{color:#ea580c}
  .purple{color:#7c3aed;font-weight:bold}
  .green{color:#16a34a;font-weight:bold}
  .total-row{background:#f8fafc;font-weight:bold;border-top:2px solid #1e3a5f}
  .formula{background:#eff6ff;border:1px solid #bfdbfe;border-radius:4px;padding:3mm 4mm;margin:4mm 0;font-size:7pt;color:#1e40af}
  .formula code{font-family:monospace;display:block;margin:1mm 0}
  .kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:3mm;margin:4mm 0}
  .kpi{background:#f8fafc;border:1px solid #e2e8f0;border-radius:4px;padding:2.5mm;text-align:center}
  .kpi p{font-size:6.5pt;color:#555;margin-bottom:1mm}
  .kpi strong{font-size:10pt;display:block}
</style>
</head><body>
<h1>${nombreLocal} — Informe de rendimiento por técnico</h1>
<p class="sub">Período: ${desde} al ${hasta} · Generado: ${new Date().toLocaleString('es-CL')}</p>

<div class="kpi-grid">
  <div class="kpi"><p>Ingresos brutos</p><strong style="color:#1e3a5f">${fmt(totalBruto)}</strong></div>
  <div class="kpi"><p>IVA 19% (reservar)</p><strong style="color:#dc2626">${fmt(totalIva)}</strong></div>
  <div class="kpi"><p>PPM 3% (SII)</p><strong style="color:#dc2626">${fmt(totalPpm)}</strong></div>
  <div class="kpi"><p>Comisiones técnicos</p><strong style="color:#7c3aed">${fmt(totalCom)}</strong></div>
  <div class="kpi"><p>Ganancia neta negocio</p><strong style="color:#16a34a">${fmt(totalGan)}</strong></div>
</div>

<div class="formula">
  <strong>Fórmula por OT:</strong>
  <code>Precio Neto  = Bruto ÷ (1 + IVA%)</code>
  <code>PPM          = Neto × 3%</code>
  <code>Base comisión = Neto − Repuestos − Comisión banco</code>
  <code>Comisión téc  = Base × % configurado por tipo</code>
  <code>Ganancia neg  = Base − Comisión téc − Insumos</code>
</div>

<h2>Detalle por técnico</h2>
<table>
  <thead>
    <tr>
      <th>Técnico</th><th>OTs</th><th>Bruto cobrado</th><th>Neto (sin IVA)</th>
      <th>IVA 19%</th><th>PPM 3%</th><th>Repuestos</th>
      <th>Com. banco</th><th>Comisión técnico</th><th>Ganancia negocio</th>
    </tr>
  </thead>
  <tbody>
    ${filas}
    <tr class="total-row">
      <td>TOTAL</td>
      <td class="r">${tecnicos.reduce((s, t) => s + t.ots, 0)}</td>
      <td class="r">${fmt(totalBruto)}</td>
      <td class="r">${fmt(totalNeto)}</td>
      <td class="r red">${fmt(totalIva)}</td>
      <td class="r red">${fmt(totalPpm)}</td>
      <td class="r red">${fmt(totalRep)}</td>
      <td class="r orange">${fmt(totalBco)}</td>
      <td class="r purple">${fmt(totalCom)}</td>
      <td class="r green">${fmt(totalGan)}</td>
    </tr>
  </tbody>
</table>

${tecnicos.filter(t => t.ots > 0).map(t => `
  <h2 style="margin-top:6mm">${t.nombre}</h2>
  <div class="kpi-grid">
    <div class="kpi"><p>OTs entregadas</p><strong>${t.ots}</strong></div>
    <div class="kpi"><p>Ingreso bruto</p><strong style="color:#1e3a5f">${fmt(t.ingresosBruto)}</strong></div>
    <div class="kpi"><p>Neto (sin IVA)</p><strong>${fmt(t.netoTotal)}</strong></div>
    <div class="kpi"><p>IVA a reservar</p><strong style="color:#dc2626">${fmt(t.ivaTotal)}</strong></div>
    <div class="kpi"><p>PPM 3%</p><strong style="color:#dc2626">${fmt(t.ppm)}</strong></div>
    <div class="kpi"><p>Costo repuestos</p><strong style="color:#dc2626">${fmt(t.costoRep)}</strong></div>
    <div class="kpi"><p>Com. bancaria</p><strong style="color:#ea580c">${fmt(t.comBanco)}</strong></div>
    <div class="kpi"><p>Comisión técnico</p><strong style="color:#7c3aed">${fmt(t.comisionTotal)}</strong></div>
    <div class="kpi"><p>Insumos</p><strong style="color:#ea580c">${fmt(t.insumos)}</strong></div>
    <div class="kpi"><p>Ganancia negocio</p><strong style="color:#16a34a">${fmt(t.gananciaGen)}</strong></div>
  </div>`).join('')}

</body></html>`

    const win = window.open('', '_blank', 'width=1100,height=800')
    if (!win) { alert('Activa las ventanas emergentes para imprimir'); return }
    win.document.write(html)
    win.document.close()
    setTimeout(() => { win.focus(); win.print() }, 400)
  }

  return (
    <button
      onClick={imprimir}
      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg shadow-sm transition-colors"
    >
      🖨️ Imprimir informe detallado
    </button>
  )
}
