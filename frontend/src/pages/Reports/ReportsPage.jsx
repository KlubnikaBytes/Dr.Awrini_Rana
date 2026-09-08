import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Calendar, Search, Download, BarChart2, Pill } from 'lucide-react';
import reportService from '../../services/reportService';
import Navbar from '../../components/Navbar';
import CareAnalyticsModal from '../../components/CareAnalyticsModal';
import MedicineHistoryModal from '../../components/MedicineHistoryModal';
import './ReportsPage.css';
import { getLocalDateString } from '../../utils/dateUtils';

const SummaryColumn = ({ title, data, onAnalyze, actionLabel = 'Detailed Analysis' }) => (
  <div className="hp-report-col">
    <h6 className="hp-report-col-title">{title}</h6>
    <div className="hp-report-col-content">
      <div className="d-flex justify-content-between mb-3">
        <span className="text-secondary">Total Billed</span>
        <span className="fw-bold">{data?.billed || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-4">
        <span className="text-secondary">Total Collected</span>
        <span className="fw-bold">{data?.collected || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 small">
        <span className="text-secondary">Cash</span>
        <span className="fw-bold">{data?.cash || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 small">
        <span className="text-secondary">Card</span>
        <span className="fw-bold">{data?.card || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 small">
        <span className="text-secondary">Wallet</span>
        <span className="fw-bold">{data?.wallet || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 small">
        <span className="text-secondary">Cheque</span>
        <span className="fw-bold">{data?.cheque || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 small">
        <span className="text-secondary">Bank Transfer</span>
        <span className="fw-bold">{data?.bank || 0}</span>
      </div>
      <div className="d-flex justify-content-between mb-2 small">
        <span className="text-secondary">Insurance</span>
        <span className="fw-bold">{data?.insurance || 0}</span>
      </div>
      <div className="d-flex justify-content-between small">
        <span className="text-secondary">Patient App</span>
        <span className="fw-bold">{data?.app || 0}</span>
      </div>
      {onAnalyze && (
        <button className="btn btn-sm w-100 mt-3 shadow-sm text-white" 
          style={{ background: 'linear-gradient(135deg, #0f766e, #14b8a6)', fontWeight: 600, border: 'none', borderRadius: 8 }}
          onClick={onAnalyze}>
          <BarChart2 size={14} className="me-1" /> {actionLabel}
        </button>
      )}
    </div>
  </div>
);

const ReportsPage = () => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate] = useState(getLocalDateString());
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [referralData, setReferralData] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [analyticsSourceType, setAnalyticsSourceType] = useState(null);
  const [showMedicineModal, setShowMedicineModal] = useState(false);

  const handleDownload = () => {
    if (!reportData?.chartData?.length) { alert('No data to download. Please generate a report first.'); return; }
    const headers = ['Date', 'New Registrations', 'Billed Patients', 'Consultations', 'Lab', 'Others', 'Total Earnings'];
    const rows = reportData.chartData
      .filter(row => !searchTerm || row.dateRange.includes(searchTerm))
      .map(row => [
        row.dateRange.split(' to ')[0],
        row.newRegistrations,
        row.billedPatients,
        Math.round(row.consultations),
        Math.round(row.lab),
        Math.round(row.others),
        Math.round(row.totalEarnings)
      ]);
    const csvContent = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const fetchReport = async () => {
    setLoading(true);
    try {
      const [data, refData] = await Promise.all([
        reportService.getBillingReport(startDate, endDate),
        reportService.getReferralAnalytics(startDate, endDate).catch(() => null)
      ]);
      setReportData(data);
      setReferralData(refData);
    } catch (error) {
      console.error("Failed to load report", error);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReport();
  }, []); // Initial load

  return (
    <div style={{ backgroundColor: '#e2e7ec', minHeight: '100vh' }}>
      <Navbar />
      <div className="container-fluid px-3 px-md-5 py-3 py-md-4">
        
        {/* Page Header */}
        <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 pb-3 border-bottom border-light gap-3">
          <div>
            <h3 className="fw-bold text-dark mb-1" style={{ letterSpacing: '-0.5px' }}>Financial Reports</h3>
            <p className="text-secondary mb-0">Overview of organisation revenue and advanced analytics</p>
          </div>
          <button className="btn d-inline-flex align-items-center gap-2 fw-bold text-white shadow-sm border-0" 
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', borderRadius: '10px', padding: '10px 24px', letterSpacing: '0.5px' }}
            onClick={() => setShowMedicineModal(true)}>
             <Pill size={18} /> Medicine Analytics Engine
          </button>
        </div>

        {/* Filters Card */}
        <div className="card border-0 shadow-sm rounded-4 bg-white mb-4">
          <div className="card-body p-4">
            <h5 className="fw-bold text-dark mb-4">Organisation Report</h5>
            <div className="row align-items-end g-3">
              <div className="col-md-5">
                <label className="form-label small text-secondary fw-bold mb-2">Date Range</label>
                <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-2">
                  <div className="input-group bg-light rounded-3 overflow-hidden border border-light flex-grow-1">
                    <span className="input-group-text bg-transparent border-0 text-primary"><Calendar size={16} /></span>
                    <input 
                      type="date" 
                      className="form-control bg-transparent text-secondary border-0 fw-semibold shadow-none" 
                      value={startDate} 
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <span className="text-muted fw-bold small text-center d-none d-sm-block">to</span>
                  <div className="input-group bg-light rounded-3 overflow-hidden border border-light flex-grow-1">
                    <span className="input-group-text bg-transparent border-0 text-primary"><Calendar size={16} /></span>
                    <input 
                      type="date" 
                      className="form-control bg-transparent text-secondary border-0 fw-semibold shadow-none" 
                      value={endDate} 
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <label className="form-label small text-secondary fw-bold mb-2">Clinic Location</label>
                <select className="form-select bg-light border-light text-secondary fw-semibold shadow-none rounded-3 py-2">
                  <option>Presidency Division - mediplix</option>
                </select>
              </div>

              <div className="col-md-3">
                <button className="btn btn-primary fw-bold shadow-sm rounded-3 w-100 py-2 d-flex align-items-center justify-content-center" onClick={fetchReport} disabled={loading} style={{ letterSpacing: '0.5px' }}>
                  {loading ? (
                    <><span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Generating...</>
                  ) : 'GENERATE REPORT'}
                </button>
              </div>
            </div>
          </div>
        </div>

      {reportData && (
        <>
          <div className="bg-white mb-4 hp-report-summary-container shadow-sm">
            <SummaryColumn title="Total Billing-All Departments" data={reportData.summary.total} />
            <SummaryColumn title="Consultation Billing" data={reportData.summary.consultation} 
              onAnalyze={() => setAnalyticsSourceType('Consultation')} />
            <SummaryColumn title="Lab billing" data={reportData.summary.lab} 
              onAnalyze={() => setAnalyticsSourceType('Lab')} />
            <SummaryColumn title="Day Care Billing" data={reportData.summary.dayCare} 
              onAnalyze={() => setAnalyticsSourceType('DayCare')} />
            <SummaryColumn title="Home Care Billing" data={reportData.summary.homeCare} 
              onAnalyze={() => setAnalyticsSourceType('HomeCare')} />
            <SummaryColumn title="Other Billing" data={reportData.summary.other} />
          </div>

          <div className="card shadow-sm border-0 mb-4 bg-white rounded-0">
            <div className="card-body p-4" style={{ height: 400, width: '100%' }}>
              <ResponsiveContainer>
                <BarChart data={reportData.chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e0e0e0" />
                  <XAxis dataKey="dateRange" tick={{fill: '#888', fontSize: 12}} axisLine={{stroke: '#e0e0e0'}} tickLine={false} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#888', fontSize: 12}} dx={-10} tickFormatter={(val) => val >= 1000 ? `${val/1000}k` : val} />
                  <Tooltip cursor={{fill: '#f5f5f5'}} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} />
                  <Bar dataKey="newRegistrations" name="New Registrations" fill="#0088FE" barSize={50} />
                  <Bar dataKey="billedPatients" name="Billed Patients" fill="#333333" barSize={50} />
                  <Bar dataKey="consultations" name="Consultations" fill="#7bed9f" barSize={50} />
                  <Bar dataKey="lab" name="Lab" fill="#ffb8b8" barSize={50} />
                  <Bar dataKey="dayCare" name="Day Care" fill="#ff9f43" barSize={50} />
                  <Bar dataKey="homeCare" name="Home Care" fill="#cd84f1" barSize={50} />
                  <Bar dataKey="others" name="Others" fill="#70a1ff" barSize={50} />
                  <Bar dataKey="totalEarnings" name="Total Earnings" fill="#ff4757" barSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card shadow-sm border-0 rounded-0 mb-4">
            <div className="card-header bg-white border-bottom p-3 d-flex justify-content-between align-items-center">
              <div className="input-group input-group-sm" style={{ width: '250px' }}>
                <span className="input-group-text bg-white border-end-0 text-secondary"><Search size={14} /></span>
                <input type="text" className="form-control border-start-0 ps-0" placeholder="Search" />
              </div>
                <div className="d-flex align-items-center gap-3">
                  <span className="text-secondary small">1 - {reportData?.chartData?.length || 0} of {reportData?.chartData?.length || 0}</span>
                  <button
                    className="btn btn-sm btn-light text-primary border d-flex align-items-center gap-1"
                    onClick={handleDownload}
                    title="Download CSV"
                  >
                    <Download size={14} /> CSV
                  </button>
                </div>
            </div>
            <div className="table-responsive">
              <table className="table table-hover mb-0 hp-report-table align-middle text-secondary">
                <thead className="bg-light">
                  <tr>
                    <th className="fw-bold py-3">Date</th>
                    <th className="fw-bold py-3">New Registrations</th>
                    <th className="fw-bold py-3">Billed Patients</th>
                    <th className="fw-bold py-3">Consultations</th>
                    <th className="fw-bold py-3">Lab</th>
                    <th className="fw-bold py-3">Day Care</th>
                    <th className="fw-bold py-3">Home Care</th>
                    <th className="fw-bold py-3">Others</th>
                    <th className="fw-bold py-3">Total Earnings</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.chartData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="py-3">{row.dateRange.split(' to ')[0]}</td>
                      <td className="py-3">{row.newRegistrations}</td>
                      <td className="py-3">{row.billedPatients}</td>
                      <td className="py-3">{Math.round(row.consultations)}</td>
                      <td className="py-3">{Math.round(row.lab)}</td>
                      <td className="py-3">{Math.round(row.dayCare)}</td>
                      <td className="py-3">{Math.round(row.homeCare)}</td>
                      <td className="py-3">{Math.round(row.others)}</td>
                      <td className="py-3 fw-bold text-dark">{Math.round(row.totalEarnings)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {reportData.tieUpReport && reportData.tieUpReport.length > 0 && (
            <div className="card shadow-sm border-0 rounded-0 mb-4">
              <div className="card-header bg-white border-bottom p-3">
                <h6 className="m-0 fw-bold text-secondary">Tie-Up Organizations Lab Revenue</h6>
              </div>
              <div className="table-responsive">
                <table className="table table-hover mb-0 hp-report-table align-middle text-secondary">
                  <thead className="bg-light">
                    <tr>
                      <th className="fw-bold py-3">Organization Name</th>
                      <th className="fw-bold py-3">Lab Orders Count</th>
                      <th className="fw-bold py-3">Total Billed Amount</th>
                      <th className="fw-bold py-3">Total Collected Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.tieUpReport.map((row, idx) => (
                      <tr key={idx}>
                        <td className="py-3 fw-semibold text-dark">{row.organization}</td>
                        <td className="py-3">{row.count}</td>
                        <td className="py-3">₹{Math.round(row.billed)}</td>
                        <td className="py-3 text-success fw-bold">₹{Math.round(row.collected)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {referralData && (referralData.referredByStats?.length > 0 || referralData.referredToStats?.length > 0) && (
            <div className="row mb-4">
              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-0 h-100">
                  <div className="card-header bg-white border-bottom p-3">
                    <h6 className="m-0 fw-bold text-secondary">Top Referring Doctors (To Clinic)</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 hp-report-table align-middle text-secondary">
                      <thead className="bg-light">
                        <tr>
                          <th className="fw-bold py-3">Doctor Name</th>
                          <th className="fw-bold py-3 text-end">Patients Referred</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(referralData.referredByStats || []).map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-3 fw-semibold text-dark">Dr. {row.doctorName}</td>
                            <td className="py-3 text-end fw-bold text-primary">{row.count}</td>
                          </tr>
                        ))}
                        {(!referralData.referredByStats || referralData.referredByStats.length === 0) && (
                          <tr><td colSpan="2" className="text-center py-4">No data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div className="col-md-6">
                <div className="card shadow-sm border-0 rounded-0 h-100">
                  <div className="card-header bg-white border-bottom p-3">
                    <h6 className="m-0 fw-bold text-secondary">Top Referred Doctors (From Clinic)</h6>
                  </div>
                  <div className="table-responsive">
                    <table className="table table-hover mb-0 hp-report-table align-middle text-secondary">
                      <thead className="bg-light">
                        <tr>
                          <th className="fw-bold py-3">Doctor Name</th>
                          <th className="fw-bold py-3 text-end">Patients Sent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(referralData.referredToStats || []).map((row, idx) => (
                          <tr key={idx}>
                            <td className="py-3 fw-semibold text-dark">Dr. {row.doctorName}</td>
                            <td className="py-3 text-end fw-bold text-success">{row.count}</td>
                          </tr>
                        ))}
                        {(!referralData.referredToStats || referralData.referredToStats.length === 0) && (
                          <tr><td colSpan="2" className="text-center py-4">No data available</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      </div>

      {analyticsSourceType && (
        <CareAnalyticsModal
          sourceType={analyticsSourceType}
          onClose={() => setAnalyticsSourceType(null)}
          accentColor={
            analyticsSourceType === 'DayCare' ? '#b45309' : 
            analyticsSourceType === 'Consultation' ? '#059669' :
            analyticsSourceType === 'Lab' ? '#dc2626' :
            '#0f766e'
          }
          accentBg={
            analyticsSourceType === 'DayCare' ? 'linear-gradient(135deg,#92400e,#d97706)' : 
            analyticsSourceType === 'Consultation' ? 'linear-gradient(135deg,#047857,#10b981)' :
            analyticsSourceType === 'Lab' ? 'linear-gradient(135deg,#b91c1c,#ef4444)' :
            'linear-gradient(135deg,#0f766e,#14b8a6)'
          }
        />
      )}
      
      {showMedicineModal && (
        <MedicineHistoryModal onClose={() => setShowMedicineModal(false)} />
      )}
    </div>
  );
};
const InfoIcon = ({ className }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

export default ReportsPage;
