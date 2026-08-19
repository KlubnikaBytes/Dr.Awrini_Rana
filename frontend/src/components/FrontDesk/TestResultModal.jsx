import React, { useState, useEffect } from 'react';
import { X, Pin } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';
import { getLocalDateString } from '../../utils/dateUtils';

const TEST_CATEGORIES = {
  "HAEMATOLOGY": [
    "Absolute Eosinophil Count (cells/cumm)", "Haemoglobin (Hb) (Gms %)", "Total WBC Count (Cells/cu mm)",
    "Haematocrit (PCV) (%)", "Neutrophils (%)", "Lymphocytes (%)", "Eosinophils (%)", "Monocytes (%)",
    "Basophils (%)", "RBC - Red Blood Cells (million cells/cu mm)", "Erythrocyte Sedimentation Rate (ESR) (mm/hour)",
    "RBCs (-)", "WBCs (thousand cells/ÂµL)", "Platelets (-)", "Haemoparasites (-)", "Impression (-)",
    "Mean Corpuscular Volume (MCV) (fL)", "Mean Corpuscular Haemoglobin (MCH) (pg)", "Mean Corpuscular Haemoglobin Concentration (MCH"
  ],
  "BIO CHEMISTRY": [
    "Fasting Blood Sugar (FBS) (mg/dL)", "Fasting Urine Sugar (FUS) (-)", "Post Prandial Blood Sugar (PPBS) (mg/dL)",
    "Post Prandial Urine Sugar - PPUS (-)", "Glycosylated Haemoglobin - HbA1c (%)", "Mean Blood Glucose (Calculated from HbA1c) (mg/dL)",
    "Random Blood Sugar - RBS (mg/dL)", "Random Urine Sugar (-)", "Ketone (-)", "Protein (-)"
  ],
  "LIPID PROFILE": [
    "Total Cholesterol (mg/dL)", "Serum HDL Cholesterol (mg/dL)", "Serum Triglycerides (mg/dL)",
    "Serum LDL Cholesterol (mg/dL)", "Serum VLDL Cholesterol (mg/dL)", "Total Cholesterol/ HDL Ratio (-)",
    "LDL Cholesterol / HDL Cholesterol Ratio (-)", "TRIGLYCERIDES / HDL RATIO (-)", "Non HDL Cholesterol (mg/dL)"
  ],
  "KIDNEY FUNCTION TEST": [
    "Blood Urea (mg/dL)", "Serum Creatinine (mg/dL)", "Serum Sodium (Na+) (mEq/L)", "Serum Potassium (K+) (mEq/L)",
    "Serum Chloride (Cl+) (mEq/L)", "Serum Uric Acid (mg/dL)", "Blood Urea Nitrogen (BUN) (mg/dL)",
    "Electrolyte Bicarbonate (mEq/L)", "Serum Calcium (mg/dL)", "eGFR - Creatinine Clearance (mL/min/1.73m2)"
  ],
  "LIVER FUNCTION TEST": [
    "Serum Bilirubin Total (mg/dL)", "Serum Bilirubin Direct (mg/dL)", "BILIRUBIN(T/D/ID) SERUM (mg/dL)",
    "Serum Protein - Total (g/dL)", "Serum Protein - Albumin (g/dL)", "Serum Protein - Globulin (g/dL)",
    "SGOT (AST) (IU/L)", "SGPT (ALT) (IU/L)", "Serum Alkaline Phosphatase (IU/L)", "Gamma Glutamyl Transpeptidase (GGT) (IU/L)",
    "Serum Magnesium (Mg+) (mg/dL)"
  ],
  "UACR": [
    "Urine Albumin (mg/L)", "Urine Creatinine (mg/dL)", "Spot Albumin Creatinine Ratio (mg/g)"
  ],
  "URINE ROUTINE": [
    "Volume (mL)", "Colour (-)", "Appearance (-)", "Reaction (-)", "Albumin (-)", "Sugar (-)",
    "Bile Salt (-)", "Bile Pigment (-)", "Pus Cells (-)", "Epithelial Cells (-)", "RBCs (-)",
    "Casts (-)", "Crystals (-)", "Urine Bacteria (-)", "Urine PH (-)", "Specific Gravity (-)", "Urobilinogen (-)"
  ],
  "THYROID FUNCTION TEST": [
    "TSH (Thyroid Stimulating Hormone) (mIU/L)", "T3 (ng/dL)", "T4 (Âµg/dL)", "Free T3 (ng/mL)", "Free T4 (ng/dL)",
    "Anitbodies TPO (-)", "TG Antibodies (-)", "Anti Thyroglobulin Antibody (Anti Tg) (U/mL)"
  ],
  "PCOS / Hirsutism Profile / Infertility Profile": [
    "Luteinizing Hormone (LH) (mIU/mL)", "Follicle Stimulating Hormone (FSH) (mIU/mL)", "Prolactin (ng/mL)",
    "Testosterone Total (ng/dL)", "Testosterone Free (ng/dL)", "DHEAS (-)", "SHBG (-)", "Oestridiol (-)", "FGW - Scoring (-)"
  ],
  "OTHERS": [
    "ECG (-)", "ULTRASOUND (-)", "FNAC (-)"
  ]
};

