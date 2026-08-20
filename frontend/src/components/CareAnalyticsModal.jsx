import React, { useState, useEffect, useCallback } from 'react';
import { X, Calendar, Search, DollarSign, Users, Activity, BarChart2, CheckCircle, AlertCircle } from 'lucide-react';
import reportService from '../services/reportService';
import { getLocalDateString } from '../utils/dateUtils';

const CareAnalyticsModal = ({ sourceType, onClose, accentColor = '#0f766e', accentBg = 'linear-gradient(135deg,#0f766e,#14b8a6)' }) => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate]     = useState(getLocalDateString());
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState(null);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const fmt = (val) => `₹ ${(val || 0).toFixed(2)}`;

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: 1100, margin: '1.5rem auto' }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 16, overflow: 'hidden', minHeight: 650 }}>
          
          {/* Header */}
          <div className="d-flex align-items-center justify-content-between px-4 py-3" style={{ background: accentBg }}>
            <div className="d-flex align-items-center gap-3">
              <div className="bg-white bg-opacity-25 rounded-3 d-flex align-items-center justify-content-center" style={{ width: 46, height: 46 }}>
                <BarChart2 size={24} className="text-white" />
              </div>
              <div>
                <div className="text-white fw-bold fs-5">{sourceType === 'DayCare' ? 'Day Care' : 'Home Care'} Analytics</div>
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

          {/* Body */}
          <div className="p-4" style={{ backgroundColor: '#f8fafc', flexGrow: 1, overflowY: 'auto' }}>
            {loading ? (
              <div className="d-flex justify-content-center align-items-center h-100 py-5">
                <span className="spinner-border spinner-border-sm me-2" style={{ color: accentColor }}></span>
                <span className="text-secondary fw-semibold">Crunching numbers...</span>
              </div>
            ) : !data ? null : (
              <>
                {/* Grand Summary Cards */}
                <div className="row g-4 mb-4">
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
                      <div className="card-body p-4 position-relative">
                        <div className="position-absolute top-0 end-0 p-3 opacity-10"><DollarSign size={80} /></div>
                        <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Billed</h6>
                        <h3 className="fw-black mb-1 mt-2" style={{ color: '#334155' }}>{fmt(data.summary.totalBilled)}</h3>
                        <div className="small fw-semibold mt-2" style={{ color: accentColor }}>Across {data.billsCount} bills generated</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ borderBottom: '4px solid #10b981' }}>
                      <div className="card-body p-4 position-relative">
                        <div className="position-absolute top-0 end-0 p-3 opacity-10"><CheckCircle size={80} color="#10b981" /></div>
                        <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Total Collected</h6>
                        <h3 className="fw-black mb-1 mt-2 text-success">{fmt(data.summary.totalCollected)}</h3>
                        <div className="small fw-semibold mt-2 text-success opacity-75">Actual revenue received</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden" style={{ borderBottom: '4px solid #ef4444' }}>
                      <div className="card-body p-4 position-relative">
                        <div className="position-absolute top-0 end-0 p-3 opacity-10"><AlertCircle size={80} color="#ef4444" /></div>
                        <h6 className="text-secondary fw-bold text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Outstanding Balance</h6>
                        <h3 className="fw-black mb-1 mt-2 text-danger">{fmt(data.summary.totalBalance)}</h3>
                        <div className="small fw-semibold mt-2 text-danger opacity-75">Pending payments to collect</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="row g-4">
                  {/* Collector Analysis */}
                  <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-header bg-white border-bottom-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2">
                        <Users size={18} style={{ color: accentColor }} />
                        <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Collection by Staff</h6>
                      </div>
                      <div className="card-body px-4 pb-4 pt-2">
                        {data.collectorAnalytics.length === 0 ? (
                          <div className="text-secondary small text-center py-4 bg-light rounded-3">No staff collection data found</div>
                        ) : (
                          <div className="table-responsive rounded-3 border">
                            <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                              <thead style={{ backgroundColor: '#f1f5f9' }}>
                                <tr>
                                  <th className="text-secondary py-3 px-3">Staff / Collector</th>
                                  <th className="text-secondary py-3 text-center">Bills</th>
                                  <th className="text-secondary py-3 text-end">Billed</th>
                                  <th className="text-secondary py-3 text-end text-success">Collected</th>
                                  <th className="text-secondary py-3 text-end text-danger px-3">Due</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.collectorAnalytics.map((c, i) => (
                                  <tr key={i} className="border-bottom">
                                    <td className="fw-bold px-3 py-3" style={{ color: '#334155' }}>{c.name}</td>
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

                  {/* Service/Test Analysis */}
                  <div className="col-lg-6">
                    <div className="card border-0 shadow-sm rounded-4 h-100">
                      <div className="card-header bg-white border-bottom-0 pt-4 pb-2 px-4 d-flex align-items-center gap-2">
                        <Activity size={18} style={{ color: accentColor }} />
                        <h6 className="fw-bold mb-0" style={{ color: '#1e293b' }}>Revenue by Service / Item</h6>
                      </div>
                      <div className="card-body px-4 pb-4 pt-2">
                        {data.serviceAnalytics.length === 0 ? (
                          <div className="text-secondary small text-center py-4 bg-light rounded-3">No service data found</div>
                        ) : (
                          <div className="table-responsive rounded-3 border">
                            <table className="table table-hover table-borderless align-middle mb-0" style={{ fontSize: '0.85rem' }}>
                              <thead style={{ backgroundColor: '#f1f5f9' }}>
                                <tr>
                                  <th className="text-secondary py-3 px-3">Service / Test</th>
                                  <th className="text-secondary py-3 text-center">Qty Rendered</th>
                                  <th className="text-secondary py-3 text-end px-3">Revenue Billed</th>
                                </tr>
                              </thead>
                              <tbody>
                                {data.serviceAnalytics.map((s, i) => (
                                  <tr key={i} className="border-bottom">
                                    <td className="fw-bold px-3 py-3" style={{ color: '#334155' }}>{s.name}</td>
                                    <td className="text-center fw-semibold text-secondary">{s.qty}</td>
                                    <td className="text-end fw-bold px-3" style={{ color: accentColor }}>{fmt(s.revenue)}</td>
                                  </tr>
                                ))}
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
          
        </div>
      </div>
    </div>
  );
};

export default CareAnalyticsModal;
