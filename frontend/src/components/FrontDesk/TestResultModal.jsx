import React, { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import labCatalogService from '../../services/labCatalogService';
import { getLocalDateString } from '../../utils/dateUtils';
import useWebSocket from '../../hooks/useWebSocket';

const TestResultModal = ({ appointment, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('Common Tests');
  const [testCategories, setTestCategories] = useState({});
  const [activeCategory, setActiveCategory] = useState(null);
  const [testResults, setTestResults] = useState([]); // [{ category, name, value, unit, date }]
  const [currentDate, setCurrentDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');

  // Additional tests form state
  const [addTestDate, setAddTestDate] = useState(getLocalDateString());
  const [addTestName, setAddTestName] = useState('');
  const [addTestValue, setAddTestValue] = useState('');
  const [addTestUnit, setAddTestUnit] = useState('');

  useEffect(() => {
    fetchCatalogsAndResults();
  }, [appointment]);

  useWebSocket({
    'TEST_RESULTS_SAVED': (payload) => {
      if (payload.appointmentId === appointment._id) {
        fetchCatalogsAndResults();
      }
    },
    'LABORDER_UPDATED': () => {
      fetchCatalogsAndResults();
    }
  });

  const fetchCatalogsAndResults = async () => {
    try {
      const [resultsData, catalogsData] = await Promise.all([
        frontdeskService.getTestResults(appointment._id).catch(() => ({ tests: [] })),
        labCatalogService.getCatalogs().catch(() => [])
      ]);

      if (resultsData && resultsData.tests) {
        setTestResults(resultsData.tests);
      }

      const mappedCats = {};
      catalogsData.forEach(cat => {
        mappedCats[cat.section] = cat.services.map(s => ({
          name: s.name,
          unit: s.unit || '',
          safeRange: s.safeRange || ''
        }));
      });
      setTestCategories(mappedCats);

      if (catalogsData.length > 0) {
        setActiveCategory(catalogsData[0].section);
      }
    } catch (error) {
      console.error('Error fetching data', error);
    }
  };

  const handleSave = async () => {
    try {
      await frontdeskService.saveTestResults(appointment._id, testResults);
      alert('Tests saved successfully!');
      onSuccess();
    } catch (error) {
      console.error(error);
      alert('Error saving tests');
    }
  };

  const updateTestValue = (category, name, value, unit = '') => {
    const existingIndex = testResults.findIndex(t => t.name === name);
    if (value.trim() === '') {
      // Remove it if empty to save space
      if (existingIndex > -1) {
        const newResults = [...testResults];
        newResults.splice(existingIndex, 1);
        setTestResults(newResults);
      }
      return;
    }

    if (existingIndex > -1) {
      const newResults = [...testResults];
      newResults[existingIndex].value = value;
      if (unit) newResults[existingIndex].unit = unit;
      setTestResults(newResults);
    } else {
      setTestResults([...testResults, { category, name, value, unit, date: currentDate }]);
    }
  };

  const getTestValue = (name) => {
    const test = testResults.find(t => t.name === name);
    return test ? test.value : '';
  };

  const handleAddAdditionalTest = () => {
    if (!addTestName || !addTestValue) return;
    setTestResults([...testResults, { 
      category: 'Additional Tests', 
      name: addTestName, 
      value: addTestValue, 
      unit: addTestUnit, 
      date: addTestDate 
    }]);
    setAddTestName('');
    setAddTestValue('');
    setAddTestUnit('');
  };

  // Filter categories and tests based on search
  const filteredCategories = Object.keys(testCategories).filter(cat => {
    if (cat.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    return testCategories[cat].some(t => t.name.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const displayCategory = activeCategory && filteredCategories.includes(activeCategory) ? activeCategory : (filteredCategories[0] || null);

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          
          {/* Header */}
          <div className="d-flex align-items-center bg-light border-bottom p-0" style={{ height: '56px' }}>
            <div className="d-flex h-100">
              <button 
                className={`btn border-0 rounded-0 px-4 fw-bold ${activeTab === 'Common Tests' ? 'bg-white border-top border-4 border-info' : 'text-muted'}`}
                style={activeTab === 'Common Tests' ? { borderTopColor: '#2dd4bf' } : {}}
                onClick={() => setActiveTab('Common Tests')}
              >
                Common Tests
              </button>
              <button 
                className={`btn border-0 rounded-0 px-4 fw-bold ${activeTab === 'Additional Tests' ? 'bg-white border-top border-4 border-info' : 'text-muted'}`}
                style={activeTab === 'Additional Tests' ? { borderTopColor: '#2dd4bf' } : {}}
                onClick={() => setActiveTab('Additional Tests')}
              >
                Additional Tests
              </button>
            </div>
            
            <div className="flex-grow-1 text-center fw-bold text-dark">
              Patient Name: {appointment.patient?.name}
            </div>

            <div className="d-flex align-items-center gap-3 pe-3">
              <div className="d-flex align-items-center gap-2 small">
                <span>Auto Calculate:</span>
                <div className="form-check form-switch m-0">
                  <input className="form-check-input" type="checkbox" role="switch" defaultChecked style={{ cursor: 'pointer' }}/>
                </div>
              </div>
              <button className="btn btn-primary px-4 fw-bold rounded-1" style={{ height: '36px' }} onClick={handleSave}>Save</button>
              <X size={24} style={{ cursor: 'pointer' }} onClick={onClose} />
            </div>
          </div>

          {/* Body */}
          <div className="d-flex flex-grow-1 overflow-hidden">
            {activeTab === 'Common Tests' ? (
              <>
                {/* Left Sidebar */}
                <div className="bg-light border-end d-flex flex-column" style={{ width: '320px' }}>
                  <div className="p-2 border-bottom">
                    <input 
                      type="text" 
                      className="form-control" 
                      placeholder="Search Test..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="overflow-auto flex-grow-1">
                    {filteredCategories.map(cat => (
                      <div 
                        key={cat}
                        className={`p-3 border-bottom fw-bold text-dark ${displayCategory === cat ? 'bg-white shadow-sm' : ''}`}
                        style={{ cursor: 'pointer', borderLeft: displayCategory === cat ? '4px solid #2dd4bf' : '4px solid transparent' }}
                        onClick={() => setActiveCategory(cat)}
                      >
                        {cat}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right Content */}
                <div className="flex-grow-1 p-3 bg-white overflow-auto">
                  <div className="d-flex align-items-center mb-4 pb-2 border-bottom w-50">
                    <Pin size={16} className="me-3" />
                    <input 
                      type="date" 
                      className="form-control form-control-sm w-auto me-2" 
                      value={currentDate}
                      onChange={(e) => setCurrentDate(e.target.value)}
                    />
                    <button className="btn btn-primary btn-sm px-3">+ Add Date</button>
                  </div>

                  {displayCategory && testCategories[displayCategory] && (
                    <div style={{ maxWidth: '700px' }}>
                      <h6 className="fw-bold mb-3">{displayCategory}</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          {testCategories[displayCategory].filter(t => t.name.toLowerCase().includes(searchTerm.toLowerCase())).map((testObj, idx) => (
                            <tr key={idx}>
                              <td className="text-end fw-bold align-middle bg-light" style={{ width: '50%', padding: '8px' }}>
                                {testObj.name}
                              </td>
                              <td className="align-middle px-2">
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm border-dark"
                                  value={getTestValue(testObj.name)}
                                  onChange={(e) => updateTestValue(displayCategory, testObj.name, e.target.value, testObj.unit)}
                                />
                              </td>
                              <td className="align-middle text-muted small" style={{ width: '20%' }}>
                                {testObj.unit}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              // Additional Tests Tab
              <div className="flex-grow-1 bg-white p-4">
                <div className="d-flex align-items-center gap-3 bg-light p-3 rounded shadow-sm border">
                  <div className="d-flex align-items-center gap-2">
                    <label className="fw-bold m-0">Date:</label>
                    <input type="date" className="form-control form-control-sm" value={addTestDate} onChange={e => setAddTestDate(e.target.value)}/>
                  </div>
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <label className="fw-bold m-0">Name:</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Test Name" value={addTestName} onChange={e => setAddTestName(e.target.value)}/>
                  </div>
                  <div className="d-flex align-items-center gap-2">
                    <label className="fw-bold m-0">Value:</label>
                    <input type="text" className="form-control form-control-sm" placeholder="Test Value" value={addTestValue} onChange={e => setAddTestValue(e.target.value)}/>
                    <input type="text" className="form-control form-control-sm w-25" placeholder="Unit" value={addTestUnit} onChange={e => setAddTestUnit(e.target.value)}/>
                  </div>
                  <button className="btn btn-primary btn-sm px-4" onClick={handleAddAdditionalTest}>Add</button>
                </div>

                {/* List of Additional Tests */}
                <div className="mt-4">
                  <h6 className="fw-bold">Added Additional Tests</h6>
                  {testResults.filter(t => t.category === 'Additional Tests').length === 0 ? (
                    <div className="text-muted small">No additional tests added yet.</div>
                  ) : (
                    <table className="table table-bordered table-sm mt-2">
                      <thead className="table-light">
                        <tr>
                          <th>Date</th>
                          <th>Name</th>
                          <th>Value</th>
                          <th>Unit</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testResults.filter(t => t.category === 'Additional Tests').map((t, idx) => (
                          <tr key={idx}>
                            <td>{t.date ? new Date(t.date).toLocaleDateString() : '-'}</td>
                            <td>{t.name}</td>
                            <td>{t.value}</td>
                            <td>{t.unit}</td>
                            <td>
                              <button 
                                className="btn btn-sm text-danger"
                                onClick={() => {
                                  const newResults = testResults.filter(r => r.name !== t.name);
                                  setTestResults(newResults);
                                }}
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestResultModal;
