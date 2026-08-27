import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Microscope, FileText, Calendar, User } from 'lucide-react';

const API = `${import.meta.env.VITE_API_URL}/laborders/`;
const cfg = () => ({
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
    'x-clinic-id': localStorage.getItem('clinicId'),
  },
});

const CAT_COLORS = {
  'HAEMATOLOGY':    '#dc2626',
  'BIO CHEMISTRY':  '#2563eb',
  'URINE ROUTINE':  '#7c3aed',
  'LIPID PROFILE':  '#059669',
  'THYROID':        '#d97706',
  'PCOS / Infertility': '#ec4899',
};

const LabTab = ({ patient }) => {
  const [activeSubTab, setActiveSubTab] = useState('mediplix Reports');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    if (!patient) return;
    const fetchLabOrders = async () => {
      setLoading(true);
      try {
        // Fetch all lab orders and filter by patient phone or uhid
        const res = await axios.get(API, cfg());
        const all = Array.isArray(res.data) ? res.data : (res.data?.orders || []);
        // Match by phone, uhid, or patient name
        const filtered = all.filter(order =>
          (patient.phone && order.patientPhone && order.patientPhone === patient.phone) ||
          (patient.patientId && order.uhid && order.uhid === patient.patientId) ||
          (patient.name && order.patientName && order.patientName.toLowerCase() === patient.name.toLowerCase())
        );
        setOrders(filtered);
      } catch (err) {
        console.error('Failed to fetch lab orders:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchLabOrders();
  }, [patient]);

  const fmt = (d) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

  return (
    <div className="d-flex flex-column h-100 bg-white">
      {/* Top Tabs */}
      <div className="d-flex border-bottom px-3 pt-2">
        <button
          className={`btn border-0 rounded-0 px-3 py-2 fw-semibold ${activeSubTab === 'mediplix Reports' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'mediplix Reports' ? '2.5px solid #0d6efd' : '2.5px solid transparent', fontSize: '0.88rem' }}
          onClick={() => setActiveSubTab('mediplix Reports')}
        >
          <Microscope size={14} className="me-1" />mediplix Reports
        </button>
        <button
          className={`btn border-0 rounded-0 px-3 py-2 fw-semibold ${activeSubTab === 'Uploaded Reports' ? 'text-primary' : 'text-muted'}`}
          style={{ borderBottom: activeSubTab === 'Uploaded Reports' ? '2.5px solid #0d6efd' : '2.5px solid transparent', fontSize: '0.88rem' }}
          onClick={() => setActiveSubTab('Uploaded Reports')}
        >
          <FileText size={14} className="me-1" />Uploaded Reports
        </button>
      </div>

      {/* Content */}
      <div className="flex-grow-1 overflow-auto bg-light p-3">
        {activeSubTab === 'mediplix Reports' ? (
          <>
            {loading ? (
              <div className="text-center text-muted mt-5">Loading lab reports…</div>
            ) : orders.length === 0 ? (
              <div className="text-center mt-5">
                <Microscope size={40} className="text-muted mb-3" />
                <div className="fw-semibold text-secondary mb-1">No Lab Reports Found</div>
                <div className="text-muted small">No lab orders registered for this patient yet.</div>
              </div>
            ) : (
              <div className="d-flex flex-column gap-3">
                {orders.map(order => {
                  const isOpen = expanded === order._id;
                  const done = (order.tests || []).filter(t => t.value).length;
                  const total = (order.tests || []).length;
                  const grouped = {};
                  (order.tests || []).forEach(t => {
                    if (!grouped[t.category]) grouped[t.category] = [];
                    grouped[t.category].push(t);
                  });
                  return (
                    <div
                      key={order._id}
                      className="bg-white rounded-3 shadow-sm border"
                      style={{ overflow: 'hidden' }}
                    >
                      {/* Order header row */}
                      <div
                        className="d-flex align-items-center justify-content-between px-3 py-3"
                        style={{ cursor: 'pointer', borderBottom: isOpen ? '1px solid #e2e8f0' : 'none' }}
                        onClick={() => setExpanded(isOpen ? null : order._id)}
                      >
                        <div className="d-flex align-items-center gap-3">
                          <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white"
                            style={{ width: 38, height: 38, background: 'linear-gradient(135deg,#1e3a5f,#2563eb)', fontSize: '0.8rem', fontWeight: 700 }}
                          >
                            {patient?.name?.charAt(0)?.toUpperCase() || '?'}
                          </div>
                          <div>
                            <div className="fw-bold text-dark" style={{ fontSize: '0.88rem' }}>
                              {order.patientName}
                            </div>
                            <div className="text-muted d-flex align-items-center gap-2" style={{ fontSize: '0.74rem' }}>
                              <Calendar size={11} className="me-1" />{fmt(order.orderedDate)}
                              {order.referredBy && <><span className="mx-1">·</span>👨‍⚕️ {order.referredBy}</>}
                              <span className="mx-1">·</span>🧪 {order.sampleType}
                            </div>
                          </div>
                        </div>
                        <div className="d-flex align-items-center gap-2">
                          {/* Category pills */}
                          {Object.keys(grouped).slice(0, 3).map(cat => (
                            <span key={cat} className="badge rounded-pill px-2 py-1" style={{ backgroundColor: `${CAT_COLORS[cat] || '#64748b'}20`, color: CAT_COLORS[cat] || '#64748b', fontSize: '0.65rem', fontWeight: 700 }}>
                              {cat.split(' ')[0]}
                            </span>
                          ))}
                          <span className={`badge rounded-pill px-2 py-1 ${order.status === 'Completed' ? 'bg-success' : order.status === 'Processing' ? 'bg-warning text-dark' : 'bg-secondary'}`} style={{ fontSize: '0.68rem' }}>
                            {order.status}
                          </span>
                          <span className="text-muted small">{done}/{total} ▸</span>
                        </div>
                      </div>

                      {/* Expanded: test results */}
                      {isOpen && (
                        <div className="p-3">
                          {Object.entries(grouped).map(([cat, tests]) => (
                            <div key={cat} className="mb-3">
                              <div className="fw-bold rounded px-2 py-1 d-inline-block mb-2 text-white" style={{ backgroundColor: CAT_COLORS[cat] || '#64748b', fontSize: '0.72rem' }}>{cat}</div>
                              <table className="table table-sm mb-0" style={{ fontSize: '0.82rem' }}>
                                <thead><tr style={{ backgroundColor: '#f8fafc' }}>
                                  <th className="text-muted fw-semibold py-1" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Test</th>
                                  <th className="text-muted fw-semibold py-1 text-center" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 100 }}>Result</th>
                                  <th className="text-muted fw-semibold py-1 text-center" style={{ fontSize: '0.7rem', textTransform: 'uppercase', width: 70 }}>Unit</th>
                                </tr></thead>
                                <tbody>
                                  {tests.map((t, i) => (
                                    <tr key={i}>
                                      <td className="py-1 text-dark" style={{ fontSize: '0.82rem' }}>{t.name}</td>
                                      <td className="py-1 text-center fw-bold" style={{ color: t.value ? CAT_COLORS[cat] || '#1d4ed8' : '#94a3b8', fontSize: '0.82rem' }}>
                                        {t.value || '—'}
                                      </td>
                                      <td className="py-1 text-center text-muted" style={{ fontSize: '0.75rem' }}>{t.unit || ''}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ))}
                          {/* Bill status strip */}
                          <div className="d-flex align-items-center gap-2 mt-2 pt-2 border-top">
                            <span className="text-muted small">Bill Status:</span>
                            <span className={`badge rounded-pill ${order.billStatus === 'Paid' ? 'bg-success' : order.billStatus === 'Partial' ? 'bg-warning text-dark' : 'bg-secondary'}`} style={{ fontSize: '0.7rem' }}>
                              {order.billStatus || 'Unbilled'}
                            </span>
                            {order.finalAmount > 0 && <span className="text-muted small">₹{order.finalAmount?.toFixed(2)}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="text-center mt-5">
            <FileText size={40} className="text-muted mb-3" />
            <div className="fw-semibold text-secondary mb-1">No Uploaded Reports</div>
            <div className="text-muted small">No reports have been uploaded for this patient.</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabTab;
