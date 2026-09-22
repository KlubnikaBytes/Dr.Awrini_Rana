import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import useWebSocket from '../../hooks/useWebSocket';
import axios from 'axios';
import doctorService from '../../services/doctorService';
import frontdeskService from '../../services/frontdeskService';
import adminService from '../../services/adminService';
import { Plus, X, Search, FileText, Activity, Droplet, List, Settings, FileBox, Stethoscope, Trash2, RotateCcw, Copy, FilePlus, FileDown, ChevronDown, Pencil, Clock, Phone, Printer, Mail, Save, MessageCircle, Calendar, Upload, Camera, ImageIcon } from 'lucide-react';
import VaccineChart from '../../components/Doctor/VaccineChart';
import TestChart from '../../components/Doctor/TestChart';
import DocumentsView from '../../components/Doctor/DocumentsView';
import AutoCompleteTagInput from '../../components/Doctor/AutoCompleteTagInput';
import AutoCompleteTextArea from '../../components/Doctor/AutoCompleteTextArea';
import AutoCompleteSingleInput from '../../components/Doctor/AutoCompleteSingleInput';
import PastVisits from '../../components/Doctor/PastVisits';
import TemplateManagerModal from '../../components/Doctor/TemplateManagerModal';
import PreviousRxModal from '../../components/Doctor/PreviousRxModal';
import moment from 'moment';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';


/* ─── Forms View Component ─────────────────────────────────────── */
const FormsView = ({ certificate, onCertificateChange, onSaveNow, pastConsultations, appointmentId }) => {
   const fileInputRef = useRef(null);
   const cameraInputRef = useRef(null);
   const [viewingPast, setViewingPast] = useState(null); // past consultation to preview
   const [compressing, setCompressing] = useState(false);

   const compressImage = (file) => {
      return new Promise((resolve) => {
         const reader = new FileReader();
         reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
               const canvas = document.createElement('canvas');
               const MAX_DIM = 1200;
               let { width, height } = img;
               if (width > MAX_DIM || height > MAX_DIM) {
                  if (width > height) { height = Math.round(height * MAX_DIM / width); width = MAX_DIM; }
                  else { width = Math.round(width * MAX_DIM / height); height = MAX_DIM; }
               }
               canvas.width = width;
               canvas.height = height;
               canvas.getContext('2d').drawImage(img, 0, 0, width, height);
               resolve(canvas.toDataURL('image/jpeg', 0.82));
            };
            img.src = e.target.result;
         };
         reader.readAsDataURL(file);
      });
   };

   const handleFile = async (file) => {
      if (!file) return;
      setCompressing(true);
      try {
         const base64 = await compressImage(file);
         onCertificateChange(base64);
         // Immediately persist — don't rely on debounced autosave
         if (onSaveNow) onSaveNow(base64);
      } finally {
         setCompressing(false);
      }
   };

   const pastWithCert = (pastConsultations || []).filter(c => c.certificate && c.certificate.length > 10);

   return (
      <div className="d-flex flex-column h-100 bg-white">
         {/* Hidden file inputs */}
         <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />
         <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
            onChange={e => { if (e.target.files[0]) handleFile(e.target.files[0]); e.target.value = ''; }} />

         {/* Header */}
         <div className="d-flex align-items-center justify-content-between px-4 py-3 border-bottom bg-white sticky-top" style={{ zIndex: 5 }}>
            <div>
               <h6 className="mb-0 fw-bold text-dark">Forms & Certificates</h6>
               <span className="text-secondary small">Upload a certificate for this visit</span>
            </div>
             <div className="d-flex gap-2">
               <button className="btn btn-sm btn-outline-primary d-flex align-items-center gap-1"
                  onClick={() => fileInputRef.current?.click()} disabled={compressing}>
                  {compressing ? <span className="spinner-border spinner-border-sm" /> : <Upload size={14} />}
                  Upload
               </button>
               <button className="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1"
                  onClick={() => cameraInputRef.current?.click()} disabled={compressing}>
                  <Camera size={14} /> Capture
               </button>
               {certificate && (
                  <button className="btn btn-sm btn-primary d-flex align-items-center gap-1"
                     onClick={() => window.open(`/doctor/visit/${appointmentId}/print`, '_blank')}>
                     <Printer size={14} /> Print
                  </button>
               )}
            </div>
         </div>

         <div className="flex-grow-1 overflow-auto p-4">
            {/* Current certificate */}
            <div className="mb-4">
               <div className="fw-semibold text-dark mb-2" style={{ fontSize: '0.9rem' }}>
                  📋 Current Visit Certificate
               </div>
               {certificate ? (
                  <div className="position-relative" style={{ border: '1px solid #dee2e6', borderRadius: 10, overflow: 'hidden', background: '#f8f9fa' }}>
                     <img
                        src={certificate}
                        alt="Uploaded Certificate"
                        style={{ width: '100%', maxHeight: '420px', objectFit: 'contain', display: 'block' }}
                     />
                     <div className="position-absolute top-0 end-0 m-2 d-flex gap-2">
                        <button
                           className="btn btn-sm btn-danger"
                           title="Remove certificate"
                           onClick={() => {
                              if (window.confirm('Remove this certificate?')) {
                                 onCertificateChange('');
                                 if (onSaveNow) onSaveNow('');
                              }
                           }}
                        >
                           <Trash2 size={13} />
                        </button>
                        <button
                           className="btn btn-sm btn-outline-light"
                           title="Replace certificate"
                           onClick={() => fileInputRef.current?.click()}
                           style={{ backdropFilter: 'blur(4px)', background: 'rgba(255,255,255,0.85)' }}
                        >
                           <Upload size={13} />
                        </button>
                     </div>
                     <div className="text-center py-1 bg-success text-white" style={{ fontSize: '0.72rem', letterSpacing: '0.5px' }}>
                        ✅ CERTIFICATE ATTACHED — WILL PRINT ON PRESCRIPTION
                     </div>
                  </div>
               ) : (
                  <div
                     className="d-flex flex-column align-items-center justify-content-center py-5 rounded"
                     style={{ border: '2px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', minHeight: '200px' }}
                     onClick={() => fileInputRef.current?.click()}
                  >
                     <ImageIcon size={40} className="text-secondary mb-3" />
                     <div className="fw-semibold text-secondary">No certificate uploaded yet</div>
                     <div className="text-secondary small mt-1">Click here or use the Upload button above</div>
                  </div>
               )}
            </div>

            {/* Past forms */}
            {pastWithCert.length > 0 && (
               <div>
                  <div className="fw-semibold text-dark mb-3" style={{ fontSize: '0.9rem' }}>
                     📁 Past Visit Certificates ({pastWithCert.length})
                  </div>
                  <div className="d-flex flex-column gap-3">
                     {pastWithCert.map((c, idx) => (
                        <div key={c._id || idx} className="border rounded overflow-hidden" style={{ background: '#f8f9fa' }}>
                           <div
                              className="d-flex align-items-center justify-content-between px-3 py-2 border-bottom"
                              style={{ background: '#fff', cursor: 'pointer' }}
                              onClick={() => setViewingPast(viewingPast === c._id ? null : c._id)}
                           >
                              <div className="d-flex align-items-center gap-2">
                                 <FileBox size={16} className="text-primary" />
                                 <span className="fw-medium text-dark" style={{ fontSize: '0.85rem' }}>
                                    Visit {pastWithCert.length - idx}
                                 </span>
                                 <span className="text-secondary" style={{ fontSize: '0.78rem' }}>
                                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                 </span>
                              </div>
                              <ChevronDown size={16} className="text-secondary" style={{ transform: viewingPast === c._id ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                           </div>
                           {viewingPast === c._id && (
                              <div className="p-3">
                                 <img src={c.certificate} alt="Past Certificate" style={{ width: '100%', maxHeight: '400px', objectFit: 'contain', borderRadius: 6 }} />
                              </div>
                           )}
                        </div>
                     ))}
                  </div>
               </div>
            )}
         </div>
      </div>
   );
};

/* ─── Section Action Icons ─────────────────────────────────────── */
const SectionActions = ({ onClear, onCopyPast, onSave, onLoad, showAll = true }) => (
   <div className="hp-action-bar-mini justify-content-center w-100 mb-2">
      {showAll && <>
         <button type="button" className="hp-action-btn-mini" title="Load Prev" onClick={(e) => { e.preventDefault(); onCopyPast(); }}><RotateCcw size={14} /></button>
         <button type="button" className="hp-action-btn-mini" title="Save as Template" onClick={(e) => { e.preventDefault(); onSave(); }}><Copy size={14} /></button>
         <button type="button" className="hp-action-btn-mini" title="Load Template" onClick={(e) => { e.preventDefault(); onLoad(); }}><FilePlus size={14} /></button>
      </>}
      <button type="button" className="hp-action-btn-mini danger" title="Clear" onClick={(e) => { e.preventDefault(); onClear(); }}><Trash2 size={14} /></button>
   </div>
);

const getEmptyMedicineRow = () => ({ id: Math.random().toString(36).substr(2, 9), type: 'TAB.', medicineName: '', genericName: '', dosage: '', when: '', frequency: '', duration: '', notes: '', instructions: '' });

const ensureEmptyMedicineRow = (meds) => {
   const validMeds = (meds || []).map(m => ({ ...m, id: m.id || m._id || Math.random().toString(36).substr(2, 9) }));
   if (validMeds.length === 0) return [getEmptyMedicineRow()];
   const last = validMeds[validMeds.length - 1];
   if (last.medicineName && last.medicineName.trim() !== '') {
      return [...validMeds, getEmptyMedicineRow()];
   }
   return validMeds;
};

const SortableMedicineRow = ({
   med, idx, updateMedicine, handleMedicineSelect, TYPE_OPTIONS, DOSAGE_OPTIONS,
   WHEN_OPTIONS, FREQ_OPTIONS, DUR_OPTIONS, removeMedicine, medicinesLength
}) => {
   const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: med.id });
   
   const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
      position: 'relative',
      zIndex: isDragging ? 999 : (500 - idx),
      backgroundColor: isDragging ? '#f8f9fa' : 'inherit',
   };

   return (
      <tr ref={setNodeRef} style={style}>
         <td className="text-center align-middle">
            <div className="d-flex align-items-center justify-content-center gap-2">
               <div {...attributes} {...listeners} style={{ cursor: 'grab', touchAction: 'none' }} className="text-secondary">
                  <List size={14} />
               </div>
               <span>{idx + 1}</span>
            </div>
         </td>
         <td>
            <select className="form-select form-select-sm border-0 shadow-none bg-transparent" value={med.type} onChange={e => updateMedicine(idx, 'type', e.target.value)}>
               {TYPE_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
               ))}
            </select>
         </td>
         <td>
            <AutoCompleteSingleInput
               value={med.medicineName}
               onChange={val => updateMedicine(idx, 'medicineName', val)}
               onSelect={val => handleMedicineSelect(idx, val)}
               type="MEDICINE"
               placeholder="Medicine Name"
               className="form-control form-control-sm border-0 shadow-none fw-semibold text-primary"
            />
            <div className="d-flex align-items-center text-secondary ms-2" style={{ marginTop: '-4px' }}>
               <Pencil size={10} className="text-secondary opacity-50 me-1" />
               <AutoCompleteSingleInput
                  value={med.genericName || ''}
                  onChange={val => updateMedicine(idx, 'genericName', val)}
                  type="GENERIC_NAME"
                  placeholder="Generic name"
                  className="form-control form-control-sm border-0 shadow-none p-0 text-secondary"
                  style={{ fontSize: '0.75rem', backgroundColor: 'transparent' }}
               />
            </div>
            <div className="d-flex align-items-center text-success ms-2 mt-1">
               <Clock size={11} className="opacity-75 me-1 text-success" />
               <input
                  type="text"
                  value={med.instructions || ''}
                  onChange={e => updateMedicine(idx, 'instructions', e.target.value)}
                  placeholder="Detailed timing..."
                  className="form-control form-control-sm border-0 shadow-none p-0 text-success fw-medium"
                  style={{ fontSize: '0.75rem', backgroundColor: 'transparent' }}
               />
            </div>
         </td>
         <td>
            <AutoCompleteSingleInput
               value={med.dosage}
               onChange={val => updateMedicine(idx, 'dosage', val)}
               type="DOSAGE"
               placeholder="Dosage"
               className="form-control form-control-sm border-0 shadow-none text-center"
               defaultOptions={DOSAGE_OPTIONS}
            />
         </td>
         <td>
            <AutoCompleteSingleInput
               value={med.when}
               onChange={val => updateMedicine(idx, 'when', val)}
               type="WHEN"
               placeholder="When"
               className="form-control form-control-sm border-0 shadow-none text-center"
               defaultOptions={WHEN_OPTIONS}
            />
         </td>
         <td>
            <AutoCompleteSingleInput
               value={med.frequency}
               onChange={val => updateMedicine(idx, 'frequency', val)}
               type="FREQUENCY"
               placeholder="Frequency"
               className="form-control form-control-sm border-0 shadow-none text-center"
               defaultOptions={FREQ_OPTIONS}
            />
         </td>
         <td>
            <AutoCompleteSingleInput
               value={med.duration}
               onChange={val => updateMedicine(idx, 'duration', val)}
               type="DURATION"
               placeholder="Duration"
               className="form-control form-control-sm border-0 shadow-none text-center"
               defaultOptions={DUR_OPTIONS}
            />
         </td>
         <td>
            <AutoCompleteSingleInput
               value={med.notes}
               onChange={val => updateMedicine(idx, 'notes', val)}
               type="NOTES"
               placeholder="Add notes"
               className="form-control form-control-sm border-0 shadow-none text-center"
               defaultOptions={[]}
            />
         </td>
         <td style={{ width: '28px', verticalAlign: 'middle' }}>
            {medicinesLength > 1 && (
               <button
                  className="btn btn-sm p-0 border-0 bg-transparent text-danger"
                  style={{ opacity: 0.45 }}
                  title="Remove medicine"
                  onClick={() => removeMedicine(idx)}
               ><Trash2 size={13} /></button>
            )}
         </td>
      </tr>
   );
};

