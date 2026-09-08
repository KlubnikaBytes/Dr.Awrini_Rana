import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, Calendar, Search, Pill, Edit2, CheckCircle } from 'lucide-react';
import reportService from '../services/reportService';
import { getLocalDateString } from '../utils/dateUtils';

const MedicineHistoryModal = ({ onClose }) => {
  const [startDate, setStartDate] = useState(getLocalDateString());
  const [endDate, setEndDate]     = useState(getLocalDateString());
  const [loading, setLoading]     = useState(false);
  const [data, setData]           = useState([]);
  
  const [searchTerm, setSearchTerm] = useState('');
  
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editCompany, setEditCompany] = useState('');
  const [editMrName, setEditMrName] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchHistory = useCallback(async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const s = searchTerm.toLowerCase();
      return (
        (item.medicineName || '').toLowerCase().includes(s) ||
        (item.company || '').toLowerCase().includes(s) ||
        (item.mrName || '').toLowerCase().includes(s)
      );
    });
  }, [data, searchTerm]);

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
      // update local state
      const newData = [...data];
      newData[index].company = editCompany;
      newData[index].mrName = editMrName;
      setData(newData);
      setEditingIndex(-1);
    } catch (err) {
      alert('Error saving details');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(15, 23, 42, 0.65)', backdropFilter: 'blur(4px)', zIndex: 1060 }}>
      <div className="modal-dialog modal-xl modal-dialog-centered modal-dialog-scrollable" style={{ maxWidth: 1150 }}>
        <div className="modal-content border-0 shadow-lg" style={{ borderRadius: 20, overflow: 'hidden', height: '85vh' }}>
          
          {/* Premium Header */}
          <div className="px-4 py-4" style={{ background: 'linear-gradient(135deg, #3b82f6, #6366f1, #8b5cf6)', position: 'relative', overflow: 'hidden' }}>
            <div className="position-absolute" style={{ top: -20, right: -20, opacity: 0.1, transform: 'rotate(15deg)' }}>
              <Pill size={180} color="#ffffff" />
            </div>
            
            <div className="d-flex flex-column flex-lg-row align-items-start align-items-lg-center justify-content-between position-relative z-index-1 gap-3">
              <div className="d-flex align-items-center gap-3">
                <div className="bg-white rounded-circle d-flex align-items-center justify-content-center shadow-sm" style={{ width: 56, height: 56, padding: '10px', flexShrink: 0 }}>
                  <Pill size={28} className="text-indigo" style={{ color: '#6366f1' }} />
                </div>
                <div>
                  <h4 className="text-white fw-bold mb-1" style={{ letterSpacing: '-0.5px' }}>Medicine Prescriptions</h4>
                  <div className="text-white text-opacity-75 small fw-medium">Monitor pharmacy movement & mapped MR/Company data</div>
                </div>
              </div>
              
              <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center gap-3 w-100" style={{ maxWidth: 'auto' }}>
                <div className="d-flex flex-column flex-sm-row align-items-stretch align-items-sm-center bg-white bg-opacity-25 rounded-3 rounded-md-pill p-1 px-3 gap-2 border border-white border-opacity-25 shadow-sm flex-grow-1" style={{ backdropFilter: 'blur(10px)' }}>
                  <div className="d-none d-sm-flex align-items-center">
                    <Calendar size={16} className="text-white" />
                  </div>
                  <input type="date" className="bg-transparent border-0 text-white fw-semibold shadow-none p-1 mx-1 flex-grow-1" 
                    style={{ fontSize: '0.85rem', colorScheme: 'dark', outline: 'none' }} 
                    value={startDate} onChange={e => setStartDate(e.target.value)} />
                  <span className="text-white text-opacity-75 small fw-bold mx-1 text-center d-none d-sm-inline">to</span>
                  <input type="date" className="bg-transparent border-0 text-white fw-semibold shadow-none p-1 mx-1 flex-grow-1" 
                    style={{ fontSize: '0.85rem', colorScheme: 'dark', outline: 'none' }} 
                    value={endDate} onChange={e => setEndDate(e.target.value)} />
                </div>
                <button className="btn btn-light rounded-circle p-2 shadow-sm d-flex align-items-center justify-content-center align-self-end align-self-sm-center flex-shrink-0" style={{ width: 40, height: 40 }} onClick={onClose}>
                  <X size={20} className="text-secondary" />
                </button>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="modal-body p-0 d-flex flex-column" style={{ backgroundColor: '#f8fafc' }}>
            
            {/* Toolbar */}
            <div className="border-bottom bg-white px-4 py-3 d-flex flex-column flex-md-row align-items-md-center justify-content-between gap-3">
              <div className="position-relative w-100" style={{ maxWidth: '400px' }}>
                <Search size={18} className="position-absolute text-muted" style={{ top: '50%', left: 16, transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  className="form-control bg-light border-0 ps-5 py-2 rounded-pill shadow-none w-100" 
                  placeholder="Search medicine, company, or MR..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ fontSize: '0.9rem', color: '#334155' }}
                />
              </div>
              <div className="d-flex align-items-center gap-4 justify-content-between justify-content-md-end w-100" style={{ maxWidth: '400px' }}>
                <div className="d-flex flex-column align-items-start align-items-md-end">
                  <span className="text-secondary small fw-medium text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Total Prescriptions</span>
                  <h4 className="fw-black mb-0 text-indigo" style={{ color: '#4f46e5' }}>{filteredData.reduce((acc, curr) => acc + curr.count, 0)}</h4>
                </div>
                <div style={{ width: 1, height: 30, backgroundColor: '#e2e8f0' }}></div>
                <div className="d-flex flex-column align-items-end">
                  <span className="text-secondary small fw-medium text-uppercase" style={{ letterSpacing: '0.5px', fontSize: '0.7rem' }}>Unique Medicines</span>
                  <h4 className="fw-black mb-0 text-dark">{filteredData.length}</h4>
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="flex-grow-1 position-relative" style={{ overflowY: 'auto' }}>
               <table className="table table-hover align-middle mb-0" style={{ fontSize: '0.9rem' }}>
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#f1f5f9', zIndex: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <tr>
                      <th className="py-3 px-4 text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px' }}>Medicine Details</th>
                      <th className="py-3 text-center text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '15%' }}>Count</th>
                      <th className="py-3 px-3 text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '25%' }}>Pharma Company</th>
                      <th className="py-3 px-3 text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '20%' }}>MR Name</th>
                      <th className="py-3 text-center text-secondary fw-semibold border-0 text-uppercase" style={{ fontSize: '0.75rem', letterSpacing: '0.5px', width: '10%' }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan="5" className="text-center py-5 text-secondary border-0">
                        <div className="spinner-border spinner-border-sm text-primary mb-2"></div>
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
                        const isEditing = editingIndex === originalIndex;
                        
                        return (
                          <tr key={i} className="border-bottom" style={{ transition: 'background-color 0.2s', backgroundColor: isEditing ? '#f8fafc' : 'transparent' }}>
                            <td className="px-4 py-3">
                              <div className="d-flex align-items-center gap-3">
                                <div className="bg-indigo bg-opacity-10 rounded-circle d-flex align-items-center justify-content-center text-indigo fw-bold" 
                                     style={{ width: 40, height: 40, color: '#4f46e5', backgroundColor: '#eef2ff' }}>
                                  {item.medicineName.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold text-dark" style={{ fontSize: '1rem' }}>{item.medicineName}</div>
                                  <div className="text-muted small fw-medium">{item.genericName || 'No Generic Map'}</div>
                                </div>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge rounded-pill fw-bold" style={{ backgroundColor: '#f1f5f9', color: '#475569', fontSize: '0.9rem', padding: '0.4rem 0.8rem' }}>
                                {item.count}
                              </span>
                            </td>
                            <td className="px-3" style={{ minWidth: '160px' }}>
                              {isEditing ? (
                                <input type="text" className="form-control form-control-sm border-0 shadow-sm rounded-3 px-3 py-2 w-100" style={{ backgroundColor: '#ffffff', color: '#1e293b' }} placeholder="Company Name" value={editCompany} onChange={e => setEditCompany(e.target.value)} />
                              ) : (
                                <div className="fw-semibold text-dark">{item.company || <span className="text-muted small fw-medium fst-italic">Not Assigned</span>}</div>
                              )}
                            </td>
                            <td className="px-3" style={{ minWidth: '160px' }}>
                              {isEditing ? (
                                <input type="text" className="form-control form-control-sm border-0 shadow-sm rounded-3 px-3 py-2 w-100" style={{ backgroundColor: '#ffffff', color: '#1e293b' }} placeholder="MR Name" value={editMrName} onChange={e => setEditMrName(e.target.value)} />
                              ) : (
                                <div className="fw-semibold text-dark">{item.mrName || <span className="text-muted small fw-medium fst-italic">Not Assigned</span>}</div>
                              )}
                            </td>
                            <td className="text-center">
                              {isEditing ? (
                                <button disabled={saving} onClick={() => handleSave(item, originalIndex)} className="btn btn-sm btn-success rounded-circle p-2 shadow-sm border-0 d-flex align-items-center justify-content-center mx-auto" style={{ width: 32, height: 32 }}>
                                  <CheckCircle size={16} />
                                </button>
                              ) : (
                                <button onClick={() => handleEditClick(originalIndex, item)} className="btn btn-sm btn-white rounded-circle p-2 text-primary shadow-sm border d-flex align-items-center justify-content-center mx-auto" style={{ width: 32, height: 32 }}>
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
        </div>
      </div>
    </div>
  );
};

export default MedicineHistoryModal;
