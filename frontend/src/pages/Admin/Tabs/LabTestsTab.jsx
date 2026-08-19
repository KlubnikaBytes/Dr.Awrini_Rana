import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Check, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import adminService from '../../../services/adminService';

const LabTestsTab = () => {
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [newCatMode, setNewCatMode] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  
  const [expandedCats, setExpandedCats] = useState({});
  const [newTestMode, setNewTestMode] = useState(null); // Category ID
  const [newTestName, setNewTestName] = useState('');

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const data = await adminService.getLabCatalog();
      setCatalog(data);
    } catch (error) {
      console.error('Error fetching catalog', error);
      alert('Failed to load lab catalog');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await adminService.addLabCategory({ category: newCatName.trim(), tests: [] });
      setNewCatName('');
      setNewCatMode(false);
      fetchCatalog();
    } catch (error) {
      alert(error.response?.data?.message || 'Error adding category');
    }
  };

  const handleDeleteCategory = async (id, name) => {
    if (!window.confirm(`Delete the entire "${name}" category?`)) return;
    try {
      await adminService.deleteLabCategory(id);
      fetchCatalog();
    } catch (error) {
      alert('Error deleting category');
    }
  };

  const handleAddTest = async (categoryObj) => {
    if (!newTestName.trim()) return;
    try {
      const updatedTests = [...categoryObj.tests, newTestName.trim()];
      await adminService.updateLabCategory(categoryObj._id, { tests: updatedTests });
      setNewTestName('');
      setNewTestMode(null);
      fetchCatalog();
    } catch (error) {
      alert('Error adding test');
    }
  };

  const handleDeleteTest = async (categoryObj, testIndex) => {
    if (!window.confirm('Delete this test?')) return;
    try {
      const updatedTests = [...categoryObj.tests];
      updatedTests.splice(testIndex, 1);
      await adminService.updateLabCategory(categoryObj._id, { tests: updatedTests });
      fetchCatalog();
    } catch (error) {
      alert('Error deleting test');
    }
  };

  const toggleExpand = (id) => {
    setExpandedCats(prev => ({ ...prev, [id]: !prev[id] }));
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center h-100 text-muted p-5">
        <Loader2 className="spin me-2" size={24} style={{ animation: 'spin 1s linear infinite' }} />
        <span>Loading Lab Catalog...</span>
        <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div className="p-4" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h5 className="mb-0 fw-bold text-dark">Lab Tests Catalog</h5>
        <button className="btn btn-primary btn-sm d-flex align-items-center gap-1" onClick={() => setNewCatMode(true)}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {newCatMode && (
        <div className="card shadow-sm border-0 mb-4 p-3 bg-light">
          <label className="form-label small fw-semibold text-secondary">New Category Name (e.g. HAEMATOLOGY)</label>
          <div className="d-flex gap-2">
            <input 
              type="text" 
              className="form-control" 
              value={newCatName} 
              onChange={e => setNewCatName(e.target.value)} 
              placeholder="Enter category name..." 
              autoFocus 
            />
            <button className="btn btn-success" onClick={handleAddCategory} disabled={!newCatName.trim()}><Check size={18}/></button>
            <button className="btn btn-outline-secondary" onClick={() => setNewCatMode(false)}><X size={18}/></button>
          </div>
        </div>
      )}

      {catalog.length === 0 ? (
        <div className="text-center p-5 text-muted border rounded-3 bg-white">
          <p className="mb-0">No lab categories found. Add your first category to get started.</p>
        </div>
      ) : (
        <div className="accordion" id="catalogAccordion">
          {catalog.map(cat => (
            <div className="card shadow-sm border-0 mb-3 overflow-hidden" key={cat._id}>
              <div 
                className="card-header bg-white border-0 d-flex justify-content-between align-items-center p-3" 
                style={{ cursor: 'pointer', borderBottom: expandedCats[cat._id] ? '1px solid #eee' : 'none' }}
                onClick={() => toggleExpand(cat._id)}
              >
                <div className="d-flex align-items-center gap-2">
                  <span className="text-muted">{expandedCats[cat._id] ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}</span>
                  <span className="fw-bold text-dark" style={{ textTransform: 'uppercase' }}>{cat.category}</span>
                  <span className="badge bg-light text-secondary rounded-pill ms-2">{cat.tests.length} tests</span>
                </div>
                <button 
                  className="btn btn-sm text-danger p-1" 
                  onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat._id, cat.category); }}
                  title="Delete Category"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              
              {expandedCats[cat._id] && (
                <div className="card-body bg-light p-3">
                  {cat.tests.length === 0 ? (
                    <div className="text-muted small mb-3 fst-italic">No tests in this category yet.</div>
                  ) : (
                    <ul className="list-group mb-3 shadow-sm">
                      {cat.tests.map((testName, idx) => (
                        <li className="list-group-item d-flex justify-content-between align-items-center border-0 border-bottom" key={idx}>
                          <span>{testName}</span>
                          <button className="btn btn-sm text-danger p-1 opacity-50 hover-opacity-100" onClick={() => handleDeleteTest(cat, idx)}>
                            <Trash2 size={14} />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {newTestMode === cat._id ? (
                    <div className="d-flex gap-2">
                      <input 
                        type="text" 
                        className="form-control form-control-sm" 
                        value={newTestName} 
                        onChange={e => setNewTestName(e.target.value)} 
                        placeholder="Test name (e.g. Total WBC Count)..." 
                        autoFocus 
                      />
                      <button className="btn btn-sm btn-success px-3" onClick={() => handleAddTest(cat)} disabled={!newTestName.trim()}>Save</button>
                      <button className="btn btn-sm btn-outline-secondary px-3" onClick={() => { setNewTestMode(null); setNewTestName(''); }}>Cancel</button>
                    </div>
                  ) : (
                    <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1" onClick={() => { setNewTestMode(cat._id); setNewTestName(''); }}>
                      <Plus size={14} /> Add Test
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LabTestsTab;
