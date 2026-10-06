export const generateA5BillHTML = (params) => {
  const {
    clinicName = 'Clinic',
    clinicLogo = null,
    clinicPhone = '',
    patientName = '',
    patientId = '',
    patientDetails = '',
    title = 'INVOICE',
    billNo = '',
    billDate = null,
    status = '',
    columns = [],
    items = [],
    summary = [],
    payments = [],
    footerText = 'Thank you for choosing us &mdash; Computer-generated receipt'
  } = params;

  // Fit around 4-6 items per page comfortably on half-A4 height
  const ITEMS_PER_PAGE = 5;
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
  let html = `<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    /* Let the browser use standard portrait orientation so printers don't rotate it 90 degrees */
    @page { margin: 0; }
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #fff; color: #1e293b; font-size: 11px; }
    /* The page container is exactly half the height of A4, but full width */
    .page { width: 100%; max-width: 210mm; height: 148.5mm; padding: 8mm 12mm; box-sizing: border-box; position: relative; display: flex; flex-direction: column; page-break-after: always; overflow: hidden; margin: 0 auto; }
    .page:last-child { page-break-after: auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 4px; margin-bottom: 6px; }
    .header h2 { margin: 0; font-size: 16px; font-weight: 900; color: #1d4ed8; text-transform: uppercase; letter-spacing: 0.5px; }
    .header img { max-height: 35px; max-width: 140px; object-fit: contain; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 8px; }
    .info-grid { display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 8px; }
    .info-box { border: 1px solid #000; padding: 6px; border-radius: 6px; background: #fff; display: flex; justify-content: space-between; }
    table { width: 100%; border-collapse: collapse; margin-bottom: 8px; font-size: 10px; }
    th, td { border: 1px solid #000; padding: 4px 6px; }
    th { background: #fff; font-weight: 700; text-transform: uppercase; color: #000 !important; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .text-left { text-align: left; }
    .summary-box { width: 50%; margin-left: auto; border: 1px solid #000; border-radius: 6px; padding: 6px; background: #fff; margin-bottom: 4px; }
    .summary-row { display: flex; justify-content: space-between; margin-bottom: 2px; }
    .footer { margin-top: auto; font-size: 9px; text-align: center; color: #000; border-top: 1px solid #000; padding-top: 4px; }
    .continued { font-size: 11px; font-weight: bold; font-style: italic; text-align: right; color: #000; margin-top: 2px; }
    /* Force all content below header to be strictly black */
    .title-row *, .title-row, .info-grid *, .info-grid, table *, table, .summary-box *, .summary-box, .continued, .footer, .summary-row, th, td {
       color: #000 !important;
    }
  </style></head><body>`;

  for (let p = 0; p < totalPages; p++) {
    const pageItems = items.slice(p * ITEMS_PER_PAGE, (p + 1) * ITEMS_PER_PAGE);
    const isLastPage = (p === totalPages - 1);
    
    html += `<div class="page">
      <div class="header">
        <div>
          <h2>${clinicName}</h2>
          ${clinicPhone ? `<div style="font-size: 11px; font-weight: 600; color: #475569; margin-top: 4px;">&#128222; ${clinicPhone}</div>` : ''}
        </div>
        <div>
          ${clinicLogo ? `<img src="${clinicLogo}" alt="Logo" />` : `<div style="font-size:16px;font-weight:900;color:#0056b3;text-align:right;">${clinicName}</div>`}
        </div>
      </div>
      
      <div class="title-row">
        <div>
          <div style="font-weight: 800; font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px;">
            ${title} ${totalPages > 1 ? `<span style="color:#64748b; font-size:12px;">(Pg ${p+1}/${totalPages})</span>` : ''}
          </div>
          ${p > 0 ? `<div style="font-size: 11px; font-weight: bold; color: #dc2626; margin-top:2px;">[Continued... ${p+1}]</div>` : ''}
        </div>
        <div class="text-right">
          ${billNo ? `<div style="font-size: 11px;"><span style="color:#64748b; font-weight: 600;">Bill No:</span> <b style="font-size: 12px;">${billNo}</b></div>` : ''}
          ${billDate ? `<div style="font-size: 11px; margin-top: 2px;"><span style="color:#64748b; font-weight: 600;">Date:</span> <b>${billDate}</b></div>` : ''}
          ${status ? `<div style="font-weight:800; margin-top:4px; font-size: 12px; color:${status.toLowerCase().includes('paid') ? '#059669' : '#dc2626'}">${status}</div>` : ''}
        </div>
      </div>
      
      <div class="info-grid">
        <div class="info-box">
          <div>
            <div style="font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">Patient Details</div>
            <div style="font-weight: 800; font-size: 13px; color: #0f172a;">${patientName || '—'}</div>
          </div>
          <div class="text-right">
            <div style="font-size: 11px; margin-top: 2px; color: #475569; font-weight: 500;">ID: ${patientId || '—'}</div>
            ${patientDetails ? `<div style="font-size: 11px; margin-top: 2px; color: #475569;">${patientDetails}</div>` : ''}
          </div>
        </div>
      </div>
      
      <table>
        <thead>
          <tr>
            ${columns.map(c => `<th class="text-${c.align || 'left'}" style="width:${c.width || 'auto'}">${c.label}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
          ${pageItems.map(item => `
            <tr>
              ${columns.map(c => {
                const val = item[c.key] !== undefined ? item[c.key] : '';
                return `<td class="text-${c.align || 'left'} ${c.bold ? 'fw-bold' : ''}" style="${c.bold ? 'font-weight:700;' : ''} ${c.color ? `color:${c.color};` : ''}">${val}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
      
      ${!isLastPage ? `<div class="continued">Continued on page ${p+2}...</div>` : ''}
      
      ${isLastPage && payments.length > 0 ? `
        <div style="margin-top: 8px;">
          <div style="font-size: 10px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; color: #475569;">Payment History</div>
          <table style="width: 75%; margin-bottom: 8px;">
            <thead><tr><th class="text-left">Date</th><th class="text-center">Mode</th><th class="text-right">Amount</th></tr></thead>
            <tbody>
              ${payments.map(pay => `<tr><td>${pay.date}</td><td class="text-center">${pay.mode}</td><td class="text-right" style="font-weight:700;">${pay.amount}</td></tr>`).join('')}
            </tbody>
          </table>
        </div>
      ` : ''}
      
      ${isLastPage ? `
        <div class="summary-box">
          ${summary.map(s => `
            <div class="summary-row" style="color: ${s.color || '#0f172a'}; font-weight: ${s.bold ? '800' : '500'}; border-top: ${s.divider ? '1px solid #cbd5e1' : 'none'}; padding-top: ${s.divider ? '4px' : '0'}; margin-top: ${s.divider ? '4px' : '0'}; font-size: ${s.bold ? '12px' : '11px'}">
              <span>${s.label}</span>
              <span>${s.value}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
      
      <div class="footer">
        <span style="font-size: 8px; display: block; margin-top: 2px; font-weight: bold;">Page ${p+1} of ${totalPages}</span>
      </div>
    </div>`;
  }
  
  html += `</body></html>`;
  return html;
};