const DOSAGE_OPTIONS = ['1-0-0', '0-1-0', '0-0-1', '1-1-0', '1-0-1', '0-1-1', '1-1-1', '½-0-0', '0-½-0', '0-0-½', '½-0-½', '½-½-0', '0-½-½', '½-½-½', '2-0-0', '0-2-0', '0-0-2', '2-0-2', '2-2-0', '0-2-2', '2-2-2', '1-0-0-1', '1-1-0-1', '1-1-1-1', '1', '2', '3', '4', '5'];
const WHEN_OPTIONS = ['After Meal', 'Before Meal', 'Empty Stomach', 'Bed Time', 'With Meal', 'SOS', 'Before Breakfast', 'After Breakfast', 'Before Lunch', 'After Lunch', 'Before Dinner', 'After Dinner', 'Before Food', 'After Food', 'With Milk', 'With Water', 'With Juice'];
const FREQ_OPTIONS = ['daily', 'alternate day', 'weekly', 'fort night', 'monthly', 'stat', 'sos', 'weekly twice', 'weekly thrice'];
const DUR_OPTIONS = ['1 Day', '2 Days', '3 Days', '4 Days', '5 Days', '6 Days', '1 Week', '10 Days', '2 Weeks', '3 Weeks', '1 Month', '45 Days', '2 Months', '3 Months', '6 Months', '1 Year', 'Continue', 'Till Reviewed'];
const TYPE_OPTIONS = ['TAB.', 'SYP.', 'CRM.', 'POW.', 'INJ.', 'CAP.', 'DRP.', 'SUS.', 'LIQ.', 'SAC.', 'EXP.', 'OIN.', 'GEN.', 'LOT.', 'GEL.', 'GRA.', 'SOAP.', 'SOL.', 'VAC.', 'PAS.', 'INH.', 'OTH.', 'SPR.'];

