import React, { useState, useEffect } from 'react';
import { Search, Save, FileText, Trash2, Loader2 } from 'lucide-react';
import doctorService from '../../services/doctorService';

const TemplateManagerModal = ({ isOpen, onClose, mode, storageKey, dataToSave, onLoad, title }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [templates, setTemplates] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSearchTerm('');
      setTemplateName('');
      if (mode === 'LOAD') {
        setLoading(true);
        doctorService.getTemplates(storageKey)
          .then(data => setTemplates(data))
          .catch(err => console.error('Failed to load templates', err))
          .finally(() => setLoading(false));
      }
    }
  }, [isOpen, storageKey, mode]);

  if (!isOpen) return null;

  const handleSave = async () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }
    setSaving(true);
    try {
      await doctorService.saveTemplate(templateName.trim(), storageKey, dataToSave);
      alert(`Template "${templateName}" saved successfully!`);
      onClose();
    } catch (error) {
      console.error('Error saving template', error);
      alert('Failed to save template. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (name) => {
    if (window.confirm(`Are you sure you want to delete the template "${name}"?`)) {
      try {
        await doctorService.deleteTemplate(storageKey, name);
        const updated = { ...templates };
        delete updated[name];
        setTemplates(updated);
      } catch (error) {
        console.error('Error deleting template', error);
        alert('Failed to delete template.');
      }
    }
  };

  const templateNames = Object.keys(templates);
  const filteredTemplates = templateNames.filter(name => name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '500px' }}>
        <div className="modal-content shadow-lg border-0 rounded-4">
          
          <div className="modal-header border-bottom-0 pb-0">
            <h5 className="modal-title fw-bold text-dark d-flex align-items-center gap-2">
              {mode === 'SAVE' ? <Save size={18} className="text-primary"/> : <FileText size={18} className="text-primary"/>}
              {mode === 'SAVE' ? `Save ${title} Template` : `Load ${title} Template`}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>

          <div className="modal-body pt-3 pb-4">
            {mode === 'SAVE' ? (
              <div>
                <label className="form-label small fw-semibold text-secondary">Template Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Diabetis 1"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  autoFocus
                />
                <div className="d-flex justify-content-end mt-4 gap-2">
                  <button className="btn btn-light px-4" onClick={onClose} disabled={saving}>Cancel</button>
                  <button className="btn btn-primary px-4 d-flex align-items-center gap-2" onClick={handleSave} disabled={saving}>
                    {saving && <Loader2 size={14} className="spin" />}
                    Save Template
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div className="position-relative mb-3">
                  <Search size={16} className="position-absolute text-muted" style={{ top: 10, left: 12 }} />
                  <input 
                    type="text" 
                    className="form-control ps-5" 
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    autoFocus
                  />
                </div>
                
                <div className="border rounded-3 overflow-hidden bg-light position-relative" style={{ height: '250px', overflowY: 'auto' }}>
                  {loading ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                      <Loader2 size={24} className="mb-2 opacity-50 spin" style={{ animation: 'spin 1s linear infinite' }} />
                      <div>Loading templates...</div>
                      <style>{`
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                      `}</style>
                    </div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                      <FileText size={32} className="mb-2 opacity-50" />
                      <div>No templates found</div>
                    </div>
                  ) : (
                    <div className="list-group list-group-flush">
                      {filteredTemplates.map(name => (
                        <div key={name} className="list-group-item list-group-item-action d-flex justify-content-between align-items-center py-2" style={{ cursor: 'pointer' }}>
                          <div className="flex-grow-1 fw-medium" onClick={() => { onLoad(templates[name]); onClose(); }}>
                            {name}
                          </div>
                          <button className="btn btn-sm text-danger p-1" onClick={(e) => { e.stopPropagation(); handleDelete(name); }}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
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

export default TemplateManagerModal;