const TestResultModal = ({ appointment, onClose, onSuccess }) => {
  const [activeTab, setActiveTab] = useState('Common Tests');
  const [activeCategory, setActiveCategory] = useState('HAEMATOLOGY');
  const [testResults, setTestResults] = useState([]); // [{ category, name, value, unit, date }]
  const [currentDate, setCurrentDate] = useState(getLocalDateString());
  const [searchTerm, setSearchTerm] = useState('');
  
  // Additional tests form state
  const [addTestDate, setAddTestDate] = useState(getLocalDateString());
  const [addTestName, setAddTestName] = useState('');
  const [addTestValue, setAddTestValue] = useState('');
  const [addTestUnit, setAddTestUnit] = useState('');

  useEffect(() => {
    fetchTestResults();
  }, [appointment]);

  const fetchTestResults = async () => {
    try {
      const data = await frontdeskService.getTestResults(appointment._id);
      if (data && data.tests) {
        setTestResults(data.tests);
      }
    } catch (error) {
      console.error('Error fetching test results', error);
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

  const updateTestValue = (category, name, value) => {
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
    
    // Parse unit from name if available like "(mg/dL)"
    let unit = '';
    const match = name.match(/\(([^)]+)\)$/);
    if (match) unit = match[1];

    if (existingIndex > -1) {
      const newResults = [...testResults];
      newResults[existingIndex].value = value;
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
  const filteredCategories = Object.keys(TEST_CATEGORIES).filter(cat => {
    if (cat.toLowerCase().includes(searchTerm.toLowerCase())) return true;
    return TEST_CATEGORIES[cat].some(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
  });

  const displayCategory = activeCategory && filteredCategories.includes(activeCategory) ? activeCategory : (filteredCategories[0] || null);

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-fullscreen">
        <div className="modal-content">
          
          {/* Header */}
          <div className="d-flex align-items-center bg-light border-bottom" style={{ height: '56px' }}>
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

            <div className="flex-grow-1 text-center fw-bold">
              Patient Name: {appointment.patient?.name}
            </div>

            <div className="d-flex align-items-center gap-3 pe-3">
              <div className="d-flex align-items-center gap-2 small">
                <span>Auto Calculate:</span>
                <div className="form-check form-switch m-0">
                  <input className="form-check-input" type="checkbox" role="switch" defaultChecked style={{ cursor: 'pointer' }}/>
                </div>
              </div>
              <button className="btn btn-primary px-4 fw-bold rounded-0 h-100" style={{ height: '56px' }} onClick={handleSave}>Save</button>
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
                        style={{ cursor: 'pointer' }}
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

                  {displayCategory && (
                    <div style={{ maxWidth: '600px' }}>
                      <h6 className="fw-bold mb-3">{displayCategory}</h6>
                      <table className="table table-borderless table-sm">
                        <tbody>
                          {TEST_CATEGORIES[displayCategory].filter(t => t.toLowerCase().includes(searchTerm.toLowerCase())).map((testName, idx) => (
                            <tr key={idx}>
                              <td className="text-end fw-bold align-middle bg-light" style={{ width: '60%', padding: '8px' }}>
                                {testName}
                              </td>
                              <td className="align-middle px-2">
                                <input 
                                  type="text" 
                                  className="form-control form-control-sm border-dark"
                                  value={getTestValue(testName)}
                                  onChange={(e) => updateTestValue(displayCategory, testName, e.target.value)}
                                />
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
