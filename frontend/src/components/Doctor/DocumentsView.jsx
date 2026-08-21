import React, { useState, useEffect, useRef } from 'react';
import doctorService from '../../services/doctorService';
import { FileText, Image, File, ExternalLink, Calendar, RefreshCw, Upload, Camera, Trash2 } from 'lucide-react';
import { toast } from 'react-toastify';

const getFileIcon = (fileName) => {
  if (!fileName) return <File size={32} className="text-secondary" />;
  const ext = fileName.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return <Image size={32} className="text-success" />;
  if (['pdf'].includes(ext)) return <FileText size={32} className="text-danger" />;
  return <File size={32} className="text-primary" />;
};

const getFileBadge = (fileName) => {
  if (!fileName) return { text: 'FILE', color: '#64748b' };
  const ext = fileName.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) return { text: ext.toUpperCase(), color: '#16a34a' };
  if (['pdf'].includes(ext)) return { text: 'PDF', color: '#dc2626' };
  return { text: ext.toUpperCase(), color: '#2563eb' };
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Get the stored userId (the current logged-in doctor) for "My Docs" filtering
const getCurrentUserId = () => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.id || payload._id || null;
  } catch {
    return null;
  }
};

const DocumentsView = ({ patientId }) => {
  const [allDocuments, setAllDocuments] = useState([]);
  const [tab, setTab] = useState('patient'); // 'patient' | 'mine'
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const currentUserId = getCurrentUserId();

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getPatientDocuments(patientId);
      setAllDocuments(data || []);
    } catch (err) {
      console.error('Error fetching documents', err);
      setError('Failed to load documents.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (patientId) fetchDocuments();
  }, [patientId]);

  // Filter based on active tab
  const documents = tab === 'mine'
    ? allDocuments.filter(d => d.userId && d.userId.toString() === currentUserId)
    : allDocuments;

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const newDoc = await doctorService.uploadPatientDocument(patientId, file);
      setAllDocuments(prev => [newDoc, ...prev]);
      toast.success(`"${file.name}" uploaded successfully!`);
    } catch (err) {
      console.error('Upload failed', err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc) => {
    if (!window.confirm(`Delete "${doc.fileName}"?`)) return;
    try {
      await doctorService.deletePatientDocument(patientId, doc._id);
      setAllDocuments(prev => prev.filter(d => d._id !== doc._id));
      toast.success('Document deleted.');
    } catch (err) {
      toast.error('Could not delete. You can only delete documents you uploaded.');
    }
  };

  const canDelete = (doc) => doc.userId && doc.userId.toString() === currentUserId;

  return (
    <div className="d-flex flex-column h-100 bg-white">
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        style={{ display: 'none' }}
        accept=".pdf,.jpg,.jpeg,.png,.gif,.bmp,.webp,.doc,.docx,.xls,.xlsx"
        onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files[0]) handleFileUpload(e.target.files[0]); e.target.value = ''; }}
      />

      {/* Header */}
      <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-white sticky-top" style={{ zIndex: 5 }}>
        <div>
          <h6 className="mb-0 fw-bold text-dark">Patient Documents</h6>
          <span className="text-secondary small">Files uploaded for this patient</span>
        </div>
        <div className="d-flex align-items-center gap-2 flex-wrap">
          <button
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Upload a file from your device"
          >
            {uploading
              ? <span className="spinner-border spinner-border-sm" />
              : <Upload size={14} />
            }
            Add File
          </button>
          <button
            className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            title="Capture a photo using your camera"
          >
            <Camera size={14} /> Capture
          </button>
          <button
            className={`btn btn-sm ${tab === 'patient' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('patient')}
            title="All documents for this patient (including frontdesk uploads)"
          >
            Patient's Docs
            {allDocuments.length > 0 && (
              <span className="badge bg-white text-primary ms-1" style={{ fontSize: '0.65rem' }}>
                {allDocuments.length}
              </span>
            )}
          </button>
          <button
            className={`btn btn-sm ${tab === 'mine' ? 'btn-primary' : 'btn-outline-secondary'}`}
            onClick={() => setTab('mine')}
            title="Only documents you uploaded"
          >
            My Docs
            {allDocuments.filter(d => d.userId?.toString() === currentUserId).length > 0 && (
              <span className={`badge ms-1 ${tab === 'mine' ? 'bg-white text-primary' : 'bg-primary text-white'}`} style={{ fontSize: '0.65rem' }}>
                {allDocuments.filter(d => d.userId?.toString() === currentUserId).length}
              </span>
            )}
          </button>
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={fetchDocuments}
            title="Refresh"
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-grow-1 overflow-auto p-4">
        {loading ? (
          <div className="d-flex justify-content-center align-items-center py-5">
            <div className="spinner-border spinner-border-sm text-primary me-2" role="status"></div>
            <span className="text-secondary">Loading documents...</span>
          </div>
        ) : error ? (
          <div className="text-danger text-center py-5">{error}</div>
        ) : documents.length === 0 ? (
          <div className="d-flex flex-column align-items-center justify-content-center py-5 text-center">
            <div className="p-4 rounded-circle mb-3" style={{ backgroundColor: '#f1f5f9' }}>
              <FileText size={40} className="text-secondary" />
            </div>
            <h6 className="fw-semibold text-dark mb-1">No Documents Found</h6>
            <p className="text-secondary small mb-3">
              {tab === 'mine'
                ? 'You have not uploaded any documents for this patient yet.'
                : 'No documents have been uploaded for this patient yet.'}
            </p>
            <button
              className="btn btn-sm btn-primary d-flex align-items-center gap-1"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload size={14} /> Upload First Document
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 d-flex align-items-center gap-2">
              <span className="text-secondary small fw-semibold">
                {documents.length} document{documents.length !== 1 ? 's' : ''}
                {tab === 'mine' ? ' (uploaded by you)' : ' (all sources)'}
              </span>
            </div>
            <div className="row g-3">
              {documents.map((doc, idx) => {
                const badge = getFileBadge(doc.fileName);
                return (
                  <div key={doc._id || idx} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                    <div
                      className="card h-100 border shadow-sm position-relative"
                      style={{ borderRadius: '10px', transition: 'box-shadow 0.2s, transform 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                    >
                      {/* Delete button — only shown for docs this doctor uploaded */}
                      {canDelete(doc) && (
                        <button
                          className="btn btn-sm position-absolute top-0 end-0 m-1 p-1"
                          style={{ zIndex: 2, color: '#ef4444', background: 'rgba(255,255,255,0.85)', border: 'none', borderRadius: '50%' }}
                          title="Delete this document"
                          onClick={() => handleDelete(doc)}
                        >
                          <Trash2 size={13} />
                        </button>
                      )}

                      {/* File Type Color Top Bar */}
                      <div style={{ height: '4px', backgroundColor: badge.color, borderRadius: '10px 10px 0 0' }}></div>

                      <div className="card-body d-flex flex-column align-items-center text-center p-3">
                        <span
                          className="badge mb-3 px-2 py-1"
                          style={{ backgroundColor: badge.color, fontSize: '0.65rem', letterSpacing: '0.5px' }}
                        >
                          {badge.text}
                        </span>

                        <div className="mb-3">{getFileIcon(doc.fileName)}</div>

                        <p
                          className="fw-semibold text-dark mb-2 w-100"
                          style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </p>

                        <div className="d-flex align-items-center gap-1 text-secondary mb-3" style={{ fontSize: '0.75rem' }}>
                          <Calendar size={12} />
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </div>

                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-sm w-100 mt-auto d-flex align-items-center justify-content-center gap-1"
                          style={{ backgroundColor: badge.color, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.82rem' }}
                          onClick={e => e.stopPropagation()}
                        >
                          <ExternalLink size={13} /> View File
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
};

export default DocumentsView;
