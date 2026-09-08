import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  X, Calendar, Search, Pill, Edit2, CheckCircle,
  ChevronRight, ExternalLink, Loader, User, Clock
} from 'lucide-react';
import reportService from '../services/reportService';
import { getLocalDateString } from '../utils/dateUtils';

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const MedicineHistoryModal = ({ onClose }) => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate]     = useState(getLocalDateString());
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  /* ── Edit state ── */
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editCompany, setEditCompany]   = useState('');
  const [editMrName, setEditMrName]     = useState('');
  const [saving, setSaving]             = useState(false);

  /* ── Drill-down state ── */
  const [selectedMed,   setSelectedMed]   = useState(null);   // medicine row object
  const [medPatients,   setMedPatients]   = useState([]);
  const [pLoading,      setPLoading]      = useState(false);
  const [expandedPat,   setExpandedPat]   = useState(null);   // patientId whose dates are expanded

  const fetchHistory = useCallback(async () => {
    setLoading(true);
    setSelectedMed(null);
    setMedPatients([]);
    try {
      const res = await reportService.getMedicineHistory(startDate, endDate);
      setData(res || []);
    } catch (error) {
      console.error('Failed to fetch medicine history', error);
      alert('Error fetching medicine history.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const s = searchTerm.toLowerCase();
      return (
        (item.medicineName || '').toLowerCase().includes(s) ||
        (item.company  || '').toLowerCase().includes(s) ||
        (item.mrName   || '').toLowerCase().includes(s)
      );
    });
  }, [data, searchTerm]);

  /* ── Edit handlers ── */
  const handleEditClick = (index, item) => {
    setEditingIndex(index);
    setEditCompany(item.company || '');
    setEditMrName(item.mrName || '');
  };

  const handleSave = async (item, index) => {
    setSaving(true);
    try {
      await reportService.updateMedicineMeta({
        medicineName: item.medicineName,
        company: editCompany,
        mrName: editMrName
      });
      const newData = [...data];
      newData[index].company = editCompany;
      newData[index].mrName  = editMrName;
      setData(newData);
      setEditingIndex(-1);
    } catch { alert('Error saving details'); }
    finally { setSaving(false); }
  };

  /* ── Medicine click → fetch patients ── */
  const handleMedClick = useCallback(async (item) => {
    // if same medicine clicked again, toggle off
    if (selectedMed?.medicineName === item.medicineName) {
      setSelectedMed(null);
      setMedPatients([]);
      return;
    }
    setSelectedMed(item);
    setExpandedPat(null);
    setPLoading(true);
    setMedPatients([]);
    try {
      const res = await reportService.getMedicinePatients(item.medicineName, startDate, endDate);
      setMedPatients(res.patients || []);
    } catch (err) {
      console.error('Failed to fetch medicine patients', err);
      setMedPatients([]);
    } finally {
      setPLoading(false);
    }
  }, [selectedMed, startDate, endDate]);

  /* ── Open VisitPad in new tab ── */
  const openVisitPad = (appointmentId) => {
    if (!appointmentId) {
      alert('No appointment linked to this consultation.');
      return;
    }
    window.open(`/doctor/visit/${appointmentId}`, '_blank');
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(15,23,42,0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div
        className="modal-dialog modal-dialog-centered modal-dialog-scrollable"
        style={{ maxWidth: selectedMed ? 1300 : 1150, margin: '1.5rem auto', transition: 'max-width 0.3s ease' }}
      >
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20, overflow: 'hidden', height: '88vh' }}>

          {/* ─── Premium Header ─── */}
          <div className="px-4 py-4" style={{ background: 'linear-gradient(135deg,#3b82f6,#6366f1,#8b5cf6)', position: 'relative', overflow: 'hidden', flexShrink: 0 }}>
            <div className="position-absolute" style={{ top: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)' }}>
              <Pill size={180} color="#ffffff" />
            </div>
            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between position-relative gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 56, height: 56, padding: 10, flexShrink: 0 }}>
                  <Pill size={28} style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h4 className="text-white fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Medicine Prescriptions</h4>
                  <div className="text-white small fw-medium" style={{ opacity: 0.75 }}>Monitor pharmacy movement & mapped MR/Company data</div>
                </div>
              </div>

              <div className="d-flex align-items-center gap-3">
                <div className="d-flex align-items-center rounded-3 p-1 px-3 gap-2 border shadow-sm" style={{ backgroundColor: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', borderColor: 'rgba(255,255,255,0.4)' }}>
                  <Calendar size={16} className="text-white" />
                  <input type="date" className="bg-transparent border-0 fw-semibold shadow-none p-1"
                    style={{ fontSize: '0.85rem', colorScheme: 'dark', outline: 'none', color: '#fff' }}
                    value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className="text-white small fw-bold mx-1">to</span>
                  <input type="date" className="bg-transparent border-0 fw-semibold shadow-none p-1"
                    style={{ fontSize: '0.85rem', colorScheme: 'dark', outline: 'none', color: '#fff' }}
                    value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button className="btn btn-light rounded-circle p-2 shadow-sm d-flex align-items-center justify-content-center flex-shrink-0"
                  style={{ width: 40, height: 40 }} onClick={onClose}>
                  <X size={20} className="text-secondary" />
                </button>
              </div>
            </div>
          </div>

          {/* ─── Body ─── */}
          <div className="d-flex flex-grow-1" style={{ overflow: 'hidden' }}>

            {/* LEFT: Medicine Table */}
            <div className="d-flex flex-column" style={{ flex: 1, minWidth: 0, backgroundColor: '#f8fafc' }}>

              {/* Toolbar */}
              <div className="border-bottom bg-white px-4 py-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3" style={{ flexShrink: 0 }}>
                <div className="position-relative" style={{ maxWidth: 380, width: '100%' }}>
                  <Search size={18} className="position-absolute text-muted" style={{ top: '50%', left: 16, transform: 'translateY(-50%)' }} />
                  <input
                    type="text"
                    className="form-control bg-light border-0 ps-5 py-2 rounded-pill shadow-none"
                    placeholder="Search medicine, company, or MR..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    style={{ fontSize: '0.9rem', color: '#334155' }}
                  />
                </div>
                <div className="d-flex align-items-center gap-4 justify-content-end">
                  <div className="d-flex flex-column align-items-end">
                    <span className="text-secondary fw-medium text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Total Prescriptions</span>
                    <h4 className="fw-black mb-0" style={{ color: '#4f46e5' }}>{filteredData.reduce((acc, curr) => acc + curr.count, 0)}</h4>
                  </div>
                  <div style={{ width: 1, height: 30, backgroundColor: '#e2e8f0' }} />
                  <div className="d-flex flex-column align-items-end">
                    <span className="text-secondary fw-medium text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Unique Medicines</span>
                    <h4 className="fw-black mb-0 text-dark">{filteredData.length}</h4>
                  </div>
                </div>
              </div>

              {/* Hint banner when no med is selected */}
              {!selectedMed && !loading && filteredData.length > 0 && (
                <div className="px-4 py-2 border-bottom" style={{ backgroundColor: '#eff6ff', flexShrink: 0 }}>
                  <span className="small" style={{ color: '#1d4ed8' }}>
                    💊 Click on any medicine row to see which patients were prescribed it
                  </span>
                </div>
              )}

              {/* Table */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <tr>
                      <th className="py-3 px-4 text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Medicine Details</th>
                      <th className="py-3 text-center text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '12%' }}>Count</th>
                      <th className="py-3 px-3 text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '22%' }}>Pharma Company</th>
                      <th className="py-3 px-3 text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '18%' }}>MR Name</th>
                      <th className="py-3 text-center text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '8%' }}>Edit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="text-center py-5 text-secondary border-0">
                        <div className="spinner-border spinner-border-sm text-primary mb-2" />
                        <div className="small fw-medium">Loading history...</div>
                      </td></tr>
                    ) : filteredData.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-5 text-secondary border-0">
                        <Pill size={40} className="text-muted opacity-50 mb-3" />
                        <h6 className="fw-bold text-dark">No Medicines Found</h6>
                        <div className="small">Adjust your search or date range</div>
                      </td></tr>
                    ) : (
                      filteredData.map((item, i) => {
                        const originalIndex = data.findIndex(d => d.medicineName === item.medicineName);
                        const isEditing  = editingIndex === originalIndex;
                        const isSelected = selectedMed?.medicineName === item.medicineName;

                        return (
                          <tr
                            key={i}
                            className="border-bottom"
                            style={{
                              backgroundColor: isSelected ? '#eff6ff' : isEditing ? '#f8fafc' : 'transparent',
                              transition: 'background 0.15s',
                              cursor: isEditing ? 'default' : 'pointer'
                            }}
                            onClick={() => !isEditing && handleMedClick(item)}
                          >
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center gap-3">
                                <div
                                  className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                                  style={{ width: 40, height: 40, color: isSelected ? '#fff' : '#4f46e5', backgroundColor: isSelected ? '#4f46e5' : '#eef2ff', transition: 'all 0.2s' }}
                                >
                                  {item.medicineName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark" style={{ fontSize: '1rem', color: isSelected ? '#1d4ed8' : '#1e293b' }}>{item.medicineName}</div>
                                  <div className="text-muted small fw-medium">{item.genericName || 'No Generic Map'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center" onClick={e => e.stopPropagation()}>
                              <span className="badge rounded-pill fw-bold"
                                style={{ backgroundColor: isSelected ? '#dbeafe' : '#f1f5f9', color: isSelected ? '#1d4ed8' : '#475569', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                {item.count}
                              </span>
                            </td>
                            <td className="px-3" style={{ minWidth: 140 }} onClick={e => { if (!isEditing) return; e.stopPropagation(); }}>
                              {isEditing ? (
                                <input type="text" className="form-control form-control-sm border-0 shadow-sm rounded-3 px-3 py-2" placeholder="Company Name"
                                  value={editCompany} onChange={e => setEditCompany(e.target.value)} onClick={e => e.stopPropagation()} />
                              ) : (
                                <div className="fw-semibold text-dark">{item.company || <span className="text-muted small fst-italic">Not Assigned</span>}</div>
                              )}
                            </td>
                            <td className="px-3" style={{ minWidth: 140 }} onClick={e => { if (!isEditing) return; e.stopPropagation(); }}>
                              {isEditing ? (
                                <input type="text" className="form-control form-control-sm border-0 shadow-sm rounded-3 px-3 py-2" placeholder="MR Name"
                                  value={editMrName} onChange={e => setEditMrName(e.target.value)} onClick={e => e.stopPropagation()} />
                              ) : (
                                <div className="fw-semibold text-dark">{item.mrName || <span className="text-muted small fst-italic">Not Assigned</span>}</div>
                              )}
                            </td>
                            <td className="text-center" onClick={e => e.stopPropagation()}>
                              {isEditing ? (
                                <button disabled={saving} onClick={() => handleSave(item, originalIndex)}
                                  className="btn btn-sm btn-success rounded-circle p-2 shadow-sm border-0 d-flex align-items-center justify-content-center mx-auto"
                                  style={{ width: 32, height: 32 }}>
                                  <CheckCircle size={16} />
                                </button>
                              ) : (
                                <button onClick={e => { e.stopPropagation(); handleEditClick(originalIndex, item); }}
                                  className="btn btn-sm btn-white rounded-circle p-2 text-primary shadow-sm border d-flex align-items-center justify-content-center mx-auto"
                                  style={{ width: 32, height: 32 }}>
                                  <Edit2 size={14} />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT: Patient Drill-down Panel */}
            {selectedMed && (
              <div
                style={{
                  width: 400,
                  minWidth: 360,
                  borderLeft: '1.5px solid #e2e8f0',
                  backgroundColor: '#fff',
                  display: 'flex',
                  flexDirection: 'column',
                  animation: 'slideInRight 0.25s ease',
                  flexShrink: 0
                }}
              >
                {/* Panel Header */}
                <div className="px-4 py-3 border-bottom d-flex align-items-start justify-content-between" style={{ backgroundColor: '#f8fafc', flexShrink: 0 }}>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="d-flex align-items-center gap-2 mb-1">
                      <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                        style={{ width: 30, height: 30, backgroundColor: '#4f46e5', color: '#fff', fontSize: '0.8rem' }}>
                        {selectedMed.medicineName.charAt(0).toUpperCase()}
                      </div>
                      <div className="fw-bold text-dark" style={{ fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {selectedMed.medicineName}
                      </div>
                    </div>
                    <div className="small text-secondary">
                      {medPatients.length} patient{medPatients.length !== 1 ? 's' : ''} prescribed · {startDate} → {endDate}
                    </div>
                  </div>
                  <button className="btn btn-sm p-1 ms-2 flex-shrink-0"
                    style={{ color: '#64748b', backgroundColor: '#f1f5f9', border: 'none', borderRadius: 8 }}
                    onClick={() => { setSelectedMed(null); setMedPatients([]); }}>
                    <X size={16} />
                  </button>
                </div>

                {/* Summary strip */}
                <div className="d-flex border-bottom" style={{ backgroundColor: '#f8fafc', flexShrink: 0 }}>
                  <div className="flex-fill text-center py-2 border-end">
                    <div className="small text-secondary">Total Prescriptions</div>
                    <div className="fw-bold" style={{ color: '#4f46e5' }}>{selectedMed.count}</div>
                  </div>
                  <div className="flex-fill text-center py-2">
                    <div className="small text-secondary">Unique Patients</div>
                    <div className="fw-bold" style={{ color: '#4f46e5' }}>{medPatients.length}</div>
                  </div>
                </div>

                {/* Patient List */}
                <div style={{ flex: 1, overflowY: 'auto' }}>
                  {pLoading ? (
                    <div className="d-flex align-items-center justify-content-center py-5 gap-2">
                      <Loader size={18} className="text-secondary" style={{ animation: 'spin 1s linear infinite' }} />
                      <span className="text-secondary small">Loading patients…</span>
                    </div>
                  ) : medPatients.length === 0 ? (
                    <div className="text-center text-secondary py-5 small">
                      No patients found for this medicine in the selected date range.
                    </div>
                  ) : (
                    medPatients.map((p, idx) => {
                      const isExpanded = expandedPat === p.patientId;
                      return (
                        <div key={p.patientId || idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          {/* Patient row */}
                          <div
                            className="px-4 py-3 d-flex align-items-center gap-3"
                            style={{ cursor: 'pointer', transition: 'background 0.12s' }}
                            onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f8fafc'}
                            onMouseLeave={e => e.currentTarget.style.backgroundColor = 'transparent'}
                            onClick={() => setExpandedPat(isExpanded ? null : p.patientId)}
                          >
                            {/* Avatar */}
                            <div className="rounded-circle d-flex align-items-center justify-content-center fw-bold flex-shrink-0"
                              style={{ width: 38, height: 38, backgroundColor: '#ede9fe', color: '#6d28d9', fontSize: '0.85rem' }}>
                              {p.patientName?.charAt(0)?.toUpperCase() || '?'}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                <span className="fw-bold" style={{ color: '#1e293b', fontSize: '0.85rem' }}>{p.patientName}</span>
                                <span className="badge rounded-pill px-2 py-0"
                                  style={{ backgroundColor: '#ede9fe', color: '#5b21b6', fontSize: '0.67rem', fontWeight: 700 }}>
                                  #{p.patientId}
                                </span>
                              </div>
                              <div className="d-flex align-items-center gap-2 flex-wrap" style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {p.age && <span>{p.age} yrs</span>}
                                {p.gender && <span>· {p.gender}</span>}
                                {p.phone && <span>· {p.phone}</span>}
                              </div>
                              <div className="mt-1 d-flex align-items-center gap-1" style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                                <Clock size={11} />
                                <span>{p.prescriptions.length} visit{p.prescriptions.length !== 1 ? 's' : ''}</span>
                                <span className="ms-1 fw-semibold rounded-pill px-2"
                                  style={{ backgroundColor: '#f0fdf4', color: '#16a34a', fontSize: '0.7rem' }}>
                                  ×{p.totalCount} prescribed
                                </span>
                              </div>
                            </div>

                            {/* Expand chevron */}
                            <ChevronRight size={16} style={{ color: '#94a3b8', flexShrink: 0, transform: isExpanded ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s' }} />
                          </div>

                          {/* Expanded: prescription dates list */}
                          {isExpanded && (
                            <div style={{ backgroundColor: '#fafbff', borderTop: '1px solid #f1f5f9', padding: '0.5rem 1rem 0.75rem 1rem' }}>
                              <div className="small text-secondary fw-semibold mb-2 text-uppercase" style={{ fontSize: '0.68rem', letterSpacing: '0.5px' }}>
                                Prescription History
                              </div>
                              {p.prescriptions.map((rx, ri) => (
                                <div key={ri}
                                  className="d-flex align-items-center justify-content-between rounded-3 px-3 py-2 mb-1"
                                  style={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', cursor: rx.appointmentId ? 'pointer' : 'default' }}
                                  onMouseEnter={e => { if (rx.appointmentId) e.currentTarget.style.backgroundColor = '#eff6ff'; }}
                                  onMouseLeave={e => { e.currentTarget.style.backgroundColor = '#fff'; }}
                                  onClick={() => rx.appointmentId && openVisitPad(rx.appointmentId)}
                                  title={rx.appointmentId ? 'Click to open VisitPad in new tab' : ''}
                                >
                                  <div>
                                    <div className="fw-semibold" style={{ fontSize: '0.78rem', color: '#1e293b' }}>{fmtDate(rx.date)}</div>
                                    {rx.doctor && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>Dr. {rx.doctor}</div>}
                                  </div>
                                  {rx.appointmentId ? (
                                    <div className="d-flex align-items-center gap-1" style={{ fontSize: '0.7rem', color: '#2563eb', fontWeight: 600 }}>
                                      Open Visit <ExternalLink size={11} />
                                    </div>
                                  ) : (
                                    <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>No link</span>
                                  )}
                                </div>
                              ))}

                              {/* Quick open most recent visit */}
                              {p.lastAppointmentId && (
                                <button
                                  className="btn btn-sm w-100 mt-2 fw-semibold d-flex align-items-center justify-content-center gap-2"
                                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff', border: 'none', borderRadius: 8, fontSize: '0.78rem' }}
                                  onClick={() => openVisitPad(p.lastAppointmentId)}
                                >
                                  <ExternalLink size={13} />
                                  Open Latest Visit Pad
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Footer */}
                {medPatients.length > 0 && (
                  <div className="px-4 py-2 border-top text-center" style={{ backgroundColor: '#f8fafc', flexShrink: 0 }}>
                    <span className="small text-secondary">
                      <ExternalLink size={11} className="me-1" />
                      Click a patient to expand · Click a visit date to open VisitPad
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

export default MedicineHistoryModal;
