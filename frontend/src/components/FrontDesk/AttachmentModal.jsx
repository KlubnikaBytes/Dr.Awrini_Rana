import React, { useState, useEffect, useRef } from 'react';
import { X, UploadCloud, File as FileIcon } from 'lucide-react';
import frontdeskService from '../../services/frontdeskService';

const AttachmentModal = ({ appointment, onClose }) => {
  const [attachments, setAttachments] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetchAttachments();
  }, [appointment]);

  const fetchAttachments = async () => {
    try {
      const data = await frontdeskService.getAttachments(appointment._id);
      setAttachments(data || []);
    } catch (error) {
      console.error('Error fetching attachments', error);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFileUpload(e.target.files[0]);
    }
  };

  const handleFileUpload = async (file) => {
    try {
      setUploading(true);
      await frontdeskService.uploadAttachment(appointment._id, file);
      await fetchAttachments();
    } catch (error) {
      console.error('Error uploading file', error);
      alert('Error uploading file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-xl modal-dialog-centered" style={{ maxWidth: '1000px' }}>
        <div className="modal-content">
          
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center p-3 border-bottom bg-white">
            <h5 className="modal-title m-0 fs-6 fw-bold">Add Attachment</h5>
            <X size={20} style={{ cursor: 'pointer', strokeWidth: 3 }} onClick={onClose} />
          </div>

          {/* Body */}
          <div className="modal-body p-4 bg-white" style={{ minHeight: '500px' }}>
            
            {/* Drag and Drop Zone */}
            <div 
              className={`border d-flex align-items-center justify-content-center mb-4 ${isDragging ? 'bg-light border-primary' : 'bg-white border-secondary'}`}
              style={{ 
                height: '150px', 
                borderStyle: 'solid', 
                borderWidth: '1px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input 
                type="file" 
                className="d-none" 
                ref={fileInputRef} 
                onChange={handleFileSelect}
              />
              <span className="text-dark small">
                {uploading ? 'Uploading...' : 'Drop files here to upload'}
              </span>
            </div>

            {/* Attachments List */}
            <div>
              {attachments.length === 0 ? (
                <div className="text-secondary fw-bold" style={{ fontSize: '15px' }}>
                  No Attachments
                </div>
              ) : (
                <div className="row g-3 mt-2">
                  <div className="col-12 mb-2 text-secondary fw-bold" style={{ fontSize: '15px' }}>
                    Attachments ({attachments.length})
                  </div>
                  {attachments.map((file, idx) => (
                    <div key={idx} className="col-md-3">
                      <div className="card shadow-sm h-100">
                        <div className="card-body d-flex flex-column align-items-center p-3 text-center">
                          <FileIcon size={40} className="text-primary mb-2" />
                          <div className="text-truncate w-100 fw-bold small mb-2" title={file.fileName}>
                            {file.fileName}
                          </div>
                          <button
                            className="btn btn-outline-primary btn-sm w-100 mt-auto"
                            onClick={(e) => {
                              e.stopPropagation();
                              // If it's a base64 data URL, open as blob
                              if (file.fileUrl && file.fileUrl.startsWith('data:')) {
                                const [header, b64] = file.fileUrl.split(',');
                                const mime = header.match(/:(.*?);/)[1];
                                const bytes = atob(b64);
                                const arr = new Uint8Array(bytes.length);
                                for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
                                const blob = new Blob([arr], { type: mime });
                                window.open(URL.createObjectURL(blob), '_blank');
                              } else {
                                window.open(file.fileUrl, '_blank');
                              }
                            }}
                          >
                            View
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};

export default AttachmentModal;
