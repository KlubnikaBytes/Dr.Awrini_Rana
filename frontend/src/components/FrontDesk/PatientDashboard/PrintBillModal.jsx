import React from 'react';
import { Printer, X, FileText, Stethoscope, Home, Building2, FlaskConical, Layers, CheckCircle2 } from 'lucide-react';
import { getCategoryForItem } from '../../../utils/printA5Bill';

const getCategoryMeta = (cat) => {
  const c = (cat || '').toLowerCase();
  if (c === 'consultation') {
    return {
      label: 'Consultation',
      title: 'Consultation Invoice',
      icon: Stethoscope,
      bg: '#eff6ff',
      border: '#bfdbfe',
      accent: '#2563eb',
      badgeBg: '#dbeafe',
      badgeColor: '#1d4ed8'
    };
  }
  if (c === 'home care' || c === 'homecare') {
    return {
      label: 'Home Care',
      title: 'Home Care Invoice',
      icon: Home,
      bg: '#fffbeb',
      border: '#fde68a',
      accent: '#d97706',
      badgeBg: '#fef3c7',
      badgeColor: '#b45309'
    };
  }
  if (c === 'day care' || c === 'daycare') {
    return {
      label: 'Day Care',
      title: 'Day Care Invoice',
      icon: Building2,
      bg: '#f0fdfa',
      border: '#99f6e4',
      accent: '#0d9488',
      badgeBg: '#ccfbf1',
      badgeColor: '#0f766e'
    };
  }
  if (c === 'lab') {
    return {
      label: 'Lab',
      title: 'Lab Invoice',
      icon: FlaskConical,
      bg: '#faf5ff',
      border: '#e9d5ff',
      accent: '#9333ea',
      badgeBg: '#f3e8ff',
      badgeColor: '#7e22ce'
    };
  }
  return {
    label: cat || 'Other Services',
    title: `${cat || 'Other'} Invoice`,
    icon: Layers,
    bg: '#f8fafc',
    border: '#cbd5e1',
    accent: '#475569',
    badgeBg: '#e2e8f0',
    badgeColor: '#334155'
  };
};

