
export const getInvoiceHeader = (clinicName, clinicLogo, clinicPhone, invoiceDetails) => {
  return `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px dotted #2563eb">
      <div>
        <h2 style="margin:0;color:#1d4ed8;font-size:2.2rem;font-weight:900;letter-spacing:1px">${clinicName.toUpperCase()}</h2>
        <p style="margin:6px 0 0;color:#64748b;font-size:16px;font-weight:600">Medical Invoice / Receipt</p>
        ${invoiceDetails ? `<div style="margin-top:14px">${invoiceDetails}</div>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:12px">
        ${clinicLogo ? `<img src="${clinicLogo}" alt="${clinicName}" style="height:90px;max-width:220px;object-fit:contain;display:block" />` : `<div style="text-align:right"><span style="font-size:2rem;font-weight:900;font-style:italic;color:#0056b3;letter-spacing:-1px;line-height:1">${clinicName}</span><div style="font-size:1rem;color:#0056b3;font-weight:bold;border-top:2px solid #00a8cc;margin-top:2px;padding-top:2px">Doctor Clinic</div></div>`}
        ${clinicPhone ? `<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;color:#0056b3;font-weight:800;font-size:1.5rem">&#128222; ${clinicPhone}</div>` : ''}
      </div>
    </div>
  `;
};

export const getInvoiceFooter = () => {
  return '';
};


