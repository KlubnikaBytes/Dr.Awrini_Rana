const fs = require('fs');
const path = require('path');

const filesToUpdate = [
  'frontend/src/pages/Dashboard.jsx',
  'frontend/src/components/CareRecordBillModal.jsx',
  'frontend/src/components/FrontDesk/PaymentModal.jsx',
  'frontend/src/components/FrontDesk/PatientDashboard/AddBillsTab.jsx',
  'frontend/src/components/FrontDesk/PatientDashboard/BillsTab.jsx'
];

const getHeaderFooterHtml = `
const getInvoiceHeader = (clinicName, clinicLogo, clinicPhone, invoiceDetails) => {
  return \`
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:3px dotted #2563eb">
      <div style="flex:1">
        <div style="color:#1d4ed8;font-weight:900;margin:0;font-size:2.1rem;letter-spacing:1px;line-height:1.1">DR. ASWINI RANA</div>
        <div style="color:#13b5b1;font-size:0.85rem;line-height:1.6;margin-top:8px;font-weight:700">
          <div>MBBS(CAL),MD(MEDICINE),IPGMER</div>
          <div>CCEBDM(DELHI)-Certificate in Diabetes Management</div>
          <div>Consultant Physician & Diabetologist</div>
          <div>Ex Doctor AIIMS Kalyani</div>
          <div>SSKM/PG Hospital</div>
          <div>Reg no- 65941(WBMC)</div>
        </div>
        \${invoiceDetails ? \`<div style="margin-top:14px">\${invoiceDetails}</div>\` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;min-width:180px;gap:12px">
        \${clinicLogo ? \`<img src="\${clinicLogo}" alt="\${clinicName}" style="height:90px;max-width:220px;object-fit:contain;display:block" />\` : \`<div style="text-align:right"><span style="font-size:2rem;font-weight:900;font-style:italic;color:#0056b3;letter-spacing:-1px;line-height:1">\${clinicName}</span><div style="font-size:0.75rem;color:#0056b3;font-weight:bold;border-top:2px solid #00a8cc;margin-top:2px;padding-top:2px">Doctor Clinic</div></div>\`}
        \${clinicPhone ? \`<div style="display:flex;align-items:center;justify-content:flex-end;gap:8px;color:#0056b3;font-weight:800;font-size:1.3rem">&#128222; \${clinicPhone}</div>\` : ''}
      </div>
    </div>
  \`;
};

const getInvoiceFooter = () => {
  return \`
    <div style="margin-top:auto;padding-top:14px;text-align:center">
      <div style="font-weight:bold;padding:4px;margin-bottom:4px;margin-left:auto;margin-right:auto;color:#0056b3;border:1px solid #0056b3;font-size:12px;width:90%">
        DOCTOR CONSULTATION : DAY CARE : HOME CARE : ECG : HOLTER MONITOR : BLOOD TEST : VACCINATION : X-RAY : USG
      </div>
      <div style="font-size:11px;color:#64748b;margin-top:6px">Powered by Klubnika Bytes (www.klubnikabytes.com)</div>
    </div>
  \`;
};
\n\n`;

fs.writeFileSync(path.join(__dirname, 'frontend/src/utils/printTemplates.js'), getHeaderFooterHtml);
console.log('Created printTemplates.js');
