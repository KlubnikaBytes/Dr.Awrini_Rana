import React, { useState, useEffect } from 'react';
import doctorService from '../../services/doctorService';
import { Search, Plus, FlaskConical } from 'lucide-react';
import TestResultModal from './TestResultModal';
import { getLocalDateString } from '../../utils/dateUtils';

const TestChart = ({ patientId, appointmentId, patientInfo, onBack }) => {
  const [testResults, setTestResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchTests = async () => {
    setLoading(true);
    try {
      const data = await doctorService.getPatientTests(patientId);
      setTestResults(data);
    } catch (error) {
      console.error('Error fetching patient tests', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTests();
  }, [patientId]);

  // Extract all unique dates and tests, tracking source (lab vs manual)
  const allTests = [];
  testResults.forEach(tr => {
    if (tr.tests && tr.tests.length > 0) {
      tr.tests.forEach(t => {
        allTests.push({ ...t, source: tr.source || 'manual' });
      });
    }
  });

  // Sort tests by date
  allTests.sort((a, b) => new Date(a.date) - new Date(b.date));

  const dates = [...new Set(allTests.map(t => getLocalDateString(new Date(t.date))))];
  let testNames = [...new Set(allTests.map(t => t.name))];
  
  if (searchTerm) {
    testNames = testNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));
  }

  const formatDate = (dateString) => {
    const d = new Date(dateString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate().toString().padStart(2, '0')}-${months[d.getMonth()]}-${d.getFullYear().toString().slice(-2)}`;
  };

  const getTestEntry = (name, date) => {
    const tests = allTests.filter(t => t.name === name && getLocalDateString(new Date(t.date)) === date);
    if (tests.length > 0) {
      return tests[tests.length - 1]; 
    }
    return null;
  };
  
  const getTestUnit = (name) => {
    const test = allTests.find(t => t.name === name && t.unit);
    return test ? test.unit : '';
  };

  // Does any test with this name come from the lab module?
  const isLabTest = (name) => allTests.some(t => t.name === name && t.source === 'lab');

  const handleModalSuccess = () => {
    setIsModalOpen(false);
    fetchTests();
  };

  // Count lab vs manual results for summary
  const labCount = testResults.filter(tr => tr.source === 'lab').reduce((acc, tr) => acc + (tr.tests?.length || 0), 0);
  const manualCount = testResults.filter(tr => !tr.source || tr.source === 'manual').reduce((acc, tr) => acc + (tr.tests?.length || 0), 0);

  return (
    <div className="d-flex flex-column h-100 bg-white">
      <div className="px-3 py-2 text-center text-success" style={{ fontSize: '0.85rem', backgroundColor: '#d1fae5' }}>
        Scheduled maintenance on Sat(25th July) 10:30 PM-1:00 AM.Please contact support if you face any issues.
      </div>

      <div className="flex-grow-1 overflow-auto p-4 mx-auto w-100" style={{ maxWidth: '1200px' }}>
        <div className="mb-4">
          <div className="d-flex align-items-center gap-2 mb-3">
             <span className="text-secondary">Test ({patientInfo?.name || 'Patient'} - {patientInfo?.gender === 'Male' ? 'M' : 'F'}, {patientInfo?.age || '0'} yrs - Wt: {patientInfo?.weight || '-'} Kg)</span>
          </div>
          <button className="btn btn-outline-primary btn-sm px-3 py-1 bg-white" onClick={onBack} style={{ borderRadius: '2px', fontWeight: 500 }}>
            &lt; Back to Patient Dashboard
          </button>
        </div>

        {/* Source Summary Badges */}
        {!loading && (labCount > 0 || manualCount > 0) && (
          <div className="d-flex gap-2 mb-3">
            {labCount > 0 && (
              <span className="badge d-flex align-items-center gap-1" style={{ backgroundColor: '#dbeafe', color: '#1d4ed8', fontSize: '0.8rem', padding: '5px 10px', borderRadius: '20px', fontWeight: 500 }}>
                <FlaskConical size={13} />
                {labCount} Lab Result{labCount !== 1 ? 's' : ''} from Lab Section
              </span>
            )}
            {manualCount > 0 && (
              <span className="badge d-flex align-items-center gap-1" style={{ backgroundColor: '#f0fdf4', color: '#15803d', fontSize: '0.8rem', padding: '5px 10px', borderRadius: '20px', fontWeight: 500 }}>
                ✓ {manualCount} Manually Entered Result{manualCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        )}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <div className="position-relative" style={{ width: '300px' }}>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Search Test" 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ borderRadius: '2px' }}
            />
            <Search size={16} className="text-secondary position-absolute" style={{ top: '10px', right: '10px' }} />
          </div>
          
          <div className="d-flex align-items-center gap-4">
            <div className="d-flex align-items-center gap-2">
              <span className="text-dark" style={{ fontSize: '0.9rem' }}>Print</span>
              <div className="form-check form-switch m-0">
                <input className="form-check-input" type="checkbox" role="switch" style={{ cursor: 'pointer' }} />
              </div>
            </div>
            <button 
              className="btn btn-primary d-flex align-items-center gap-1 shadow-sm px-4 fw-medium" 
              style={{ borderRadius: '2px', fontSize: '0.9rem' }}
              onClick={() => setIsModalOpen(true)}
            >
              <Plus size={16} /> Test Result
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center p-5 text-secondary">Loading test results...</div>
        ) : (
          <div className="bg-white">
            <table className="table table-borderless table-hover mb-0 w-100" style={{ fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#e2e8f0', color: '#1e293b' }}>
                  <th className="py-2 ps-3 fw-bold" style={{ width: '30%' }}>Test Name</th>
                  {dates.map(date => (
                    <th key={date} className="py-2 fw-bold text-center">{formatDate(date)}</th>
                  ))}
                  <th className="py-2 fw-bold text-center" style={{ width: '15%' }}>Graph</th>
                  <th className="py-2 pe-3 fw-bold text-center" style={{ width: '10%' }}>Units</th>
                </tr>
              </thead>
              <tbody>
                {testNames.length === 0 ? (
                  <tr>
                    <td colSpan={dates.length + 3} className="text-center py-5 text-secondary">
                      No test results found. Click &quot;+ Test Result&quot; to add.
                    </td>
                  </tr>
                ) : (
                  testNames.map((name, index) => (
                    <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#ffffff' : '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                      <td className="ps-3 py-2 text-dark">
                        <div className="d-flex align-items-center gap-2">
                          <span>{name}</span>
                          {isLabTest(name) && (
                            <span
                              title="Result from Lab Section"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                backgroundColor: '#dbeafe',
                                color: '#1d4ed8',
                                fontSize: '0.68rem',
                                padding: '1px 6px',
                                borderRadius: '10px',
                                fontWeight: 600,
                                whiteSpace: 'nowrap'
                              }}
                            >
                              <FlaskConical size={10} /> Lab
                            </span>
                          )}
                        </div>
                      </td>
                      {dates.map(date => {
                        const entry = getTestEntry(name, date);
                        return (
                          <td key={date} className="py-2 text-center text-dark">
                            {entry ? (
                              <span style={entry.source === 'lab' ? { color: '#1d4ed8', fontWeight: 500 } : {}}>
                                {entry.value}
                              </span>
                            ) : '-'}
                          </td>
                        );
                      })}
                      <td className="py-2 text-center">
                        <div className="d-flex justify-content-center align-items-center h-100">
                          <div style={{ width: '60px', height: '14px', backgroundColor: '#bae6fd', borderTop: '2px solid #38bdf8', borderBottom: '1px solid #e0e0e0', position: 'relative' }}>
                             {/* Simple decorative chart line to match screenshot */}
                             <div style={{ position: 'absolute', bottom: '0', width: '1px', height: '6px', left: '10px', backgroundColor: '#e0e0e0' }}></div>
                             <div style={{ position: 'absolute', bottom: '0', width: '1px', height: '6px', left: '30px', backgroundColor: '#e0e0e0' }}></div>
                             <div style={{ position: 'absolute', bottom: '0', width: '1px', height: '6px', right: '10px', backgroundColor: '#e0e0e0' }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-2 pe-3 text-center text-dark">{getTestUnit(name)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <TestResultModal 
          appointment={{ _id: appointmentId, patient: patientInfo }} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={handleModalSuccess} 
        />
      )}
    </div>
  );
};

export default TestChart;
