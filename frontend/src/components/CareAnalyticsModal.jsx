import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, DollarSign, Users, Activity, BarChart2, CheckCircle, AlertCircle, ChevronRight, ArrowLeft, ExternalLink, Loader } from 'lucide-react';
import reportService from '../services/reportService';
import { getLocalDateString } from '../utils/dateUtils';

/* ─── Tiny helper ─── */
const fmt = (val) => `₹ ${(val || 0).toFixed(2)}`;
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const BILL_STATUS_COLORS = {
  Paid:    { bg: '#d1fae5', color: '#065f46' },
  Partial: { bg: '#fef3c7', color: '#92400e' },
  Unbilled:{ bg: '#f1f5f9', color: '#475569' },
};

const CareAnalyticsModal = ({
  sourceType,
  onClose,
  accentColor = '#0f766e',
  accentBg    = 'linear-gradient(135deg,#0f766e,#14b8a6)'
}) => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate,   setEndDate]   = useState(getLocalDateString());
  const [loading,   setLoading]   = useState(false);
  const [data,      setData]      = useState(null);

  /* ── Test-patient drill-down state ── */
  const [selectedTest,  setSelectedTest]  = useState(null);  // { name, qty, revenue }
  const [patients,      setPatients]      = useState([]);
  const [pLoading,      setPLoading]      = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    setSelectedTest(null);
    setPatients([]);
    try {
      const res = await reportService.getCareAnalytics(sourceType, startDate, endDate);
      setData(res);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
      alert('Error fetching analytics.');
    } finally {
      setLoading(false);
    }
  }, [sourceType, startDate, endDate]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  /* ── Fetch patients when a test row is clicked ── */
  const handleTestClick = useCallback(async (svc) => {
    setSelectedTest(svc);
    setPLoading(true);
    setPatients([]);
    try {
      const res = await reportService.getTestPatients(svc.name, startDate, endDate);
      setPatients(res.patients || []);
    } catch (err) {
      console.error('Failed to fetch test patients', err);
      setPatients([]);
    } finally {
      setPLoading(false);
    }
  }, [startDate, endDate]);

  /* ── Open patient lab order in new tab ── */
  const openPatient = (patient) => {
    const url = `/lab?orderId=${patient._id}`;
    window.open(url, '_blank');
  };

  const getTitle = () => {
    if (sourceType === 'Consultation') return 'Consultation';
    if (sourceType === 'Lab')          return 'Lab';
    if (sourceType === 'DayCare')      return 'Day Care';
    if (sourceType === 'HomeCare')     return 'Home Care';
    return sourceType;
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div
        className="modal-dialog modal-dialog-centered"
        style={{ maxWidth: selectedTest ? 1200 : 1100, margin: '1.5rem auto', transition: 'max-width 0.3s ease' }}
      >
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden', minHeight: 650 }}>

          {/* ─── Header ─── */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background: accentBg }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                <BarChart2 size={24} className="text-white" />
              </div>
              <div>
                <div className="text-white fw-bold fs-5">{getTitle()} Analytics</div>
                <div className="text-white small opacity-75">Revenue, Collection, and Service Insights</div>
              </div>
            </div>

            <div className="d-flex align-items-center gap-3">
              <div className="d-flex align-items-center bg-white rounded-3 p-1 px-2 gap-2 shadow-sm">
                <Calendar size={16} style={{ color: accentColor }} />
                <input type="date" className="form-control form-control-sm border-0 shadow-none fw-semibold"
                  style={{ color: '#475569', fontSize: '0.85rem' }} value={startDate} onChange={e => setStartDate(e.target.value)} />
                <span className="text-secondary small fw-bold">to</span>
                <input type="date" className="form-control form-control-sm border-0 shadow-none fw-semibold"
                  style={{ color: '#475569', fontSize: '0.85rem' }} value={endDate} onChange={e => setEndDate(e.target.value)} />
              </div>
              <button className="btn text-white p-2 border-0" style={{ backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 10 }} onClick={onClose}>
                <X size={20} />
              </button>
            </div>
          </div>

          {/* ─── Body ─── */}
          <div className="d-flex" style={{ backgroundColor: '#f8fafc', flexGrow: 1, overflowY: 'auto', minHeight: 560 }}>

            {/* LEFT: main analytics */}
            <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto', minWidth: 0 }}>
              {loading ? (
                <div className="d-flex justify-content-center align-items-center h-100 py-5">
                  <span className="spinner-border spinner-border-sm me-2" style={{ color: accentColor }}></span>
                  <span className="text-secondary fw-semibold">Crunching numbers...</span>
                </div>
              ) : !data ? null : (
                <>
                  {/* Grand Summary Cards */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                        <div className="card-body p-3 position-relative">
                          <div className="position-absolute top-0 end-0 p-3 opacity-10"><DollarSign size={70} /></div>
                          <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Total Billed</h6>
                          <h4 className="fw-black mb-1 mt-1" style={{ color: '#334155' }}>{fmt(data.summary.totalBilled)}</h4>
                          <div className="small fw-semibold mt-1" style={{ color: accentColor }}>Across {data.billsCount} {sourceType === 'Lab' ? 'orders' : 'bills'}</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ borderBottom: '3px solid #10b981' }}>
                        <div className="card-body p-3 position-relative">
                          <div className="position-absolute top-0 end-0 p-3 opacity-10"><CheckCircle size={70} color="#10b981" /></div>
                          <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Total Collected</h6>
                          <h4 className="fw-black mb-1 mt-1 text-success">{fmt(data.summary.totalCollected)}</h4>
                          <div className="small fw-semibold mt-1 text-success opacity-75">Actual revenue received</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ borderBottom: '3px solid #ef4444' }}>
                        <div className="card-body p-3 position-relative">
                          <div className="position-absolute top-0 end-0 p-3 opacity-10"><AlertCircle size={70} color="#ef4444" /></div>
                          <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Outstanding Balance</h6>
                          <h4 className="fw-black mb-1 mt-1 text-danger">{fmt(data.summary.totalBalance)}</h4>
                          <div className="small fw-semibold mt-1 text-danger opacity-75">Pending payments</div>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-3">
                      <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ borderBottom: '3px solid #8b5cf6' }}>
                        <div className="card-body p-3 position-relative">
                          <div className="position-absolute top-0 end-0 p-3 opacity-10"><Users size={70} color="#8b5cf6" /></div>
                          <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.5px' }}>Unique Patients</h6>
                          <h4 className="fw-black mb-1 mt-1" style={{ color: '#8b5cf6' }}>{data.summary.totalUniquePatients || 0}</h4>
                          <div className="small fw-semibold mt-1 opacity-75" style={{ color: '#8b5cf6' }}>Distinct patients served</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="row g-3">
                    {/* Collector / Referrer Analysis */}
                    <div className="col-lg-6">
                      <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-white border-bottom-0 pt-3 pb-2 px-4 d-flex align-items-center gap-2">
                          <Users size={16} style={{ color: accentColor }} />
                          <h6 className="fw-bold mb-0" style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                            {sourceType === 'Consultation' ? 'Revenue by Doctor' : sourceType === 'Lab' ? 'Revenue by Referrer' : 'Collection by Staff'}
                          </h6>
                        </div>
                        <div className="card-body px-4 pb-4 pt-2">
                          {data.collectorAnalytics.length === 0 ? (
                            <div className="text-secondary small text-center py-4 bg-light rounded-3">No data found</div>
                          ) : (
                            <div className="table-responsive rounded-3 border">
                              <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                <thead style={{ backgroundColor: '#f1f5f9' }}>
                                  <tr>
                                    <th className="text-secondary py-2 px-3">
                                      {sourceType === 'Consultation' ? 'Doctor Name' : sourceType === 'Lab' ? 'Referrer / Source' : 'Staff / Collector'}
                                    </th>
                                    <th className="text-secondary py-2 text-center">{sourceType === 'Lab' ? 'Orders' : 'Bills'}</th>
                                    <th className="text-secondary py-2 text-end">Billed</th>
                                    <th className="text-secondary py-2 text-end text-success">Collected</th>
                                    <th className="text-secondary py-2 text-end text-danger px-3">Due</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.collectorAnalytics.map((c, i) => (
                                    <tr key={i} className="border-bottom">
                                      <td className="fw-bold px-3 py-2" style={{ color: '#334155' }}>{c.name}</td>
                                      <td className="text-center fw-semibold text-secondary">{c.billsCount}</td>
                                      <td className="text-end fw-semibold text-secondary">{fmt(c.billed)}</td>
                                      <td className="text-end fw-bold text-success">{fmt(c.collected)}</td>
                                      <td className="text-end fw-semibold text-danger px-3">{c.balance > 0 ? fmt(c.balance) : '-'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Service / Test Analysis — clickable rows for Lab */}
                    <div className="col-lg-6">
                      <div className="card border-0 shadow-sm rounded-4 h-100">
                        <div className="card-header bg-white border-bottom-0 pt-3 pb-2 px-4 d-flex align-items-center justify-content-between">
                          <div className="d-flex align-items-center gap-2">
                            <Activity size={16} style={{ color: accentColor }} />
                            <h6 className="fw-bold mb-0" style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                              {sourceType === 'Lab' ? 'Revenue by Test' : 'Revenue by Service / Item'}
                            </h6>
                          </div>
                          {sourceType === 'Lab' && (
                            <span className="badge rounded-pill px-2 py-1" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem' }}>
                              Click test to see patients
                            </span>
                          )}
                        </div>
                        <div className="card-body px-4 pb-4 pt-2">
                          {data.serviceAnalytics.length === 0 ? (
                            <div className="text-secondary small text-center py-4 bg-light rounded-3">No service data found</div>
                          ) : (
                            <div className="table-responsive rounded-3 border">
                              <table className="table table-borderless align-middle mb-0" style={{ fontSize: '0.82rem' }}>
                                <thead style={{ backgroundColor: '#f1f5f9' }}>
                                  <tr>
                                    <th className="text-secondary py-2 px-3">
                                      {sourceType === 'Lab' ? 'Test Name' : 'Service / Item'}
                                    </th>
                                    <th className="text-secondary py-2 text-center">Qty</th>
                                    <th className="text-secondary py-2 text-end px-3">Revenue Billed</th>
                                    {sourceType === 'Lab' && <th style={{ width: 24 }}></th>}
                                  </tr>
                                </thead>
                                <tbody>
                                  {data.serviceAnalytics.map((s, i) => {
                                    const isActive = selectedTest?.name === s.name;
                                    return (
                                      <tr
                                        key={i}
                                        className="border-bottom"
                                        style={{
                                          cursor: sourceType === 'Lab' ? 'pointer' : 'default',
                                          backgroundColor: isActive ? '#eff6ff' : 'transparent',
                                          transition: 'background 0.15s'
                                        }}
                                        onClick={() => sourceType === 'Lab' && handleTestClick(s)}
                                      >
                                        <td className="px-3 py-2" style={{ color: isActive ? '#1d4ed8' : '#334155', fontWeight: isActive ? 700 : 600 }}>
                                          {s.name}
                                        </td>
                                        <td className="text-center fw-semibold text-secondary">{s.qty}</td>
                                        <td className="text-end fw-bold px-3" style={{ color: isActive ? '#1d4ed8' : accentColor }}>{fmt(s.revenue)}</td>
                                        {sourceType === 'Lab' && (
                                          <td className="pe-2">
                                            <ChevronRight size={14} style={{ color: isActive ? '#1d4ed8' : '#94a3b8', transform: isActive ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                                          </td>
                                        )}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* RIGHT: Patient Drill-down Panel */}
            {selectedTest && (
              <div
                style={{
                  width: 380,
                  minWidth: 340,
                  borderLeft: '1.5px solid #e2e8f0',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'slideInRight 0.25s ease'
                }}
              >
                {/* Panel Header */}
                <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom" style={{ backgroundColor: '#f8fafc' }}>
                  <div>
                    <div className="fw-bold" style={{ color: '#1e293b', fontSize: '0.9rem' }}>
                      {selectedTest.name}
                    </div>
                    <div className="small text-secondary">
                      {patients.length} patient{patients.length !== 1 ? 's' : ''} · {startDate} → {endDate}
                    </div>
                  </div>
                  <button
                    className="btn btn-sm p-1"
                    style={{ color: '#64748b', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 8 }}
                    onClick={() => { setSelectedTest(null); setPatients([]); }}
                    title="Close panel"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Summary strip */}
                <div className="d-flex gap-0 border-bottom" style={{ backgroundColor: '#f8fafc' }}>
                  <div className="flex-fill text-center py-2 border-end">
                    <div className="small text-secondary">Qty</div>
                    <div className="fw-bold" style={{ color: accentColor }}>{selectedTest.qty}</div>
                  </div>
                  <div className="flex-fill text-center py-2">
                    <div className="small text-secondary">Revenue</div>
                    <div className="fw-bold" style={{ color: accentColor }}>{fmt(selectedTest.revenue)}</div>
                  </div>
                </div>

                {/* Patient List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {pLoading ? (
                    <div className="d-flex align-items-center justify-content-center py-5 gap-2">
                      <Loader size={18} className="text-secondary" style={{ animation: 'spin 1s linear infinite' }} />
                      <span className="text-secondary small">Loading patients…</span>
                    </div>
                  ) : patients.length === 0 ? (
                    <div className="text-center text-secondary py-5 small">No patients found for this test in the selected date range.</div>
                  ) : (
                    patients.map((p, idx) => {
                      const statusStyle = BILL_STATUS_COLORS[p.billStatus] || BILL_STATUS_COLORS.Unbilled;
                      const displayId = p.uhid || p._id?.toString().slice(-6).toUpperCase() || '—';
                      return (
                        <div
                          key={p._id || idx}
                          onClick={() => openPatient(p)}
                          className="d-flex align-items-center gap-3 px-4 py-3 border-bottom"
                          style={{
                            cursor: 'pointer',
                            transition: 'background 0.12s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0f9ff'}
                          onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                          title="Click to open patient details in new tab"
                        >
                          {/* Avatar */}
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                            style={{ width: 38, height: 38, backgroundColor: '#eff6ff', color: '#1d4ed8', fontSize: '0.85rem' }}
                          >
                            {p.patientName?.charAt(0)?.toUpperCase() || '?'}
                          </div>

                          {/* Info */}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                              <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.85rem' }}>{p.patientName}</span>
                              <span className="badge rounded-pill px-2 py-0" style={{ backgroundColor: '#e0e7ff', color: '#3730a3', fontSize: '0.68rem', fontWeight: 700 }}>
                                #{displayId}
                              </span>
                            </div>
                            <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                              {p.patientAge  && <span>{p.patientAge} yrs</span>}
                              {p.patientGender && <span>· {p.patientGender}</span>}
                              {p.patientPhone && <span>· {p.patientPhone}</span>}
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1 flex-wrap" style={{ fontSize: '0.72rem' }}>
                              <span className="text-secondary">{fmtDate(p.date)}</span>
                              {p.referredBy && <span className="text-secondary">· Ref: {p.referredBy}</span>}
                            </div>
                          </div>

                          {/* Amount + Status */}
                          <div className="text-end flex-shrink-0">
                            <div className="fw-bold" style={{ color: '#1e293b', fontSize: '0.82rem' }}>{fmt(p.finalAmount)}</div>
                            {p.balanceAmount > 0 && (
                              <div className="small text-danger" style={{ fontSize: '0.7rem' }}>Due: {fmt(p.balanceAmount)}</div>
                            )}
                            <span
                              className="badge rounded-pill px-2 mt-1"
                              style={{ backgroundColor: statusStyle.bg, color: statusStyle.color, fontSize: '0.65rem' }}
                            >
                              {p.billStatus || 'Unbilled'}
                            </span>
                          </div>

                          <ExternalLink size={14} style={{ color: '#94a3b8', flexShrink: 0 }} />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer hint */}
                {patients.length > 0 && (
                  <div className="px-4 py-2 border-top text-center" style={{ backgroundColor: '#f8fafc' }}>
                    <span className="small text-secondary">
                      <ExternalLink size={11} className="me-1" />
                      Click any patient to open their lab order in a new tab
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>

      <style>{`
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CareAnalyticsModal;