const HeaderDropdown = ({ label, options, onSelect }) => {
   const [open, setOpen] = useState(false);
   const [search, setSearch] = useState('');
   
   let dynamicOpts = [];
   if (label === 'Duration' && search.trim().length > 0) {
      const numMatch = search.trim().match(/^(\d+)$/);
      if (numMatch) {
         const num = parseInt(numMatch[1], 10);
         const suffixS = num > 1 ? 's' : '';
         dynamicOpts = [`${num} Day${suffixS}`, `${num} Week${suffixS}`, `${num} Month${suffixS}`, `${num} Year${suffixS}`];
      }
   }

   const filteredOptions = [...dynamicOpts, ...options.filter(opt => {
      if (dynamicOpts.includes(opt)) return false;
      return opt.toLowerCase().includes(search.toLowerCase());
   })];

   return (
      <div className="position-relative d-inline-block text-start w-100">
         <div style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', userSelect: 'none' }} onClick={() => { setOpen(!open); setSearch(''); }}>
            {label} <ChevronDown size={12} />
         </div>
         {open && (
            <>
               <div style={{ position: 'fixed', inset: 0, zIndex: 100 }} onClick={() => setOpen(false)} />
               <div style={{
                  position: 'absolute', top: '100%', left: 0, marginTop: '4px',
                  background: '#fff', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: '1px solid #e2e8f0', zIndex: 101, display: 'flex', flexDirection: 'column'
               }}>
                  <div style={{ padding: '6px' }}>
                     <input 
                        type="text" 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search..."
                        autoFocus
                        style={{ width: '100%', padding: '4px 8px', fontSize: '0.8rem', border: '1px solid #cbd5e1', borderRadius: '4px', outline: 'none' }}
                     />
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', minWidth: '140px' }}>
                     {filteredOptions.length > 0 ? filteredOptions.map(opt => (
                        <div key={opt} style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', borderBottom: '1px solid #f1f5f9', fontWeight: 500, color: '#374151' }}
                           onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                           onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                           onClick={() => { onSelect(opt); setOpen(false); setSearch(''); }}
                        >
                           {opt}
                        </div>
                     )) : (
                        <div style={{ padding: '6px 12px', fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', textAlign: 'center' }}>No match</div>
                     )}
                  </div>
               </div>
            </>
         )}
      </div>
   );
};

const VisitPad = () => {
   const { appointmentId } = useParams();
   const navigate = useNavigate();

   const [loading, setLoading] = useState(true);
   const [formData, setFormData] = useState({
      vitals: { bpSystolic: '', bpDiastolic: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waistHip: '', spo2: '' },
      complaints: [],
      pastHistory: '',
      physicalExamination: '',
      diagnosis: [],
      medicines: [getEmptyMedicineRow()],
      advice: '',
      testsRequested: [],   // simple string array internally
      testsInstruction: '',
      certificate: '',
      nextVisit: { value: '', unit: 'Days', date: '' },
      referredTo: [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }],
      historyDetails: { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
      pastMedications: [],
      physicalExaminationDetails: { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }
   });
   const [patientInfo, setPatientInfo] = useState({});
   const [appointmentInfo, setAppointmentInfo] = useState({});
   const [showHistoryDetails, setShowHistoryDetails] = useState(false);
   const [showPhysicalExamDetails, setShowPhysicalExamDetails] = useState(false);
   const [pastConsultations, setPastConsultations] = useState([]);
   const [activeSidebarTab, setActiveSidebarTab] = useState('Consultation');
   const [showPastView, setShowPastView] = useState(false);
   const [templateModal, setTemplateModal] = useState({ isOpen: false, mode: 'SAVE', storageKey: '', title: '', dataToSave: null, onLoad: null });
   const [referralDoctorsData, setReferralDoctorsData] = useState([]);
   const [showPreviousRxModal, setShowPreviousRxModal] = useState(false);

   const sensors = useSensors(
      useSensor(PointerSensor, {
         activationConstraint: {
            distance: 5,
         },
      }),
      useSensor(KeyboardSensor, {
         coordinateGetter: sortableKeyboardCoordinates,
      })
   );

   const handleDragEnd = (event) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
         setFormData((prev) => {
            const oldIndex = prev.medicines.findIndex((med) => med.id === active.id);
            const newIndex = prev.medicines.findIndex((med) => med.id === over.id);

            return {
               ...prev,
               medicines: arrayMove(prev.medicines, oldIndex, newIndex),
            };
         });
      }
   };

   const [autoSaveStatus, setAutoSaveStatus] = useState('');
   const [isInitialLoad, setIsInitialLoad] = useState(true);

   useEffect(() => {
      fetchConsultation();
      fetchReferralDoctors();
   }, [appointmentId]);

   // Real-time WebSocket sync
   useWebSocket({
      VITALS_UPDATED: (payload) => {
         if (payload?.appointmentId === appointmentId && payload?.vitals) {
            setFormData(prev => ({ ...prev, vitals: payload.vitals }));
         }
      }
   });

   const fetchReferralDoctors = async () => {
      try {
         const response = await axios.get(`${import.meta.env.VITE_API_URL}/admin/referral-doctors`, {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
         });
         setReferralDoctorsData(response.data || []);
      } catch (e) {
         console.error('Error fetching referral doctors', e);
      }
   };

   useEffect(() => {
      if (patientInfo._id) {
         fetchPastConsultations();
      }
   }, [patientInfo._id]);

   const fetchPastConsultations = async () => {
      try {
         const data = await doctorService.getPastConsultations(patientInfo._id);
         // Exclude the current consultation from the past visits list
         setPastConsultations(data.filter(c => c.appointment?._id !== appointmentId));
      } catch (error) {
         console.error('Error fetching past consultations:', error);
      }
   };

   const fetchConsultation = async () => {
      setLoading(true);
      try {
         const data = await doctorService.getConsultation(appointmentId);
         if (data) {
            setFormData({
               vitals: data.vitals || {},
               complaints: data.complaints || [],
               pastHistory: data.pastHistory || '',
               physicalExamination: data.physicalExamination || '',
               diagnosis: data.diagnosis || [],
               medicines: ensureEmptyMedicineRow(data.medicines),
               advice: data.advice || '',
               testsRequested: (Array.isArray(data.testsRequested) && data.testsRequested.length > 0) ? data.testsRequested.map(t => typeof t === 'string' ? t : (t.testName || '')).filter(Boolean) : [],
               testsInstruction: data.testsInstruction || '',
               certificate: data.certificate || '',
               nextVisit: data.nextVisit || { value: '', unit: 'Days', date: '' },
               referredTo: (Array.isArray(data.referredTo) && data.referredTo.length > 0) ? data.referredTo : (data.referredTo && data.referredTo.doctorName ? [{ doctorName: data.referredTo.doctorName, speciality: data.referredTo.speciality, phoneNo: data.referredTo.phoneNo, purpose: data.referredTo.email || data.referredTo.purpose || '' }] : [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }]),
               historyDetails: data.historyDetails || { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
               pastMedications: data.pastMedications || [],
               physicalExaminationDetails: data.physicalExaminationDetails || { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }
            });
            setPatientInfo(data.patient || {});
            setAppointmentInfo(data.appointment || {});
         }
      } catch (error) {
         console.error('Error fetching consultation', error);
      }
      setLoading(false);
      setTimeout(() => setIsInitialLoad(false), 1000);
   };

   const handleSave = async (endConsultation = false, isAutoSave = false) => {
      try {
         const payload = {
            ...formData,
            medicines: formData.medicines.filter(m => m.medicineName && m.medicineName.trim() !== ''),
            // Convert string[] back to [{testName, instruction}] for DB
            testsRequested: (formData.testsRequested || []).map(t => typeof t === 'string' ? { testName: t, instruction: '' } : t),
            testsInstruction: formData.testsInstruction || '',
            certificate: formData.certificate || '',
            isAutoSave: isAutoSave  // ← tell backend not to create followup on autosave
         };
         await doctorService.saveConsultation(appointmentId, payload);
         if (endConsultation) {
            await frontdeskService.updateAppointmentStatus(appointmentId, 'REVIEWED');
            navigate('/doctor');
         } else if (!isAutoSave) {
            alert('Consultation saved successfully');
         }
      } catch (error) {
         console.error('Error saving consultation', error);
         if (!isAutoSave) alert('Failed to save consultation');
         else throw error;
      }
   };

   useEffect(() => {
      if (loading || isInitialLoad) return;
      setAutoSaveStatus('Saving...');
      const timer = setTimeout(() => {
         handleSave(false, true)
            .then(() => setAutoSaveStatus(`Saved at ${new Date().toLocaleTimeString()}`))
            .catch(() => setAutoSaveStatus('Save failed'));
      }, 1500);
      return () => clearTimeout(timer);
   }, [formData, loading, isInitialLoad]);

   const handleVitalChange = (field, value) => {
      setFormData(prev => {
         const updatedVitals = { ...prev.vitals, [field]: value };
         // Auto-calculate BMI when height or weight changes
         const h = parseFloat(field === 'height' ? value : updatedVitals.height);
         const w = parseFloat(field === 'weight' ? value : updatedVitals.weight);
         if (h > 0 && w > 0) {
            const heightInM = h / 100;
            updatedVitals.bmi = (w / (heightInM * heightInM)).toFixed(1);
         } else if (field === 'height' || field === 'weight') {
            updatedVitals.bmi = '';
         }
         return { ...prev, vitals: updatedVitals };
      });
   };



   const generateTimingText = (dosage, when) => {
      if (!dosage) return '';
      const parts = dosage.split('-');

      let prefix = '';
      if (when) {
         if (when.toLowerCase().includes('before') || when.toLowerCase().includes('empty stomach')) prefix = 'Before';
         else if (when.toLowerCase().includes('after')) prefix = 'After';
      }

      const labels = ['breakfast', 'lunch', 'dinner', 'bedtime'];
      let timings = [];

      for (let i = 0; i < parts.length; i++) {
         const val = parseFloat(parts[i]);
         if (!isNaN(val) && val > 0 && i < labels.length) {
            const timingStr = prefix ? `${val} ${prefix} ${labels[i]}` : `${val} ${labels[i]}`;
            timings.push(timingStr);
         }
      }

      return timings.join(', ');
   };

   const bulkUpdateMedicines = (field, value) => {
      setFormData(prev => {
         const updated = prev.medicines.map(med => {
            return { ...med, [field]: value };
         });
         if (field === 'dosage' || field === 'when') {
            updated.forEach(med => {
               med.instructions = generateTimingText(med.dosage, med.when);
            });
         }
         return { ...prev, medicines: updated };
      });
   };

   const addMedicine = () => {
      setFormData(prev => ({
         ...prev,
         medicines: [...prev.medicines, getEmptyMedicineRow()]
      }));
   };

   const removeMedicine = (idx) => {
      setFormData(prev => ({
         ...prev,
         medicines: prev.medicines.filter((_, i) => i !== idx)
      }));
   };

   const updateMedicine = (index, field, value) => {
      setFormData(prev => {
         const updated = [...prev.medicines];
         updated[index] = { ...updated[index], [field]: value };

         if (field === 'dosage' || field === 'when') {
            updated[index].instructions = generateTimingText(updated[index].dosage, updated[index].when);
         }

         // Auto-append new empty row if they start typing in the last row
         if (index === updated.length - 1 && field === 'medicineName' && value && value.trim() !== '') {
            updated.push(getEmptyMedicineRow());
         }

         return { ...prev, medicines: updated };
      });
   };

   const handleMedicineSelect = async (index, name) => {
      if (!name) return;
      try {
         const details = await doctorService.getMedicineDetails(name);
         if (details) {
            setFormData(prev => {
               const updated = [...prev.medicines];
               const current = updated[index];
               // Auto-fill empty fields based on previous usage
               if (!current.genericName && details.genericName) current.genericName = details.genericName;
               if (details.type && current.type === 'TAB.') current.type = details.type;
               if (details.dosage && !current.dosage) current.dosage = details.dosage;
               if (details.when && !current.when) current.when = details.when;
               if (details.frequency && !current.frequency) current.frequency = details.frequency;
               if (details.duration && !current.duration) current.duration = details.duration;
               if (details.notes && !current.notes) current.notes = details.notes;

               if (current.dosage || current.when) {
                  current.instructions = generateTimingText(current.dosage, current.when);
               }

               return { ...prev, medicines: updated };
            });
         }
      } catch (err) {
         console.error('Error auto-filling medicine details', err);
      }
   };

   const handleClearAllMedicines = () => {
      if (window.confirm('Are you sure you want to clear all medicines?')) {
         setFormData(prev => ({ ...prev, medicines: [getEmptyMedicineRow()] }));
      }
   };

   const handleLoadPrevMedicines = () => {
      if (pastConsultations && pastConsultations.length > 0) {
         setShowPreviousRxModal(true);
      } else {
         alert('No previous visits found for this patient.');
      }
   };

   const handleCopyRx = (visitData) => {
      if (window.confirm(`Are you sure you want to replace current data with the prescription from ${moment(visitData.createdAt).format('DD-MMM-YYYY')}?`)) {
         setFormData(prev => ({
            ...prev,
            complaints: visitData.complaints || [],
            pastHistory: visitData.pastHistory || '',
            physicalExamination: visitData.physicalExamination || '',
            diagnosis: visitData.diagnosis || [],
            medicines: ensureEmptyMedicineRow((visitData.medicines || []).map(m => {
               const { _id, ...rest } = m;
               return rest;
            })),
            advice: visitData.advice || '',
            testsRequested: (Array.isArray(visitData.testsRequested) && visitData.testsRequested.length > 0) 
                            ? visitData.testsRequested.map(t => typeof t === 'string' ? t : (t.testName || '')).filter(Boolean) 
                            : [],
            testsInstruction: visitData.testsInstruction || '',
            certificate: visitData.certificate || '',
            nextVisit: visitData.nextVisit || { value: '', unit: 'Days', date: '' },
            historyDetails: visitData.historyDetails || { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
            pastMedications: visitData.pastMedications || [],
            physicalExaminationDetails: visitData.physicalExaminationDetails || { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }
         }));
         setShowPreviousRxModal(false);
      }
   };

   const handleSaveAsTemplate = () => {
      if (formData.medicines.length === 0 || (formData.medicines.length === 1 && formData.medicines[0].medicineName === '')) {
         alert('No medicines to save as template.');
         return;
      }
      setTemplateModal({
         isOpen: true,
         mode: 'SAVE',
         storageKey: 'medicineTemplates',
         title: 'Medicines',
         dataToSave: formData.medicines.filter(m => m.medicineName.trim() !== ''),
         onLoad: null
      });
   };

   const handleLoadTemplate = () => {
      setTemplateModal({
         isOpen: true,
         mode: 'LOAD',
         storageKey: 'medicineTemplates',
         title: 'Medicines',
         dataToSave: null,
         onLoad: (data) => setFormData(prev => ({ ...prev, medicines: ensureEmptyMedicineRow([...prev.medicines.filter(m => m.medicineName.trim() !== ''), ...data]) }))
      });
   };

   const handleClearAllForm = () => {
      if (window.confirm('Are you sure you want to clear the entire consultation form?')) {
         setFormData({
            vitals: { bpSystolic: '', bpDiastolic: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waistHip: '', spo2: '' },
            complaints: [],
            pastHistory: '',
            physicalExamination: '',
            diagnosis: [],
            medicines: [getEmptyMedicineRow()],
            advice: '',
            testsRequested: [], // string array
            testsInstruction: '',
            certificate: '',
            nextVisit: { value: '', unit: 'Days', date: '' },
            referredTo: [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }],
            historyDetails: { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] },
            pastMedications: [],
            physicalExaminationDetails: { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' }
         });
      }
   };

   const handleLoadPrevForm = () => {
      if (pastConsultations && pastConsultations.length > 0) {
         if (window.confirm('Load data from the most recent visit?')) {
            const prev = JSON.parse(JSON.stringify(pastConsultations[0]));
            setFormData({
               ...formData,
               vitals: prev.vitals || formData.vitals,
               complaints: prev.complaints || formData.complaints,
               pastHistory: prev.pastHistory || formData.pastHistory,
               physicalExamination: prev.physicalExamination || formData.physicalExamination,
               diagnosis: prev.diagnosis || formData.diagnosis,
               medicines: ensureEmptyMedicineRow(prev.medicines || formData.medicines),
               advice: prev.advice || formData.advice,
               testsRequested: Array.isArray(prev.testsRequested) ? prev.testsRequested.map(t => typeof t === 'string' ? t : (t.testName || '')).filter(Boolean) : formData.testsRequested,
               testsInstruction: prev.testsInstruction || formData.testsInstruction,
               certificate: prev.certificate || formData.certificate,
               historyDetails: prev.historyDetails || formData.historyDetails,
               pastMedications: prev.pastMedications || formData.pastMedications,
               physicalExaminationDetails: prev.physicalExaminationDetails || formData.physicalExaminationDetails
            });
         }
      } else {
         alert('No past visit data found.');
      }
   };

   const handleSaveFormAsTemplate = () => {
      setTemplateModal({
         isOpen: true,
         mode: 'SAVE',
         storageKey: 'formTemplates',
         title: 'Consultation Form',
         dataToSave: formData,
         onLoad: null
      });
   };

   const handleLoadFormTemplate = () => {
      setTemplateModal({
         isOpen: true,
         mode: 'LOAD',
         storageKey: 'formTemplates',
         title: 'Consultation Form',
         dataToSave: null,
         onLoad: (data) => setFormData(data)
      });
   };

   // ── Generic Per-Section Action Handlers ────────────────────────
   const clearSection = (key, def) => {
      if (window.confirm('Clear this section?'))
         setFormData(p => ({ ...p, [key]: def }));
   };

   const copyPrevSection = (key) => {
      if (!pastConsultations?.length) return alert('No past visit data found.');
      const val = pastConsultations[0][key];
      const isObjectEmpty = (obj) => {
         if (!obj) return true;
         if (Array.isArray(obj)) return obj.length === 0;
         if (typeof obj === 'object') return Object.values(obj).every(v => isObjectEmpty(v));
         return obj === '';
      };
      if (isObjectEmpty(val)) return alert('No past visit data found for this section.');
      if (window.confirm('Load from previous visit?'))
         setFormData(p => ({ ...p, [key]: val }));
   };

   const saveSectionTemplate = (key) => {
      const val = formData[key];
      const isObjectEmpty = (obj) => {
         if (!obj) return true;
         if (Array.isArray(obj)) return obj.length === 0;
         if (typeof obj === 'object') return Object.values(obj).every(v => isObjectEmpty(v));
         return obj === '';
      };
      if (isObjectEmpty(val)) return alert('Nothing to save as template.');
      setTemplateModal({
         isOpen: true,
         mode: 'SAVE',
         storageKey: `sectionTpl_${key}`,
         title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
         dataToSave: val,
         onLoad: null
      });
   };

   const loadSectionTemplate = (key) => {
      setTemplateModal({
         isOpen: true,
         mode: 'LOAD',
         storageKey: `sectionTpl_${key}`,
         title: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
         dataToSave: null,
         onLoad: (data) => setFormData(p => {
            const currentData = p[key];
            let mergedData;

            if (Array.isArray(currentData)) {
               mergedData = [...currentData];
               if (Array.isArray(data)) {
                  mergedData = [...mergedData, ...data];
               } else if (data) {
                  mergedData.push(data);
               }
            } else if (typeof currentData === 'string') {
               if (currentData.trim() === '') {
                  mergedData = data;
               } else {
                  mergedData = currentData + '\n' + data;
               }
            } else if (typeof currentData === 'object' && currentData !== null) {
               mergedData = { ...currentData, ...data };
            } else {
               mergedData = data;
            }

            return { ...p, [key]: mergedData };
         })
      });
   };

   if (loading) return <div className="p-5 text-center">Loading consultation...</div>;

   const patientNameFormatted = `${patientInfo.name || 'Unknown'} (${patientInfo.age || '--'}Y, ${patientInfo.gender || '-'})`;

   const handleNadToggle = (e) => {
      const isChecked = e.target.checked;
      setFormData(prev => {
         let updatedDetails = { ...prev.physicalExaminationDetails, isNad: isChecked };
         if (isChecked) {
            updatedDetails.breast = 'NAD';
            updatedDetails.perSpeculum = 'NAD';
            updatedDetails.perAbdominal = 'NAD';
            updatedDetails.perVaginal = 'NAD';
         } else {
            if (updatedDetails.breast === 'NAD') updatedDetails.breast = '';
            if (updatedDetails.perSpeculum === 'NAD') updatedDetails.perSpeculum = '';
            if (updatedDetails.perAbdominal === 'NAD') updatedDetails.perAbdominal = '';
            if (updatedDetails.perVaginal === 'NAD') updatedDetails.perVaginal = '';
         }
         return { ...prev, physicalExaminationDetails: updatedDetails };
      });
   };

   return (
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', backgroundColor: '#f8f9fa' }}>
         {/* Top Patient Header */}
         <div className="bg-white border-bottom px-4 py-2 d-flex justify-content-between align-items-center shadow-sm">
            <div>
               <div className="d-flex align-items-center gap-3">
                  <h5 className="mb-0 fw-bold text-dark">{patientNameFormatted}</h5>
                  <button className="btn btn-outline-secondary btn-sm py-0 rounded-pill d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                     <Plus size={12} /> tag
                  </button>
                  <button className="btn btn-outline-primary btn-sm py-0 rounded-pill d-flex align-items-center gap-1" style={{ fontSize: '0.75rem' }}>
                     <Phone size={13} /> Call
                  </button>
               </div>
               <div className="text-secondary small">
                  {patientInfo.patientId || appointmentId.slice(-6)} 
                  {appointmentInfo.time && <span className="ms-3 fw-medium">⏰ {appointmentInfo.time}</span>}
                  {appointmentInfo.service && <span className="ms-3 text-primary fw-medium">{appointmentInfo.service}</span>}
               </div>
            </div>
         </div>

         <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
            {/* Left Icon Sidebar */}
            <div className="bg-white border-end d-flex flex-column align-items-center py-3 gap-4" style={{ width: '60px', zIndex: 10 }}>
               <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Consultation')}>
                  <Stethoscope size={20} className={`mb-1 ${activeSidebarTab === 'Consultation' ? 'text-primary' : 'text-secondary'}`} />
                  <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Consultation' ? 'text-primary' : 'text-secondary'}>Consult</div>
               </div>

               <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Documents')}>
                  <FileText size={20} className={`mb-1 ${activeSidebarTab === 'Documents' ? 'text-primary' : 'text-secondary'}`} />
                  <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Documents' ? 'text-primary' : 'text-secondary'}>Documents</div>
               </div>

               <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Vaccine')}>
                  <Droplet size={20} className={`mb-1 ${activeSidebarTab === 'Vaccine' ? 'text-primary' : 'text-secondary'}`} />
                  <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Vaccine' ? 'text-primary' : 'text-secondary'}>Vaccine</div>
               </div>
               <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Tests')}>
                  <List size={20} className={`mb-1 ${activeSidebarTab === 'Tests' ? 'text-primary' : 'text-secondary'}`} />
                  <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Tests' ? 'text-primary' : 'text-secondary'}>Tests</div>
               </div>

               <div className="text-center cursor-pointer" onClick={() => setActiveSidebarTab('Forms')}>
                  <FileBox size={20} className={`mb-1 ${activeSidebarTab === 'Forms' ? 'text-primary' : 'text-secondary'}`} />
                  <div style={{ fontSize: '0.6rem' }} className={activeSidebarTab === 'Forms' ? 'text-primary' : 'text-secondary'}>Forms</div>
               </div>

            </div>

            {/* Main Content Form */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'white' }}>
               {activeSidebarTab === 'Vaccine' ? (
                  <VaccineChart patientId={patientInfo._id} onBack={() => setActiveSidebarTab('Consultation')} />
               ) : activeSidebarTab === 'Tests' ? (
                  <TestChart
                     patientId={patientInfo._id}
                     appointmentId={appointmentId}
                     patientInfo={patientInfo}
                     onBack={() => setActiveSidebarTab('Consultation')}
                  />
               ) : activeSidebarTab === 'Documents' ? (
                  <DocumentsView patientId={patientInfo._id} />
               ) : activeSidebarTab === 'Forms' ? (
                  <FormsView
                     certificate={formData.certificate}
                     onCertificateChange={(val) => setFormData(prev => ({ ...prev, certificate: val }))}
                     onSaveNow={(certVal) => {
                        const payload = {
                           ...formData,
                           certificate: certVal,
                           medicines: formData.medicines.filter(m => m.medicineName && m.medicineName.trim() !== ''),
                           testsRequested: (formData.testsRequested || []).map(t => typeof t === 'string' ? { testName: t, instruction: '' } : t),
                           testsInstruction: formData.testsInstruction || ''
                        };
                        doctorService.saveConsultation(appointmentId, payload)
                           .catch(e => console.error('Certificate save failed', e));
                     }}
                     pastConsultations={pastConsultations}
                     appointmentId={appointmentId}
                  />
               ) : (
                  <div style={{ flex: 1, overflowY: 'auto', paddingBottom: '60px' }}>
                     {/* Form Toolbar */}
                     <div className="d-flex justify-content-between align-items-center p-3 border-bottom sticky-top bg-white" style={{ zIndex: 5 }}>
                        <div className="d-flex gap-4">
                           <div className={`fw-bold cursor-pointer pb-1 ${!showPastView ? 'text-primary border-bottom border-primary border-2' : 'text-secondary'}`} onClick={() => setShowPastView(false)}>
                              {pastConsultations.length + 1}{['st', 'nd', 'rd'][(((pastConsultations.length + 1) % 100) > 10 && ((pastConsultations.length + 1) % 100) < 20) ? 3 : ((pastConsultations.length + 1) % 10) - 1] || 'th'} Visit
                           </div>
                           <div className={`fw-semibold cursor-pointer pb-1 ${showPastView ? 'text-primary border-bottom border-primary border-2' : 'text-secondary'}`} onClick={() => setShowPastView(true)}>View Past</div>
                        </div>
                        {!showPastView && <div className="d-flex gap-3 text-secondary small">
                           <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadPrevForm}><RotateCcw size={13} /> Load Prev Visit</span>
                           <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadFormTemplate}><FileDown size={13} /> Load template</span>
                           <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleSaveFormAsTemplate}><FilePlus size={13} /> Save as template</span>
                           <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleClearAllForm}><Trash2 size={13} /> Clear All</span>
                        </div>}
                     </div>

                     {showPastView ? (
                        <div className="p-4">
                           {pastConsultations.length === 0
                              ? <div className="text-center text-muted py-5 fs-6"><Clock size={15} className="me-2" />No past visit data found.</div>
                              : <PastVisits consultations={pastConsultations} />}
                        </div>
                     ) : (
                        <div className="p-4" style={{ maxWidth: '1000px' }}>

                           {/* Vitals */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Vitals
                                 <SectionActions
                                    onClear={() => clearSection('vitals', { bpSystolic: '', bpDiastolic: '', pulse: '', height: '', weight: '', temperature: '', bmi: '', waistHip: '', spo2: '' })}
                                    onCopyPast={() => copyPrevSection('vitals')}
                                    onSave={() => saveSectionTemplate('vitals')}
                                    onLoad={() => loadSectionTemplate('vitals')}
                                 />
                              </div>
                              <div className="flex-grow-1">
                                 <div className="d-flex flex-wrap gap-4 mb-2">
                                    <div>
                                       <label className="small text-secondary mb-1">BP (mmHg)</label>
                                       <div className="d-flex align-items-center gap-2">
                                          <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '60px' }} value={formData.vitals.bpSystolic} onChange={e => handleVitalChange('bpSystolic', e.target.value)} />
                                          <span className="text-secondary fw-semibold">/</span>
                                          <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '60px' }} value={formData.vitals.bpDiastolic} onChange={e => handleVitalChange('bpDiastolic', e.target.value)} />
                                       </div>
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">Pulse (bpm)</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '80px' }} value={formData.vitals.pulse} onChange={e => handleVitalChange('pulse', e.target.value)} />
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">Height (cm)</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '80px' }} value={formData.vitals.height} onChange={e => handleVitalChange('height', e.target.value)} />
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">Weight (kg)</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '80px' }} value={formData.vitals.weight} onChange={e => handleVitalChange('weight', e.target.value)} />
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">Temp (F)</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '80px' }} value={formData.vitals.temperature} onChange={e => handleVitalChange('temperature', e.target.value)} />
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">BMI (Kg/m2)</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm text-primary fw-semibold bg-light" style={{ width: '80px' }} value={formData.vitals.bmi} onChange={e => handleVitalChange('bmi', e.target.value)} readOnly />
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">Waist/Hip</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '80px' }} value={formData.vitals.waistHip} onChange={e => handleVitalChange('waistHip', e.target.value)} />
                                    </div>
                                    <div>
                                       <label className="small text-secondary mb-1">SPO2 (%)</label>
                                       <input type="text" className="form-control form-control-sm text-center shadow-sm" style={{ width: '80px' }} value={formData.vitals.spo2} onChange={e => handleVitalChange('spo2', e.target.value)} />
                                    </div>
                                 </div>
                              </div>
                           </div>

                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Complaints
                                 <SectionActions
                                    onClear={() => clearSection('complaints', [])}
                                    onCopyPast={() => copyPrevSection('complaints')}
                                    onSave={() => saveSectionTemplate('complaints')}
                                    onLoad={() => loadSectionTemplate('complaints')}
                                 />
                              </div>
                              <AutoCompleteTagInput
                                 tags={formData.complaints}
                                 setTags={(newTags) => setFormData({ ...formData, complaints: newTags })}
                                 type="COMPLAINT"
                                 placeholder="Complaints..."
                              />
                           </div>

                           {/* Past History */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Past History
                                 <SectionActions
                                    onClear={() => clearSection('pastHistory', '')}
                                    onCopyPast={() => copyPrevSection('pastHistory')}
                                    onSave={() => saveSectionTemplate('pastHistory')}
                                    onLoad={() => loadSectionTemplate('pastHistory')}
                                 />
                              </div>
                              <div className="flex-grow-1">
                                 <AutoCompleteTextArea
                                    value={formData.pastHistory}
                                    onChange={(val) => setFormData({ ...formData, pastHistory: val })}
                                    type="PAST_HISTORY"
                                    placeholder="Past History..."
                                 />

                                 <div className="mt-2">
                                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setShowHistoryDetails(!showHistoryDetails)}>
                                       {showHistoryDetails ? 'Hide Detailed History' : 'Show Detailed History'}
                                    </button>
                                    {showHistoryDetails && (
                                       <div className="mt-3 p-3 bg-light rounded border">
                                          <div className="row g-3">
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Allergies</label>
                                                <AutoCompleteTagInput tags={formData.historyDetails.allergies} setTags={v => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, allergies: v } })} type="ALLERGY" placeholder="Add allergy..." />
                                             </div>
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Personal History</label>
                                                <AutoCompleteTagInput tags={formData.historyDetails.personalHistory} setTags={v => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, personalHistory: v } })} type="PERSONAL_HISTORY" placeholder="Add personal history..." />
                                             </div>
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Past Medical History</label>
                                                <AutoCompleteTagInput tags={formData.historyDetails.pastMedicalHistory} setTags={v => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, pastMedicalHistory: v } })} type="PAST_MEDICAL_HISTORY" placeholder="Add medical history..." />
                                             </div>
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Family History</label>
                                                <AutoCompleteTagInput tags={formData.historyDetails.familyHistory} setTags={v => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, familyHistory: v } })} type="FAMILY_HISTORY" placeholder="Add family history..." />
                                             </div>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* Physical Examination */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Physical Exam
                                 <SectionActions
                                    onClear={() => clearSection('physicalExamination', '')}
                                    onCopyPast={() => copyPrevSection('physicalExamination')}
                                    onSave={() => saveSectionTemplate('physicalExamination')}
                                    onLoad={() => loadSectionTemplate('physicalExamination')}
                                 />
                              </div>
                              <div className="flex-grow-1">
                                 <AutoCompleteTextArea
                                    value={formData.physicalExamination}
                                    onChange={(val) => setFormData({ ...formData, physicalExamination: val })}
                                    type="PHYSICAL_EXAM"
                                    placeholder="Physical Examination..."
                                 />

                                 <div className="mt-2">
                                    <div className="d-flex align-items-center gap-3">
                                       <button className="btn btn-sm btn-outline-secondary py-0" onClick={() => setShowPhysicalExamDetails(!showPhysicalExamDetails)}>
                                          {showPhysicalExamDetails ? 'Hide Detailed Examination' : 'Show Detailed Examination'}
                                       </button>
                                       {showPhysicalExamDetails && (
                                          <div className="form-check d-flex align-items-center gap-2 m-0 ms-2">
                                             <input className="form-check-input mt-0" type="checkbox" id="markAllNad" checked={formData.physicalExaminationDetails.isNad} onChange={handleNadToggle} style={{ width: '18px', height: '18px' }} />
                                             <label className="form-check-label text-dark small" htmlFor="markAllNad">
                                                Mark all as NAD
                                             </label>
                                          </div>
                                       )}
                                    </div>

                                    {showPhysicalExamDetails && (
                                       <div className="mt-3 p-3 bg-light rounded border">
                                          <div className="row g-3">
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Breast Examination</label>
                                                <textarea className="form-control" rows="2" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.breast} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, breast: e.target.value } })}></textarea>
                                             </div>
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Per Speculum</label>
                                                <textarea className="form-control" rows="2" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perSpeculum} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, perSpeculum: e.target.value } })}></textarea>
                                             </div>
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Per Abdominal Exam</label>
                                                <textarea className="form-control" rows="2" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perAbdominal} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, perAbdominal: e.target.value } })}></textarea>
                                             </div>
                                             <div className="col-md-6">
                                                <label className="small fw-semibold text-secondary">Per Vaginal Exam</label>
                                                <textarea className="form-control" rows="2" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perVaginal} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, perVaginal: e.target.value } })}></textarea>
                                             </div>
                                          </div>
                                       </div>
                                    )}
                                 </div>
                              </div>
                           </div>

                           {/* Diagnosis */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Diagnosis
                                 <SectionActions
                                    onClear={() => clearSection('diagnosis', [])}
                                    onCopyPast={() => copyPrevSection('diagnosis')}
                                    onSave={() => saveSectionTemplate('diagnosis')}
                                    onLoad={() => loadSectionTemplate('diagnosis')}
                                 />
                              </div>
                              <AutoCompleteTagInput
                                 tags={formData.diagnosis}
                                 setTags={(newTags) => setFormData({ ...formData, diagnosis: newTags })}
                                 type="DIAGNOSIS"
                                 placeholder="Diagnosis..."
                              />
                           </div>

                           {/* Medicines Table */}
                           <div className="mb-4">
                              <table className="table table-bordered table-sm align-middle" style={{ fontSize: '0.85rem' }}>
                                 <thead className="text-secondary" style={{ backgroundColor: '#f4f6fa' }}>
                                    <tr>
                                       <th className="fw-semibold text-center border-0" style={{ width: '40px' }}>#</th>
                                       <th className="fw-semibold border-0" style={{ width: '90px' }}>
                                          <HeaderDropdown label="Type" options={TYPE_OPTIONS} onSelect={(val) => bulkUpdateMedicines('type', val)} />
                                       </th>
                                       <th className="fw-semibold border-0">Medicine</th>
                                       <th className="fw-semibold border-0" style={{ width: '100px' }}>
                                          <HeaderDropdown label="Dosage" options={DOSAGE_OPTIONS} onSelect={(val) => bulkUpdateMedicines('dosage', val)} />
                                       </th>
                                       <th className="fw-semibold border-0" style={{ width: '130px' }}>
                                          <HeaderDropdown label="When" options={WHEN_OPTIONS} onSelect={(val) => bulkUpdateMedicines('when', val)} />
                                       </th>
                                       <th className="fw-semibold border-0" style={{ width: '120px' }}>
                                          <HeaderDropdown label="Frequency" options={FREQ_OPTIONS} onSelect={(val) => bulkUpdateMedicines('frequency', val)} />
                                       </th>
                                       <th className="fw-semibold border-0" style={{ width: '110px' }}>
                                          <HeaderDropdown label="Duration" options={DUR_OPTIONS} onSelect={(val) => bulkUpdateMedicines('duration', val)} />
                                       </th>
                                       <th className="fw-semibold border-0">Notes</th>
                                    </tr>
                                 </thead>
                                 <tbody>
                                    <DndContext
                                       sensors={sensors}
                                       collisionDetection={closestCenter}
                                       onDragEnd={handleDragEnd}
                                    >
                                       <SortableContext
                                          items={formData.medicines.map(m => m.id)}
                                          strategy={verticalListSortingStrategy}
                                       >
                                          {formData.medicines.map((med, idx) => (
                                             <SortableMedicineRow
                                                key={med.id}
                                                id={med.id}
                                                med={med}
                                                idx={idx}
                                                updateMedicine={updateMedicine}
                                                handleMedicineSelect={handleMedicineSelect}
                                                TYPE_OPTIONS={TYPE_OPTIONS}
                                                DOSAGE_OPTIONS={DOSAGE_OPTIONS}
                                                WHEN_OPTIONS={WHEN_OPTIONS}
                                                FREQ_OPTIONS={FREQ_OPTIONS}
                                                DUR_OPTIONS={DUR_OPTIONS}
                                                removeMedicine={removeMedicine}
                                                medicinesLength={formData.medicines.length}
                                             />
                                          ))}
                                       </SortableContext>
                                    </DndContext>
                                 </tbody>
                              </table>
                              <div className="d-flex justify-content-between mt-2">
                                 <button className="btn btn-link text-decoration-none text-secondary p-0" style={{ fontSize: '0.85rem' }} onClick={addMedicine}>Add Medicine</button>
                                 <div className="d-flex gap-3 text-secondary" style={{ fontSize: '0.85rem' }}>
                                    <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadPrevMedicines}><RotateCcw size={13} /> Load Prev</span>
                                    <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleLoadTemplate}><FileDown size={13} /> Load template</span>
                                    <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleSaveAsTemplate}><FilePlus size={13} /> Save as template</span>
                                    <span className="cursor-pointer d-flex align-items-center gap-1" onClick={handleClearAllMedicines}><Trash2 size={13} /> Clear All</span>
                                 </div>
                              </div>
                           </div>

                           {/* Advice */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Advice
                                 <SectionActions
                                    onClear={() => clearSection('advice', '')}
                                    onCopyPast={() => copyPrevSection('advice')}
                                    onSave={() => saveSectionTemplate('advice')}
                                    onLoad={() => loadSectionTemplate('advice')}
                                 />
                              </div>
                              <AutoCompleteTextArea
                                 value={formData.advice}
                                 onChange={(val) => setFormData({ ...formData, advice: val })}
                                 type="ADVICE"
                                 placeholder="..."
                              />
                           </div>

                           {/* Tests Requested */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Tests Requested
                              </div>
                              <div className="flex-grow-1 d-flex flex-column gap-2">
                                 <div style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: '6px 10px', backgroundColor: '#f8f9fa', minHeight: 42 }}>
                                    <AutoCompleteTagInput
                                       tags={formData.testsRequested}
                                       setTags={(newTags) => setFormData(prev => ({ ...prev, testsRequested: newTags }))}
                                       type="TEST"
                                       placeholder="Type test name, press Enter to add…"
                                    />
                                 </div>
                                 <div className="d-flex align-items-center gap-2" style={{ border: '1px solid #dee2e6', borderRadius: 6, padding: '4px 10px', backgroundColor: '#f8f9fa' }}>
                                    <span className="text-muted fw-semibold text-nowrap" style={{fontSize: '0.8rem'}}>Instruction:</span>
                                    <AutoCompleteSingleInput
                                       value={formData.testsInstruction || ''}
                                       onChange={(val) => setFormData(prev => ({ ...prev, testsInstruction: val }))}
                                       type="TEST_INSTRUCTION"
                                       placeholder="e.g. Next Visit, Immediate, or custom instruction..."
                                       defaultOptions={['Next Visit', 'Immediate']}
                                       className="form-control form-control-sm border-0 shadow-none px-1"
                                       style={{ backgroundColor: 'transparent' }}
                                    />
                                 </div>
                              </div>
                           </div>

                           {/* Next Visit */}
                           <div className="d-flex mb-5 pb-4 border-bottom">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px' }}>
                                 Next Visit
                                 <SectionActions
                                    showAll={false}
                                    onClear={() => clearSection('nextVisit', { value: '', unit: 'Days', date: '' })}
                                    onCopyPast={() => { }}
                                    onSave={() => { }}
                                    onLoad={() => { }}
                                 />
                              </div>
                              <div className="d-flex flex-column">
                                 <div className="d-flex gap-3 align-items-center">
                                    {/* Number input — syncs date forward */}
                                    <input
                                       type="text"
                                       className="form-control text-center"
                                       style={{ width: '80px', border: '1px solid #dee2e6' }}
                                       value={formData.nextVisit.value}
                                       placeholder="2"
                                       onChange={e => {
                                          const val = e.target.value;
                                          const num = parseInt(val);
                                          let newDate = '';
                                          if (!isNaN(num) && num > 0) {
                                             const d = new Date();
                                             const unit = formData.nextVisit.unit;
                                             if (unit === 'Days') d.setDate(d.getDate() + num);
                                             if (unit === 'Weeks') d.setDate(d.getDate() + num * 7);
                                             if (unit === 'Months') d.setMonth(d.getMonth() + num);
                                             newDate = d.toISOString().split('T')[0];
                                          }
                                          setFormData({ ...formData, nextVisit: { ...formData.nextVisit, value: val, date: newDate } });
                                       }}
                                    />
                                    {/* Unit buttons — recompute date when switching unit */}
                                    <div className="btn-group">
                                       {['Days', 'Weeks', 'Months'].map((unit, i) => (
                                          <button
                                             key={unit}
                                             className={`btn ${formData.nextVisit.unit === unit ? 'btn-secondary' : 'btn-outline-secondary'}`}
                                             style={{ borderColor: '#dee2e6', ...(i === 1 ? { borderLeft: 0, borderRight: 0 } : {}) }}
                                             onClick={() => {
                                                const num = parseInt(formData.nextVisit.value);
                                                let newDate = '';
                                                if (!isNaN(num) && num > 0) {
                                                   const d = new Date();
                                                   if (unit === 'Days') d.setDate(d.getDate() + num);
                                                   if (unit === 'Weeks') d.setDate(d.getDate() + num * 7);
                                                   if (unit === 'Months') d.setMonth(d.getMonth() + num);
                                                   newDate = d.toISOString().split('T')[0];
                                                }
                                                setFormData({ ...formData, nextVisit: { ...formData.nextVisit, unit, date: newDate || formData.nextVisit.date } });
                                             }}
                                          >
                                             {unit}
                                          </button>
                                       ))}
                                    </div>
                                    <span className="text-secondary mx-2">Or</span>
                                    {/* Date picker — back-calculates value+unit */}
                                    <input
                                       type="date"
                                       className="form-control"
                                       style={{ width: '170px', border: '1px solid #dee2e6', color: formData.nextVisit.date ? '#212529' : '#6c757d' }}
                                       value={formData.nextVisit.date}
                                       onChange={e => {
                                          const dateStr = e.target.value;
                                          if (!dateStr) {
                                             setFormData({ ...formData, nextVisit: { value: '', unit: 'Days', date: '' } });
                                             return;
                                          }
                                          const today = new Date(); today.setHours(0, 0, 0, 0);
                                          const picked = new Date(dateStr); picked.setHours(0, 0, 0, 0);
                                          const diffMs = picked - today;
                                          const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
                                          let value = diffDays, unit = 'Days';
                                          if (diffDays >= 28 && diffDays % 30 === 0) {
                                             value = diffDays / 30; unit = 'Months';
                                          } else if (diffDays >= 7 && diffDays % 7 === 0) {
                                             value = diffDays / 7; unit = 'Weeks';
                                          }
                                          setFormData({ ...formData, nextVisit: { value: String(value > 0 ? value : diffDays), unit, date: dateStr } });
                                       }}
                                    />
                                 </div>
                                 {/* Live follow-up date preview */}
                                 {(() => {
                                    const nv = formData.nextVisit;
                                    let computed = null;
                                    if (nv.date) {
                                       computed = new Date(nv.date);
                                    } else if (nv.value && parseInt(nv.value) > 0) {
                                       computed = new Date();
                                       const val = parseInt(nv.value);
                                       if (nv.unit === 'Days') computed.setDate(computed.getDate() + val);
                                       if (nv.unit === 'Weeks') computed.setDate(computed.getDate() + val * 7);
                                       if (nv.unit === 'Months') computed.setMonth(computed.getMonth() + val);
                                    }
                                    if (!computed) return null;
                                    const label = computed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
                                    return (
                                       <div className="d-flex align-items-center gap-2 mt-2 ms-1" style={{ color: '#16a34a', fontSize: '0.88rem', fontWeight: 600 }}>
                                          <Calendar size={15} />
                                          Follow-up on: <span style={{ background: '#dcfce7', borderRadius: '6px', padding: '1px 8px', border: '1px solid #86efac' }}>{label}</span>
                                       </div>
                                    );
                                 })()}
                              </div>
                           </div>

                           {/* Referred to */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center d-flex flex-column align-items-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                                 <div className="mb-2">Referred to</div>
                                 <SectionActions
                                    showAll={false}
                                    onClear={() => clearSection('referredTo', [{ doctorName: '', speciality: '', phoneNo: '', purpose: '' }])}
                                    onCopyPast={() => { }}
                                    onSave={() => { }}
                                    onLoad={() => { }}
                                 />
                                 <button className="btn btn-outline-primary btn-sm rounded-circle shadow-sm d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px', padding: 0 }} onClick={() => setFormData(prev => ({ ...prev, referredTo: [...prev.referredTo, { doctorName: '', speciality: '', phoneNo: '', purpose: '' }] }))}>
                                    <Plus size={14} />
                                 </button>
                              </div>
                              <div className="flex-grow-1">
                                 {formData.referredTo.map((referral, index) => (
                                    <div key={index} className="row g-3 align-items-end mb-3 pb-3 border-bottom position-relative">
                                       {formData.referredTo.length > 1 && (
                                          <div className="position-absolute" style={{ top: 0, right: 0, width: 'auto' }}>
                                             <X size={16} className="text-danger cursor-pointer" onClick={() => setFormData(prev => ({ ...prev, referredTo: prev.referredTo.filter((_, i) => i !== index) }))} />
                                          </div>
                                       )}
                                       <div className="w-100">
                                          <div className="row g-3">
                                             {/* Doctor Name */}
                                             <div className="col-md-6">
                                                <label className="form-label small text-secondary mb-1">Doctor Name</label>
                                                <div className="input-group shadow-sm">
                                                   <span className="input-group-text bg-white text-primary border-end-0" style={{ borderColor: '#dee2e6' }}>Dr.</span>
                                                   <input
                                                      className="form-control border-start-0 ps-0 text-primary"
                                                      style={{ borderColor: '#dee2e6' }}
                                                      placeholder="Doctor Name"
                                                      list={`referredTo-doctors-${index}`}
                                                      value={referral.doctorName}
                                                      onChange={e => {
                                                         const val = e.target.value;
                                                         const newArr = [...formData.referredTo];
                                                         newArr[index].doctorName = val;
                                                         const match = referralDoctorsData.find(d => d.name.toLowerCase() === val.toLowerCase());
                                                         if (match) {
                                                            const dbSpec = match.specialization || '';
                                                            const SPECIALITIES = [
                                                              "Anesthesiologist", "Cardiologist", "Counsellor", "CVT surgeon", "Dental", "Dental surgeon", 
                                                              "Dermatologist", "Diabetologist", "Dietician", "Endocrinologist", "ENT", "Foot Surgeon", 
                                                              "Gastroenterologist", "General Physician", "General Surgeon", "Gynecologist", "Hematologist", 
                                                              "Hepatologist", "Immunologist", "Nephrologist", "Neuro Physician", "Neurologist", "Neurosurgeon", 
                                                              "Nuclear Medicine", "Nutritionist", "Oncologist", "Ophthalmologist", "Ortho Surgeon", "Orthopedician", 
                                                              "Pathologist", "Pediatrician", "Physician", "Physiotherapist", "Plastic surgery", "Podiatrist", 
                                                              "Psychiatrist", "Psychologist", "Pulmonologist", "Radiologist", "Retina Surgeon", "Surgeon", 
                                                              "Surgical Gastrenterologist", "TAVI Specialist", "Urologist", "Vascular surgeon"
                                                            ];
                                                            const matchedOpt = SPECIALITIES.find(s => s.toLowerCase() === dbSpec.toLowerCase());
                                                            newArr[index].speciality = matchedOpt || dbSpec;
                                                         }
                                                         setFormData({ ...formData, referredTo: newArr });
                                                      }}
                                                   />
                                                   <datalist id={`referredTo-doctors-${index}`}>
                                                      {referralDoctorsData.filter(d => d.type === 'TO' || !d.type).map(doc => (
                                                         <option key={doc._id} value={doc.name}>{doc.specialization}</option>
                                                      ))}
                                                   </datalist>
                                                </div>
                                             </div>
                                             {/* Speciality */}
                                             <div className="col-md-6">
                                                <label className="form-label small text-secondary mb-1">Speciality</label>
                                                <select className="form-select text-secondary shadow-sm" style={{ borderColor: '#dee2e6' }} value={referral.speciality} onChange={e => {
                                                   const newArr = [...formData.referredTo];
                                                   newArr[index].speciality = e.target.value;
                                                   setFormData({ ...formData, referredTo: newArr });
                                                }}>
                                                   <option value="">Speciality</option>
                                                   <option value="Anesthesiologist">Anesthesiologist</option>
                                                   <option value="Cardiologist">Cardiologist</option>
                                                   <option value="Counsellor">Counsellor</option>
                                                   <option value="CVT surgeon">CVT surgeon</option>
                                                   <option value="Dental">Dental</option>
                                                   <option value="Dental surgeon">Dental surgeon</option>
                                                   <option value="Dermatologist">Dermatologist</option>
                                                   <option value="Diabetologist">Diabetologist</option>
                                                   <option value="Dietician">Dietician</option>
                                                   <option value="Endocrinologist">Endocrinologist</option>
                                                   <option value="ENT">ENT</option>
                                                   <option value="Foot Surgeon">Foot Surgeon</option>
                                                   <option value="Gastroenterologist">Gastroenterologist</option>
                                                   <option value="General Physician">General Physician</option>
                                                   <option value="General Surgeon">General Surgeon</option>
                                                   <option value="Gynecologist">Gynecologist</option>
                                                   <option value="Hematologist">Hematologist</option>
                                                   <option value="Hepatologist">Hepatologist</option>
                                                   <option value="Immunologist">Immunologist</option>
                                                   <option value="Nephrologist">Nephrologist</option>
                                                   <option value="Neuro Physician">Neuro Physician</option>
                                                   <option value="Neurologist">Neurologist</option>
                                                   <option value="Neurosurgeon">Neurosurgeon</option>
                                                   <option value="Nuclear Medicine">Nuclear Medicine</option>
                                                   <option value="Nutritionist">Nutritionist</option>
                                                   <option value="Oncologist">Oncologist</option>
                                                   <option value="Ophthalmologist">Ophthalmologist</option>
                                                   <option value="Ortho Surgeon">Ortho Surgeon</option>
                                                   <option value="Orthopedician">Orthopedician</option>
                                                   <option value="Pathologist">Pathologist</option>
                                                   <option value="Pediatrician">Pediatrician</option>
                                                   <option value="Physician">Physician</option>
                                                   <option value="Physiotherapist">Physiotherapist</option>
                                                   <option value="Plastic surgery">Plastic surgery</option>
                                                   <option value="Podiatrist">Podiatrist</option>
                                                   <option value="Psychiatrist">Psychiatrist</option>
                                                   <option value="Psychologist">Psychologist</option>
                                                   <option value="Pulmonologist">Pulmonologist</option>
                                                   <option value="Radiologist">Radiologist</option>
                                                   <option value="Retina Surgeon">Retina Surgeon</option>
                                                   <option value="Surgeon">Surgeon</option>
                                                   <option value="Surgical Gastrenterologist">Surgical Gastrenterologist</option>
                                                   <option value="TAVI Specialist">TAVI Specialist</option>
                                                   <option value="Urologist">Urologist</option>
                                                   <option value="Vascular surgeon">Vascular surgeon</option>
                                                </select>
                                             </div>
                                          </div>
                                          {/* Line 2 */}
                                          <div className="row g-3 mt-1">
                                             <div className="col-md-6">
                                                <label className="form-label small text-secondary mb-1">Phone No</label>
                                                <div className="input-group shadow-sm w-100">
                                                   <span className="input-group-text bg-white text-primary border-end-0" style={{ borderColor: '#dee2e6' }}>+91</span>
                                                   <input
                                                      type="text"
                                                      className="form-control border-start-0 ps-0"
                                                      placeholder="10-digit number"
                                                      maxLength={10}
                                                      value={referral.phoneNo}
                                                      onChange={e => {
                                                         const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                         const newArr = [...formData.referredTo];
                                                         newArr[index].phoneNo = val;
                                                         setFormData({ ...formData, referredTo: newArr });
                                                      }}
                                                      style={{ borderColor: '#dee2e6' }}
                                                   />
                                                </div>
                                             </div>
                                             {/* Purpose */}
                                             <div className="col-md-6">
                                                <label className="form-label small text-secondary mb-1">Purpose</label>
                                                <div className="input-group shadow-sm">
                                                   <span className="input-group-text bg-white text-primary border-end-0" style={{ borderColor: '#dee2e6' }}><FileText size={14} /></span>
                                                   <input
                                                      type="text"
                                                      className="form-control border-start-0 ps-0 text-secondary"
                                                      placeholder="Purpose of referral"
                                                      value={referral.purpose}
                                                      onChange={e => {
                                                         const newArr = [...formData.referredTo];
                                                         newArr[index].purpose = e.target.value;
                                                         setFormData({ ...formData, referredTo: newArr });
                                                      }}
                                                      style={{ borderColor: '#dee2e6' }}
                                                   />
                                                </div>
                                             </div>
                                          </div>
                                       </div>
                                    </div>
                                 ))}
                              </div>
                           </div>

                           {/* History */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                                 <div className="mb-2">History</div>
                                 <SectionActions
                                    onClear={() => clearSection('historyDetails', { allergies: [], personalHistory: [], pastMedicalHistory: [], familyHistory: [] })}
                                    onCopyPast={() => copyPrevSection('historyDetails')}
                                    onSave={() => saveSectionTemplate('historyDetails')}
                                    onLoad={() => loadSectionTemplate('historyDetails')}
                                 />
                              </div>
                              <div className="flex-grow-1">
                                 <button className="btn bg-white shadow-sm px-3 mb-3" style={{ borderColor: '#dee2e6' }} onClick={() => setShowHistoryDetails(!showHistoryDetails)}>
                                    {showHistoryDetails ? '-' : '+'}
                                 </button>
                                 {showHistoryDetails && (
                                    <div className="row g-3">
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Allergies</label>
                                          <AutoCompleteTagInput
                                             tags={formData.historyDetails.allergies}
                                             setTags={(newTags) => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, allergies: newTags } })}
                                             type="ALLERGIES"
                                             placeholder="Allergies..."
                                          />
                                       </div>
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Personal History</label>
                                          <AutoCompleteTagInput
                                             tags={formData.historyDetails.personalHistory}
                                             setTags={(newTags) => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, personalHistory: newTags } })}
                                             type="PERSONAL_HISTORY"
                                             placeholder="Personal History..."
                                          />
                                       </div>
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Past Medical History</label>
                                          <AutoCompleteTagInput
                                             tags={formData.historyDetails.pastMedicalHistory}
                                             setTags={(newTags) => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, pastMedicalHistory: newTags } })}
                                             type="PAST_MEDICAL_HISTORY"
                                             placeholder="Past Medical History..."
                                          />
                                       </div>
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Family History</label>
                                          <AutoCompleteTagInput
                                             tags={formData.historyDetails.familyHistory}
                                             setTags={(newTags) => setFormData({ ...formData, historyDetails: { ...formData.historyDetails, familyHistory: newTags } })}
                                             type="FAMILY_HISTORY"
                                             placeholder="Family History..."
                                          />
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>

                           {/* Past Medication */}
                           <div className="d-flex mb-4">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                                 <div className="mb-1">Past Medication</div>
                                 <SectionActions
                                    onClear={() => clearSection('pastMedications', [])}
                                    onCopyPast={() => copyPrevSection('pastMedications')}
                                    onSave={() => saveSectionTemplate('pastMedications')}
                                    onLoad={() => loadSectionTemplate('pastMedications')}
                                 />
                              </div>
                              <div className="flex-grow-1 d-flex">
                                 <AutoCompleteTagInput
                                    tags={formData.pastMedications}
                                    setTags={(newTags) => setFormData({ ...formData, pastMedications: newTags })}
                                    type="MEDICINE"
                                    placeholder="Past Medications..."
                                 />
                              </div>
                           </div>

                           {/* Physical Examination */}
                           <div className="d-flex mb-5 pb-5">
                              <div className="fw-semibold text-primary text-center" style={{ width: '150px', fontSize: '0.9rem' }}>
                                 <div className="mb-2">Physical Examination</div>
                                 <SectionActions
                                    onClear={() => clearSection('physicalExaminationDetails', { isNad: false, breast: '', perSpeculum: '', perAbdominal: '', perVaginal: '' })}
                                    onCopyPast={() => copyPrevSection('physicalExaminationDetails')}
                                    onSave={() => saveSectionTemplate('physicalExaminationDetails')}
                                    onLoad={() => loadSectionTemplate('physicalExaminationDetails')}
                                 />
                              </div>
                              <div className="flex-grow-1">
                                 <div className="d-flex align-items-center gap-3 mb-3">
                                    <button className="btn bg-white shadow-sm px-3" style={{ borderColor: '#dee2e6' }} onClick={() => setShowPhysicalExamDetails(!showPhysicalExamDetails)}>
                                       {showPhysicalExamDetails ? '-' : '+'}
                                    </button>
                                    {showPhysicalExamDetails && (
                                       <div className="form-check d-flex align-items-center gap-2 m-0 ms-2">
                                          <input className="form-check-input mt-0" type="checkbox" id="markAllNad" checked={formData.physicalExaminationDetails.isNad} onChange={handleNadToggle} style={{ width: '20px', height: '20px', borderColor: '#dee2e6', borderRadius: '4px' }} />
                                          <label className="form-check-label text-dark" style={{ fontSize: '0.9rem' }} htmlFor="markAllNad">
                                             Mark all fields as NAD
                                          </label>
                                       </div>
                                    )}
                                 </div>
                                 {showPhysicalExamDetails && (
                                    <div className="row g-4">
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Breast Examination</label>
                                          <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.breast} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, breast: e.target.value } })}></textarea>
                                       </div>
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Per Speculum</label>
                                          <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perSpeculum} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, perSpeculum: e.target.value } })}></textarea>
                                       </div>
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Per Abdominal Examination</label>
                                          <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perAbdominal} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, perAbdominal: e.target.value } })}></textarea>
                                       </div>
                                       <div className="col-md-6">
                                          <label className="form-label small text-dark fw-semibold mb-1">Per Vaginal Examination</label>
                                          <textarea className="form-control" rows="3" style={{ borderColor: '#dee2e6', borderRadius: '6px' }} value={formData.physicalExaminationDetails.perVaginal} onChange={e => setFormData({ ...formData, physicalExaminationDetails: { ...formData.physicalExaminationDetails, perVaginal: e.target.value } })}></textarea>
                                       </div>
                                    </div>
                                 )}
                              </div>
                           </div>
                        </div>
                     )}
                  </div>
               )}

               {/* Bottom Action Bar */}
               <div style={{ position: 'fixed', bottom: 0, left: 60, right: 0, height: '60px', background: '#f8f9fa', borderTop: '1px solid #dee2e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, padding: '0 24px', zIndex: 9999, boxShadow: '0 -2px 8px rgba(0,0,0,0.08)' }}>
                  <div className="text-secondary small d-flex align-items-center gap-2">
                     {autoSaveStatus === 'Saving...' ? <RotateCcw size={14} className="spin" /> : <Save size={14} />}
                     <span>{autoSaveStatus || 'All changes saved automatically'}</span>
                  </div>
                  <div className="d-flex align-items-center gap-3">
                     <select className="form-select form-select-sm bg-transparent shadow-none" style={{ width: '100px', borderColor: '#ccc' }}>
                        <option>English</option>
                     </select>
                     <div title="Send WhatsApp">
                        <MessageCircle size={20} className="cursor-pointer text-success" onClick={async () => {
                           await handleSave(false);
                           let phone = patientInfo?.phone;
                           if (phone) {
                              if (phone.length === 10) phone = '91' + phone;
                              window.open(`https://wa.me/${phone}`, '_blank');
                           } else {
                              alert('Patient phone number not found');
                           }
                        }} />
                     </div>
                     <Mail size={18} className="cursor-pointer text-primary" onClick={async () => {
                        await handleSave(false);
                        window.open(`/doctor/visit/${appointmentId}/print?email=true`, '_blank');
                     }} title="Email" />
                     <Printer size={18} className="cursor-pointer text-primary" onClick={async () => {
                        await handleSave(false);
                        window.open(`/doctor/visit/${appointmentId}/print`, '_blank');
                     }} title="Print" />
                  </div>
                  <div className="d-flex gap-2 ms-2">
                     <button className="btn btn-primary px-4 fw-semibold shadow-sm d-flex align-items-center gap-2" style={{ backgroundColor: '#1a237e', borderColor: '#1a237e' }} onClick={() => handleSave(false)}>
                        <Save size={14} /> Save
                     </button>
                     <button className="btn btn-danger px-4 fw-semibold shadow-sm" onClick={() => handleSave(true)}>End Consultation</button>
                  </div>
               </div>
            </div>
         </div>
         <TemplateManagerModal
            isOpen={templateModal.isOpen}
            onClose={() => setTemplateModal(p => ({ ...p, isOpen: false }))}
            mode={templateModal.mode}
            storageKey={templateModal.storageKey}
            title={templateModal.title}
            dataToSave={templateModal.dataToSave}
            onLoad={templateModal.onLoad}
         />
         <PreviousRxModal
            isOpen={showPreviousRxModal}
            onClose={() => setShowPreviousRxModal(false)}
            pastConsultations={pastConsultations}
            onCopyRx={handleCopyRx}
         />
      </div>
   );
};

export default VisitPad;