const PrintBillModal = ({
  show,
  onClose,
  onPrint,
  patient,
  bill,
  items = [],
  totals = null,
  categoryBreakdown = null
}) => {
  if (!show) return null;

  const validItems = (items && items.length > 0)
    ? items.filter(it => it.serviceName)
    : (bill?.items || []).filter(it => it.serviceName);

  // Group items by resolved category
  const categoriesMap = {};
  validItems.forEach(it => {
    const cat = getCategoryForItem(it);
    if (!categoriesMap[cat]) {
      categoriesMap[cat] = {
        name: cat,
        items: [],
        billed: 0,
        due: 0
      };
    }
    categoriesMap[cat].items.push(it);
    const lineTotal = it.totalPrice !== undefined
      ? Number(it.totalPrice)
      : (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))) - parseFloat(it.discount || 0);
    categoriesMap[cat].billed += lineTotal;
  });

  // Reconcile with categoryBreakdown if provided
  if (categoryBreakdown) {
    Object.keys(categoriesMap).forEach(cat => {
      if (categoryBreakdown[cat]) {
        categoriesMap[cat].billed = categoryBreakdown[cat].billed;
        categoriesMap[cat].due = categoryBreakdown[cat].due;
      }
    });
  } else if (bill) {
    // If bill balance is 0, category dues are 0
    const bBal = bill.totalBalance !== undefined ? bill.totalBalance : (totals?.balance || 0);
    Object.keys(categoriesMap).forEach(cat => {
      if (bBal <= 0) {
        categoriesMap[cat].due = 0;
      } else {
        categoriesMap[cat].due = categoriesMap[cat].billed;
      }
    });
  }

  const distinctCategories = Object.values(categoriesMap);

  const totalBilled = totals?.billed !== undefined
    ? totals.billed
    : (bill?.totalBilledAmount || validItems.reduce((acc, it) => acc + (parseFloat(it.unitPrice || 0) * (parseInt(it.qty || 1))), 0));

  const totalFinal = totals?.final !== undefined
    ? totals.final
    : (bill?.finalAmount || validItems.reduce((acc, it) => acc + parseFloat(it.totalPrice || 0), 0));

  const totalBalance = totals?.balance !== undefined
    ? totals.balance
    : (bill?.totalBalance !== undefined ? bill.totalBalance : totalFinal);

  const billNumber = bill?.billNo ? `#${bill.billNo}` : '';

  return (
    <div
      className="modal show d-block"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 10500 }}
      tabIndex="-1"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal-dialog modal-dialog-centered modal-lg" style={{ maxWidth: 680 }}>
        <div className="modal-content border-0 shadow-2xl rounded-4 overflow-hidden">
          
          {/* Header */}
          <div className="modal-header px-4 py-3 bg-white border-bottom align-items-center">
            <div className="d-flex align-items-center gap-3">
              <div
                className="rounded-circle d-flex align-items-center justify-content-center"
                style={{ width: 44, height: 44, backgroundColor: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe' }}
              >
                <Printer size={22} />
              </div>
              <div>
                <h5 className="modal-title fw-bold text-dark mb-0" style={{ fontSize: '1.15rem' }}>
                  Print Bill / Invoice
                </h5>
                <div className="text-secondary small mt-0" style={{ fontSize: '0.78rem' }}>
                  Patient: <span className="fw-semibold text-dark">{patient?.name || 'Patient'}</span>
                  {patient?.patientId && <span className="text-muted ms-1">({patient.patientId})</span>}
                  {billNumber && <span className="text-primary fw-semibold ms-2">{billNumber}</span>}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn-close shadow-none"
              aria-label="Close"
              onClick={onClose}
              style={{ fontSize: '0.85rem' }}
            />
          </div>

          {/* Subtitle banner */}
          <div className="px-4 py-2" style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.8rem', color: '#475569' }}>
            <span>Multiple service types found in this bill. Choose what you would like to print:</span>
          </div>

          {/* Body */}
          <div className="modal-body p-4" style={{ backgroundColor: '#ffffff', maxHeight: '68vh', overflowY: 'auto' }}>
            <div className="d-flex flex-column gap-3">

              {/* OPTION 1: ALL SERVICES (ENTIRE BILL) */}
              <div
                className="p-3 rounded-3 transition-all"
                style={{
                  border: '1.5px solid #2563eb',
                  backgroundColor: '#f8faff',
                  cursor: 'pointer'
                }}
                onClick={() => { onPrint('ALL'); onClose(); }}
              >
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div
                      className="rounded-3 d-flex align-items-center justify-content-center"
                      style={{ width: 42, height: 42, backgroundColor: '#2563eb', color: '#fff' }}
                    >
                      <FileText size={20} />
                    </div>
                    <div>
                      <div className="d-flex align-items-center gap-2">
                        <span className="fw-bold text-dark" style={{ fontSize: '0.95rem' }}>
                          All Services / Entire Bill
                        </span>
                        <span className="badge rounded-pill" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 600 }}>
                          Full Bill ({validItems.length} items)
                        </span>
                      </div>
                      <div className="text-muted small mt-1" style={{ fontSize: '0.76rem' }}>
                        Prints complete invoice with Consultation, Care, Lab & all recorded items
                      </div>
                    </div>
                  </div>

                  <div className="d-flex align-items-center gap-3">
                    <div className="text-end">
                      <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>
                        ₹{Number(totalFinal).toFixed(2)}
                      </div>
                      {Number(totalBalance) > 0 ? (
                        <div className="text-danger fw-semibold" style={{ fontSize: '0.72rem' }}>
                          Due: ₹{Number(totalBalance).toFixed(2)}
                        </div>
                      ) : (
                        <div className="text-success fw-semibold" style={{ fontSize: '0.72rem' }}>
                          Fully Paid
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary rounded-pill px-3 py-1 d-flex align-items-center gap-1 shadow-sm"
                      style={{ fontSize: '0.8rem', fontWeight: 600 }}
                      onClick={(e) => { e.stopPropagation(); onPrint('ALL'); onClose(); }}
                    >
                      <Printer size={13} /> Print All
                    </button>
                  </div>
                </div>
              </div>

              {/* SEPARATOR */}
              <div className="d-flex align-items-center gap-2 my-1">
                <div className="flex-grow-1" style={{ height: 1, backgroundColor: '#e2e8f0' }} />
                <span className="text-uppercase text-muted fw-semibold" style={{ fontSize: '0.68rem', letterSpacing: '0.06em' }}>
                  Or Print Single Category Only
                </span>
                <div className="flex-grow-1" style={{ height: 1, backgroundColor: '#e2e8f0' }} />
              </div>

              {/* INDIVIDUAL CATEGORIES */}
              {distinctCategories.map(cat => {
                const meta = getCategoryMeta(cat.name);
                const Icon = meta.icon;
                const itemsSummary = cat.items.map(i => i.serviceName).join(', ');

                return (
                  <div
                    key={cat.name}
                    className="p-3 rounded-3 transition-all"
                    style={{
                      border: `1.5px solid ${meta.border}`,
                      backgroundColor: meta.bg,
                      cursor: 'pointer'
                    }}
                    onClick={() => { onPrint(cat.name); onClose(); }}
                  >
                    <div className="d-flex align-items-center justify-content-between">
                      <div className="d-flex align-items-center gap-3" style={{ minWidth: 0, flex: 1, marginRight: 16 }}>
                        <div
                          className="rounded-3 d-flex align-items-center justify-content-center flex-shrink-0"
                          style={{ width: 40, height: 40, backgroundColor: meta.badgeBg, color: meta.accent }}
                        >
                          <Icon size={19} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div className="d-flex align-items-center gap-2">
                            <span className="fw-bold text-dark" style={{ fontSize: '0.92rem' }}>
                              Only {cat.name}
                            </span>
                            <span className="badge rounded-pill" style={{ backgroundColor: meta.badgeBg, color: meta.badgeColor, fontSize: '0.68rem', fontWeight: 600 }}>
                              {cat.items.length} {cat.items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                          <div className="text-muted text-truncate small mt-1" style={{ fontSize: '0.75rem', maxWidth: 360 }} title={itemsSummary}>
                            {itemsSummary}
                          </div>
                        </div>
                      </div>

                      <div className="d-flex align-items-center gap-3 flex-shrink-0">
                        <div className="text-end">
                          <div className="fw-bold text-dark" style={{ fontSize: '0.96rem' }}>
                            ₹{Number(cat.billed).toFixed(2)}
                          </div>
                          {Number(cat.due) > 0 ? (
                            <div className="text-danger fw-semibold" style={{ fontSize: '0.72rem' }}>
                              Due: ₹{Number(cat.due).toFixed(2)}
                            </div>
                          ) : (
                            <div className="text-success fw-semibold" style={{ fontSize: '0.72rem' }}>
                              ✓ Clear
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1 shadow-sm"
                          style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            backgroundColor: '#ffffff',
                            color: meta.accent,
                            border: `1.5px solid ${meta.accent}`
                          }}
                          onClick={(e) => { e.stopPropagation(); onPrint(cat.name); onClose(); }}
                        >
                          <Printer size={13} /> Print {cat.name}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

            </div>
          </div>

          {/* Footer */}
          <div className="modal-footer px-4 py-2 bg-light border-top justify-content-between">
            <span className="text-muted small" style={{ fontSize: '0.75rem' }}>
              Selected invoice will print in standard clinic A5 format.
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill px-3"
              style={{ fontSize: '0.78rem' }}
              onClick={onClose}
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default PrintBillModal;
