import React, { useState, useEffect } from 'react';
import doctorService from '../../services/doctorService';
import { FileText, Image, File, ExternalLink, Calendar, RefreshCw } from 'lucide-react';

const getFileIcon = (fileName) => {
  if (!fileName) return <File size={32} className="text-secondary" />;
  const ext = fileName.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext)) {
    return <Image size={32} className="text-success" />;
  }
  if (['pdf'].includes(ext)) {
    return <FileText size={32} className="text-danger" />;
  }
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
  const d = new Date(dateString);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const DocumentsView = ({ patientId }) => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDocuments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await doctorService.getPatientDocuments(patientId);
      setDocuments(data || []);
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

  return (
    <div className="d-flex flex-column h-100 bg-white">
      {/* Header */}
      <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-white sticky-top" style={{ zIndex: 5 }}>
        <div>
          <h6 className="mb-0 fw-bold text-dark">Patient Documents</h6>
          <span className="text-secondary small">Files uploaded by front desk for this patient</span>
        </div>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg> Add File
          </button>
          <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3"/></svg> Capture
          </button>
          <button className="btn btn-sm btn-primary">Patient's Docs</button>
          <button className="btn btn-sm btn-outline-secondary">My Docs</button>
          <button
            className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
            onClick={fetchDocuments}
            title="Refresh"
          >
            <RefreshCw size={14} /> Refresh
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
            <p className="text-secondary small mb-0">Documents uploaded from the Front Desk for this patient will appear here.</p>
          </div>
        ) : (
          <>
            <div className="mb-3">
              <span className="text-secondary small fw-semibold">
                {documents.length} document{documents.length !== 1 ? 's' : ''} found
              </span>
            </div>
            <div className="row g-3">
              {documents.map((doc, idx) => {
                const badge = getFileBadge(doc.fileName);
                return (
                  <div key={doc._id || idx} className="col-xl-3 col-lg-4 col-md-6 col-sm-6">
                    <div
                      className="card h-100 border shadow-sm"
                      style={{ borderRadius: '10px', transition: 'box-shadow 0.2s, transform 0.15s', cursor: 'pointer' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.transform = ''; }}
                    >
                      {/* File Type Color Top Bar */}
                      <div style={{ height: '4px', backgroundColor: badge.color, borderRadius: '10px 10px 0 0' }}></div>

                      <div className="card-body d-flex flex-column align-items-center text-center p-3">
                        {/* File Type Badge */}
                        <span
                          className="badge mb-3 px-2 py-1"
                          style={{ backgroundColor: badge.color, fontSize: '0.65rem', letterSpacing: '0.5px' }}
                        >
                          {badge.text}
                        </span>

                        {/* Icon */}
                        <div className="mb-3">
                          {getFileIcon(doc.fileName)}
                        </div>

                        {/* File Name */}
                        <p
                          className="fw-semibold text-dark mb-2 w-100"
                          style={{ fontSize: '0.82rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                          title={doc.fileName}
                        >
                          {doc.fileName}
                        </p>

                        {/* Upload Date */}
                        <div className="d-flex align-items-center gap-1 text-secondary mb-3" style={{ fontSize: '0.75rem' }}>
                          <Calendar size={12} />
                          <span>{formatDate(doc.uploadedAt)}</span>
                        </div>

                        {/* View Button */}
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
    </div>
  );
};

export default DocumentsView;
