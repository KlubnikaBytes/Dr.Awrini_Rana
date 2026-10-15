import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Activity, LogOut, Check, ShieldCheck, Stethoscope, Users, Monitor,
  Microscope, Sun, Home, CreditCard, ChevronDown, ChevronUp,
  ArrowRight, Sparkles, Building, Lock, Menu, X, HelpCircle,
  FileText, CheckCircle2, Phone, Mail, Award, Clock, ArrowUpRight,
  Zap, RefreshCw, BarChart2, Star, CheckCircle, Smartphone,
  Layers, HeartPulse, Shield, Globe
} from 'lucide-react';
import heroImg from '../../assets/mediplix-hero.jpg';
import featureImg from '../../assets/mediplix-emr-feature.jpg';
import { SUBSCRIPTION_PLANS, getPlanById } from '../../config/subscriptionPlans';
import CheckoutModal from '../Subscription/CheckoutModal';
import './LandingPage.css';

const LandingPage = () => {
  const [billingInterval, setBillingInterval] = useState('yearly');
  const [activeFaq, setActiveFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedPlanForCheckout, setSelectedPlanForCheckout] = useState(null);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [activeLegalModal, setActiveLegalModal] = useState(null); // 'terms' | 'privacy' | 'refund'
  const [activeSub, setActiveSub] = useState(null);
  const [activeModuleTab, setActiveModuleTab] = useState('doctor');

  // Navbar scroll visibility states
  const [navVisible, setNavVisible] = useState(true);
  const [isScrolled, setIsScrolled] = useState(false);

  const navigate = useNavigate();
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('clinicId');
    localStorage.removeItem('clinicName');
    setToken(null);
    setUser({});
    setActiveSub(null);
    setMobileMenuOpen(false);
    navigate('/');
  };

  // Load existing subscription status if user is logged in
  useEffect(() => {
    if (token) {
      import('../../services/subscriptionService').then((module) => {
        module.default.getMySubscription()
          .then((res) => {
            if (res?.hasActiveSubscription && res.subscription) {
              setActiveSub(res.subscription);
            }
          })
          .catch(() => {});
      });
    }
  }, [token]);

  const lastScrollYRef = useRef(0);
  const accumulatedDeltaRef = useRef(0);

  // Navbar hide on scroll down / reveal on scroll up
  useEffect(() => {
    const getScrollY = () =>
      window.pageYOffset ||
      window.scrollY ||
      document.documentElement.scrollTop ||
      document.body.scrollTop ||
      0;

    lastScrollYRef.current = getScrollY();

    const handleScroll = () => {
      const currentScrollY = getScrollY();
      const prevScrollY = lastScrollYRef.current;
      const delta = currentScrollY - prevScrollY;

      // Update background blur state
      if (currentScrollY > 20) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }

      // If user is near the very top (first 80px), always show navbar
      if (currentScrollY < 80) {
        setNavVisible(true);
        accumulatedDeltaRef.current = 0;
      } else {
        // Track accumulated movement in the same direction
        if ((delta > 0 && accumulatedDeltaRef.current < 0) || (delta < 0 && accumulatedDeltaRef.current > 0)) {
          accumulatedDeltaRef.current = 0; // Direction reversed
        }
        accumulatedDeltaRef.current += delta;

        // Require at least 20px of deliberate downward scroll to hide
        if (accumulatedDeltaRef.current > 20 && delta > 0) {
          if (!mobileMenuOpen) {
            setNavVisible(false);
          }
        }
        // Require at least 20px of deliberate upward scroll to reveal
        else if (accumulatedDeltaRef.current < -20 && delta < 0) {
          setNavVisible(true);
        }
      }

      lastScrollYRef.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    document.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      document.removeEventListener('scroll', handleScroll);
    };
  }, [mobileMenuOpen]);

  // Scroll reveal observer for elements with .lp-reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px',
      }
    );

    const elements = document.querySelectorAll('.lp-reveal');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  const handleSelectPlan = (planId) => {
    setSelectedPlanForCheckout(planId);
    setShowCheckoutModal(true);
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqs = [
    {
      q: 'How do the clinic limits work in each plan?',
      a: 'Clinic quotas are strictly enforced by our server architecture. Basic accommodates 1 clinic practice; Standard allows up to 3 separate clinic branches with instantaneous switching; and Premium allows up to 5 clinics. Each clinic maintains completely isolated patients, doctor schedules, staff credentials, and billing ledgers.',
    },
    {
      q: 'Can I upgrade my subscription plan later?',
      a: 'Yes, absolutely! You can upgrade your plan at any time directly from the in-app Subscription Dashboard. Your prorated remaining credit is calculated automatically, and your new clinic capacity is unlocked immediately upon verified payment.',
    },
    {
      q: 'How does payment processing work with Razorpay?',
      a: 'All transactions are encrypted and processed through Razorpay. We support UPI, credit/debit cards, net banking, and digital wallets. Your payment signature is verified cryptographically via HMAC-SHA256 on our secure backend before your subscription is activated.',
    },
    {
      q: 'Do existing users need to create a new account for the subscription?',
      a: 'No! Mediplix uses a single, unified authentication architecture. You use the exact same login credentials for both subscription billing and clinical management.',
    },
    {
      q: 'What happens if my subscription expires or is cancelled?',
      a: 'Your medical data, patient records, and past prescriptions are preserved safely. If a plan expires or auto-renewal is cancelled, your access remains intact until the end of your prepaid period. You can renew at any time.',
    },
    {
      q: 'Is our clinical and patient health data secure?',
      a: 'Mediplix employs 256-bit SSL encryption in transit, strict multi-tenant isolation, role-based access control (RBAC), and automated backups to ensure your clinic data remains confidential and secure.',
    },
  ];

  // Clinical modules data for interactive tab showcase
  const moduleData = {
    doctor: {
      tag: 'CLINICAL CONSULTATION & EMR',
      title: 'Doctor VisitPad & Intelligent Rx Engine',
      desc: 'Formulate precision electronic prescriptions in under 60 seconds with our integrated 10,000+ medication database, interactive dosage calculators, and automatic multi-lingual translation.',
      features: [
        'Search across 10,000+ verified brand & generic formulations with strength presets',
        'Automatic prescription dosage translation into 8 Indian regional languages',
        'Millimeter print margin calibration for physical clinic letterheads with digital doctor signature',
        'One-click prescription cloning from past appointments for chronic disease follow-ups',
      ],
      previewCard: (
        <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, borderBottom: '1px solid #e2e8f0', paddingBottom: 10 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#0f172a' }}>VisitPad — Dr. Awrini Rana</div>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Patient: Rahul Sharma (34M) • UHID #MED-8492</div>
            </div>
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 999 }}>Active Visit</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.82rem' }}>
            <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px' }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8' }}>Rx 1: Amoxicillin + Clavulanic Acid (Augmentin 625)</div>
              <div style={{ color: '#475569', fontSize: '0.78rem' }}>1 tablet • Morning & Night (1-0-1) • After Food • 5 Days</div>
              <div style={{ fontSize: '0.72rem', color: '#059669', marginTop: 3 }}>✓ Bengali & Hindi translation included • QR Code Verified</div>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px' }}>
              <div style={{ fontWeight: 700, color: '#1d4ed8' }}>Rx 2: Paracetamol 650mg (Dolo 650)</div>
              <div style={{ color: '#475569', fontSize: '0.78rem' }}>1 tablet • SOS / If fever &gt; 100°F • Max 3 tablets/day</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Vitals: BP 120/80 • HR 76 • SpO2 99%</span>
              <button style={{ background: '#2563eb', color: '#ffffff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: '0.75rem', fontWeight: 600 }}>Print Rx</button>
            </div>
          </div>
        </div>
      ),
    },
    queue: {
      tag: 'REAL-TIME QUEUE STREAM',
      title: 'OPD Live Queue & Waiting Hall TV Board',
      desc: 'Say goodbye to waiting area chaos. Mediplix streams live patient tokens via high-speed WebSockets directly to waiting hall TV screens and doctor workstations with sub-second latency.',
      features: [
        'Automated token generation with multi-department and multi-doctor distribution',
        'Dedicated fullscreen TV route (/patient-q) designed for waiting room displays',
        'Audio chimes and real-time status transitions (Waiting, In-Consultation, Completed)',
        'STAT emergency priority queue escalation for urgent trauma or pediatric cases',
      ],
      previewCard: (
        <div style={{ background: '#0f172a', borderRadius: 16, border: '1px solid #1e293b', padding: '1.5rem', color: '#ffffff', boxShadow: '0 8px 24px rgba(0,0,0,0.2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div className="lp-pulse-dot" />
              <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.05em', color: '#93c5fd' }}>LIVE OPD QUEUE DISPLAY</span>
            </div>
            <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.1)', padding: '2px 8px', borderRadius: 6 }}>Room 3 • General Medicine</span>
          </div>
          <div style={{ background: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(59, 130, 246, 0.4)', borderRadius: 12, padding: '16px', textAlign: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: '0.75rem', color: '#93c5fd', textTransform: 'uppercase', fontWeight: 700 }}>Now In Consultation</div>
            <div style={{ fontSize: '2.5rem', fontWeight: 900, color: '#38bdf8', letterSpacing: '0.02em', margin: '4px 0' }}>TOKEN #18</div>
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>Rahul Sharma (UHID #8492)</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, fontSize: '0.78rem' }}>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 8 }}>
              <div style={{ color: '#94a3b8' }}>Next In Queue:</div>
              <div style={{ fontWeight: 700, color: '#ffffff' }}>#19 Priya Patel</div>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.05)', padding: '8px 10px', borderRadius: 8 }}>
              <div style={{ color: '#94a3b8' }}>Average Wait Time:</div>
              <div style={{ fontWeight: 700, color: '#22c55e' }}>~7 Minutes</div>
            </div>
          </div>
        </div>
      ),
    },
    lab: {
      tag: 'PATHOLOGY & LIS',
      title: 'Integrated Diagnostic Laboratory System',
      desc: 'Seamlessly order, process, and certify pathology investigations. Automatically highlight abnormal reference ranges and dispatch PDF lab reports with digital pathologist signatures.',
      features: [
        'Complete pathology panels: CBC, Lipid Profile, Liver Function, HbA1c, and Thyroid',
        'Automatic flagging of high/low abnormal values against age & gender reference bounds',
        'A5 / A4 formatted pathology invoices with instant WhatsApp patient dispatch',
        'Direct synchronization between Doctor VisitPad investigation orders and Lab desk',
      ],
      previewCard: (
        <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Complete Blood Count (CBC)</div>
            <span style={{ background: '#fee2e2', color: '#b91c1c', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>2 Abnormal Flags</span>
          </div>
          <table style={{ width: '100%', fontSize: '0.78rem', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ color: '#64748b', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ paddingBottom: 6 }}>Test Parameter</th>
                <th style={{ paddingBottom: 6 }}>Result</th>
                <th style={{ paddingBottom: 6 }}>Reference</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>Hemoglobin</td>
                <td style={{ padding: '6px 0', color: '#b91c1c', fontWeight: 700 }}>10.2 g/dL ↓</td>
                <td style={{ padding: '6px 0', color: '#64748b' }}>13.0 - 17.0</td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>Total Leucocyte (WBC)</td>
                <td style={{ padding: '6px 0', color: '#b91c1c', fontWeight: 700 }}>12,800 /uL ↑</td>
                <td style={{ padding: '6px 0', color: '#64748b' }}>4,000 - 11,000</td>
              </tr>
              <tr>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>Platelet Count</td>
                <td style={{ padding: '6px 0', color: '#15803d', fontWeight: 700 }}>2.4 Lakhs ✓</td>
                <td style={{ padding: '6px 0', color: '#64748b' }}>1.5 - 4.5</td>
              </tr>
            </tbody>
          </table>
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 8 }}>
            <span style={{ fontSize: '0.72rem', color: '#059669', fontWeight: 600 }}>✓ Verified by Pathologist</span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Invoice #LAB-1092</span>
          </div>
        </div>
      ),
    },
    daycare: {
      tag: 'INPATIENT & WARD CARE',
      title: 'Day Care & Ward Bed Capacity Grid',
      desc: 'Manage short-stay procedures, daycare bed allocations, and electronic medication administration records (e-MAR) with nurse verification and consolidated discharge billing.',
      features: [
        'Interactive color-coded bed occupancy grid (Available, Occupied, Under Maintenance)',
        'Electronic MAR charts with nurse sign-off timestamps and dosage verification',
        'Procedure consumable tracking and unified IPD discharge clearance invoicing',
        'Direct admission from OPD Doctor VisitPad without re-entering patient records',
      ],
      previewCard: (
        <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Day Care Ward A (6 Beds)</div>
            <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 700 }}>4 Occupied • 2 Available</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {['Bed 1 (Occupied)', 'Bed 2 (Occupied)', 'Bed 3 (Available)', 'Bed 4 (Occupied)', 'Bed 5 (Available)', 'Bed 6 (Occupied)'].map((bed, idx) => {
              const isOccupied = bed.includes('Occupied');
              return (
                <div key={idx} style={{
                  background: isOccupied ? '#fee2e2' : '#dcfce7',
                  border: isOccupied ? '1px solid #fca5a5' : '1px solid #86efac',
                  borderRadius: 8,
                  padding: '8px',
                  textAlign: 'center',
                  fontSize: '0.72rem',
                }}>
                  <div style={{ fontWeight: 700, color: isOccupied ? '#991b1b' : '#166534' }}>{bed.split(' ')[0]} {bed.split(' ')[1]}</div>
                  <div style={{ color: isOccupied ? '#b91c1c' : '#15803d', fontSize: '0.68rem' }}>{isOccupied ? 'In Infusion' : 'Ready'}</div>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 12, fontSize: '0.75rem', color: '#64748b', display: 'flex', justifyContent: 'space-between' }}>
            <span>Next Discharge: 4:30 PM (Bed 2)</span>
            <span style={{ color: '#1d4ed8', fontWeight: 600 }}>View e-MAR →</span>
          </div>
        </div>
      ),
    },
    multiclinic: {
      tag: 'ENTERPRISE MULTI-TENANCY',
      title: 'Multi-Clinic Scaling (1 to 5 Clinics)',
      desc: 'Orchestrate 1, 3, or up to 5 branch clinics under a single administrative master account. Switch between branches in under 200 milliseconds with full data isolation.',
      features: [
        'Strict server-enforced clinic quotas: Basic (1), Standard (3), Premium (5)',
        'Independent patient queues, doctor rosters, staff credentials, and billing ledgers per clinic',
        'Customized letterhead templates, margin calibration, and UHID prefixes per branch',
        'Centralized subscription management with transparent Razorpay automated billing',
      ],
      previewCard: (
        <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: '1.5rem', boxShadow: '0 8px 20px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>Active Clinic Branches (3 of 3 Used)</div>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>Standard Plan</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8rem' }}>
            <div style={{ background: '#ffffff', borderRadius: 10, border: '1.5px solid #2563eb', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Metro Health Hub (Salt Lake)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>UHID Prefix: MHH • 4 Doctors Active Today</div>
              </div>
              <span style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.68rem', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>CURRENT</span>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Green Valley Care (Park Street)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>UHID Prefix: GVC • 2 Doctors Active Today</div>
              </div>
              <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 4, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 600 }}>Switch</button>
            </div>
            <div style={{ background: '#ffffff', borderRadius: 10, border: '1px solid #e2e8f0', padding: '10px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 700, color: '#0f172a' }}>Care Diagnostics & Clinic (Howrah)</div>
                <div style={{ fontSize: '0.72rem', color: '#64748b' }}>UHID Prefix: CDC • Lab & OPD Operational</div>
              </div>
              <button style={{ background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#334155', borderRadius: 4, padding: '3px 8px', fontSize: '0.7rem', fontWeight: 600 }}>Switch</button>
            </div>
          </div>
        </div>
      ),
    },
  };

  return (
    <div className="lp-wrapper">
      {/* ── Ambient Background Lighting Orbs ── */}
      <div className="lp-ambient-canvas">
        <div className="lp-glow-orb-1" />
        <div className="lp-glow-orb-2" />
        <div className="lp-glow-orb-3" />
      </div>

      {/* ── Floating Glassmorphism Navbar (Hide on Scroll Down / Reveal on Scroll Up) ── */}
      <header
        className={`lp-navbar ${navVisible ? 'lp-navbar--visible' : 'lp-navbar--hidden'} ${isScrolled ? 'lp-navbar--scrolled' : 'lp-navbar--top'}`}
        style={{
          transform: navVisible ? 'translate3d(0, 0, 0)' : 'translate3d(0, -115%, 0)',
          opacity: navVisible ? 1 : 0,
          pointerEvents: navVisible ? 'auto' : 'none',
        }}
      >
        <div className="lp-navbar-container">
          {/* Brand Logo */}
          <Link to="/" className="lp-logo-group">
            <div className="lp-logo-box">
              <Activity size={22} strokeWidth={2.5} />
            </div>
            <div>
              <span className="lp-logo-text">
                medi<span>plix</span>
              </span>
              <span className="lp-logo-badge">SaaS</span>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="lp-nav-links d-none d-md-flex">
            <a href="#features" className="lp-nav-link">Features</a>
            <a href="#modules" className="lp-nav-link">Clinical Modules</a>
            <a href="#comparison" className="lp-nav-link">Why Mediplix</a>
            <a href="#pricing" className="lp-nav-link">Pricing</a>
            <a href="#faq" className="lp-nav-link">FAQ</a>
          </nav>

          {/* Auth State Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {token ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeSub && (activeSub.status === 'active' || activeSub.status === 'trialing') ? (
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: 'linear-gradient(135deg, #eff6ff, #dbeafe)',
                      border: '1px solid #93c5fd',
                      color: '#1d4ed8',
                      padding: '7px 14px',
                      borderRadius: '10px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      boxShadow: '0 2px 6px rgba(37,99,235,0.08)',
                      transition: 'all 0.2s ease',
                    }}
                    title="Manage active subscription"
                  >
                    <Sparkles size={14} color="#2563eb" />
                    <span>{getPlanById(activeSub.planId)?.name || 'Pro'} Plan</span>
                    <span
                      style={{
                        background: '#22c55e',
                        color: '#ffffff',
                        fontSize: '0.65rem',
                        padding: '1px 6px',
                        borderRadius: '8px',
                        fontWeight: 800,
                        textTransform: 'uppercase',
                      }}
                    >
                      Active
                    </span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => navigate('/subscription')}
                    className="lp-nav-btn-outline"
                  >
                    <CreditCard size={14} style={{ marginRight: 6, display: 'inline' }} />
                    My Plan
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/select-clinic')}
                  className="lp-nav-btn-primary"
                >
                  Clinics <ArrowRight size={14} />
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: '10px',
                    padding: '8px 14px',
                    fontSize: '0.85rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  title="Sign out of Mediplix"
                >
                  <LogOut size={14} />
                  <span>Logout</span>
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Link to="/login" className="lp-nav-btn-outline">
                  Sign In
                </Link>
                <a href="#pricing" className="lp-nav-btn-primary">
                  Get Started <ArrowRight size={14} />
                </a>
              </div>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="d-md-none"
              style={{ background: 'none', border: 'none', color: '#0f172a', cursor: 'pointer', padding: 6 }}
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lp-mobile-menu">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="lp-nav-link">Features</a>
            <a href="#modules" onClick={() => setMobileMenuOpen(false)} className="lp-nav-link">Clinical Modules</a>
            <a href="#comparison" onClick={() => setMobileMenuOpen(false)} className="lp-nav-link">Why Mediplix</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="lp-nav-link">Pricing</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="lp-nav-link">FAQ</a>
            {token ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {activeSub && (activeSub.status === 'active' || activeSub.status === 'trialing') && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: '8px 12px', fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span>⭐ {getPlanById(activeSub.planId)?.name} Plan</span>
                    <span style={{ background: '#22c55e', color: '#fff', fontSize: '0.65rem', padding: '2px 6px', borderRadius: 6 }}>ACTIVE</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/subscription'); }}
                  className="lp-nav-btn-outline"
                  style={{ textAlign: 'center' }}
                >
                  Manage Subscription
                </button>
                <button
                  type="button"
                  onClick={() => { setMobileMenuOpen(false); navigate('/select-clinic'); }}
                  className="lp-nav-btn-primary"
                  style={{ justifyContent: 'center' }}
                >
                  Launch Clinics Workspace
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  style={{
                    background: '#fef2f2',
                    color: '#dc2626',
                    border: '1px solid #fecaca',
                    borderRadius: 8,
                    padding: '8px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <LogOut size={14} /> Logout
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="lp-nav-btn-outline" style={{ textAlign: 'center' }}>
                  Sign In
                </Link>
                <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="lp-nav-btn-primary" style={{ justifyContent: 'center' }}>
                  Explore Plans
                </a>
              </div>
            )}
          </div>
        )}
      </header>

      {/* ── Hero Section ── */}
      <section className="lp-hero-section">
        <div style={{ textAlign: 'center', maxWidth: 860, margin: '0 auto' }}>
          <div className="lp-hero-pill lp-reveal lp-stagger-1">
            <span className="lp-pulse-dot" />
            <span>CLOUD CLINIC OPERATING SYSTEM • REAL-TIME EMR & WEBSOCKET SYNC</span>
          </div>

          <h1 className="lp-hero-title lp-reveal lp-stagger-2">
            One Intelligent Platform. <br />
            <span className="lp-gradient-text">Every Clinical Workflow.</span>
          </h1>

          <p className="lp-hero-subtitle lp-reveal lp-stagger-3">
            Empower independent doctors, polyclinics, and healthcare chains with sub-second live OPD queues, 60-second multi-lingual digital prescriptions, diagnostic pathology LIS, and automated multi-branch billing in one unified cloud workspace.
          </p>

          <div className="lp-hero-cta-group lp-reveal lp-stagger-4">
            <a href="#pricing" className="lp-btn-primary">
              Explore Plans & Get Started <ArrowRight size={18} />
            </a>
            <a href="#modules" className="lp-btn-secondary">
              <Sparkles size={18} color="#2563eb" /> Explore Clinical Modules
            </a>
          </div>

          {/* Trust badges strip */}
          <div className="lp-trust-strip lp-reveal lp-stagger-5">
            <div className="lp-trust-item">
              <ShieldCheck size={16} color="#16a34a" /> 256-Bit SSL Encrypted
            </div>
            <div className="lp-trust-item">
              <Building size={16} color="#2563eb" /> 1 to 5 Clinic Capacity
            </div>
            <div className="lp-trust-item">
              <CreditCard size={16} color="#0891b2" /> Verified Razorpay Gateway
            </div>
            <div className="lp-trust-item">
              <Clock size={16} color="#8b5cf6" /> Real-time Live WebSocket Sync
            </div>
          </div>
        </div>

        {/* Hero Visual Mockup with Floating Interactive Cards */}
        <div className="lp-hero-stage lp-reveal lp-stagger-5">
          <div className="lp-browser-frame">
            <div className="lp-browser-bar">
              <div className="lp-browser-dots">
                <div className="lp-dot-red" />
                <div className="lp-dot-yellow" />
                <div className="lp-dot-green" />
              </div>
              <div className="lp-browser-url">
                <Lock size={11} color="#16a34a" /> https://app.mediplix.in/dashboard
              </div>
            </div>

            <img
              src={heroImg}
              alt="Mediplix Clinical Operating System Dashboard"
              className="lp-browser-img"
            />
          </div>

          {/* Floating Glass Widgets around Hero Stage */}
          <div className="lp-floating-badge lp-badge-pos-top-left lp-float-slow d-none d-lg-flex">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#2563eb' }}>
              <Stethoscope size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Dr. Rana • Room 3</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Token #18 In Consultation</div>
            </div>
            <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span className="lp-pulse-dot" style={{ width: 5, height: 5 }} /> Live
            </span>
          </div>

          <div className="lp-floating-badge lp-badge-pos-bottom-right lp-float-reverse d-none d-lg-flex">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#16a34a' }}>
              <Building size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Multi-Clinic Network</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>3 Clinics Active • 1-Click Switch</div>
            </div>
            <span style={{ background: '#eff6ff', color: '#1d4ed8', fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999 }}>
              Standard Tier
            </span>
          </div>

          <div className="lp-floating-badge lp-badge-pos-bottom-left lp-float-slow d-none d-lg-flex">
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#db2777' }}>
              <FileText size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rx Prescription Engine</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>Printed in 45s • 8 Indian Languages</div>
            </div>
            <span style={{ color: '#059669', fontSize: '0.75rem', fontWeight: 700 }}>
              ✓ Verified
            </span>
          </div>
        </div>
      </section>

      {/* ── Interactive Clinical Modules Showcase Section ── */}
      <section id="modules" className="lp-modules-section">
        <div className="lp-section-header lp-reveal">
          <span className="lp-section-tag">Interactive Clinical Suite</span>
          <h2 className="lp-section-title">Built for Real Clinical Demands</h2>
          <p className="lp-section-desc">
            Explore the integrated engines that power doctors, frontdesk receptionists, lab technicians, and clinic managers every day.
          </p>
        </div>

        {/* Tab Selector */}
        <div className="lp-module-nav lp-reveal">
          <button
            type="button"
            onClick={() => setActiveModuleTab('doctor')}
            className={`lp-module-tab ${activeModuleTab === 'doctor' ? 'is-active' : ''}`}
          >
            <Stethoscope size={16} /> Doctor VisitPad
          </button>
          <button
            type="button"
            onClick={() => setActiveModuleTab('queue')}
            className={`lp-module-tab ${activeModuleTab === 'queue' ? 'is-active' : ''}`}
          >
            <Monitor size={16} /> Live Queue & TV
          </button>
          <button
            type="button"
            onClick={() => setActiveModuleTab('lab')}
            className={`lp-module-tab ${activeModuleTab === 'lab' ? 'is-active' : ''}`}
          >
            <Microscope size={16} /> Diagnostic LIS
          </button>
          <button
            type="button"
            onClick={() => setActiveModuleTab('daycare')}
            className={`lp-module-tab ${activeModuleTab === 'daycare' ? 'is-active' : ''}`}
          >
            <Sun size={16} /> Day Care Beds
          </button>
          <button
            type="button"
            onClick={() => setActiveModuleTab('multiclinic')}
            className={`lp-module-tab ${activeModuleTab === 'multiclinic' ? 'is-active' : ''}`}
          >
            <Building size={16} /> Multi-Clinic
          </button>
        </div>

        {/* Active Module Stage */}
        <div className="lp-module-stage lp-reveal">
          <div>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              {moduleData[activeModuleTab].tag}
            </span>
            <h3 style={{ fontSize: '1.9rem', fontWeight: 800, color: '#0f172a', margin: '8px 0 14px', lineHeight: 1.25 }}>
              {moduleData[activeModuleTab].title}
            </h3>
            <p style={{ color: '#475569', fontSize: '0.98rem', lineHeight: 1.65, margin: 0 }}>
              {moduleData[activeModuleTab].desc}
            </p>

            <div className="lp-module-feature-list">
              {moduleData[activeModuleTab].features.map((item, idx) => (
                <div key={idx} className="lp-module-feature-item">
                  <div className="lp-feature-icon-wrapper">
                    <Check size={13} strokeWidth={3} />
                  </div>
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: '2rem' }}>
              <a href="#pricing" className="lp-btn-primary" style={{ padding: '10px 22px', fontSize: '0.9rem' }}>
                Start Free Trial <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div>
            {moduleData[activeModuleTab].previewCard}
          </div>
        </div>
      </section>

      {/* ── Feature Highlights Grid ── */}
      <section id="features" style={{ padding: '5rem 1.5rem', maxWidth: 1240, margin: '0 auto' }}>
        <div className="lp-section-header lp-reveal">
          <span className="lp-section-tag">Enterprise Clinical Infrastructure</span>
          <h2 className="lp-section-title">Everything Needed to Run a Paperless Practice</h2>
          <p className="lp-section-desc">
            Engineered with high availability, end-to-end encryption, and role-based access for multi-doctor clinics.
          </p>
        </div>

        <div className="lp-card-grid">
          {/* Card 1: Multi-Clinic */}
          <div className="lp-glass-card lp-reveal lp-stagger-1">
            <div className="lp-card-icon-box" style={{ background: '#eff6ff', color: '#2563eb' }}>
              <Building size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Multi-Clinic Tenancy (1 to 5 Clinics)
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Operate 1, 3, or up to 5 branch clinics under a single account. Fast one-click clinic switching without re-authenticating, each with customized UHID prefixes and letterheads.
            </p>
          </div>

          {/* Card 2: OPD Live Queue */}
          <div className="lp-glass-card lp-reveal lp-stagger-2">
            <div className="lp-card-icon-box" style={{ background: '#ecfeff', color: '#0891b2' }}>
              <Monitor size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              OPD Live Queue & Waiting Hall TV
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Automated token generation, vitals triage, and real-time WebSocket queue updates. Dedicated public Patient Q screen for waiting area TV displays.
            </p>
          </div>

          {/* Card 3: VisitPad & Drug Catalog */}
          <div className="lp-glass-card lp-reveal lp-stagger-3">
            <div className="lp-card-icon-box" style={{ background: '#f5f3ff', color: '#7c3aed' }}>
              <Stethoscope size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              EMR VisitPad & Drug Catalog
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Search from 10,000+ verified medications with dosage calculators. Drag-and-drop medicine reordering with @dnd-kit, clinical templates, and past Rx cloning in seconds.
            </p>
          </div>

          {/* Card 4: Rx Designer & 8 Languages */}
          <div className="lp-glass-card lp-reveal lp-stagger-1">
            <div className="lp-card-icon-box" style={{ background: '#fdf2f8', color: '#db2777' }}>
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Rx Designer & 8 Indian Languages
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Millimeter margin compensation for physical clinic letterheads, digital doctor signatures, QR verification codes, and automatic dosage translation into 8 Indian regional languages.
            </p>
          </div>

          {/* Card 5: Diagnostic Laboratory */}
          <div className="lp-glass-card lp-reveal lp-stagger-2">
            <div className="lp-card-icon-box" style={{ background: '#f0fdf4', color: '#16a34a' }}>
              <Microscope size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Diagnostic Laboratory (LIS)
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Sample lifecycle management, STAT emergency priority dispatch, automatic abnormal value highlighting, and A5 clinical lab invoices with secure email delivery.
            </p>
          </div>

          {/* Card 6: Day Care & Ward */}
          <div className="lp-glass-card lp-reveal lp-stagger-3">
            <div className="lp-card-icon-box" style={{ background: '#fffbeb', color: '#d97706' }}>
              <Sun size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>
              Day Care & Ward Bed Allocation
            </h3>
            <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: 0 }}>
              Interactive bed occupancy grid, admission-to-discharge clinical pipeline, electronic medication administration records (e-MAR) with nurse verification, and procedure tracking.
            </p>
          </div>
        </div>
      </section>

      {/* ── Clinical Contrast Spotlight Section (Old vs New) ── */}
      <section id="comparison" className="lp-spotlight-section">
        <div className="lp-spotlight-container">
          <div style={{ textAlign: 'center', maxWidth: 760, margin: '0 auto' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              THE MEDIPLIX ADVANTAGE
            </span>
            <h2 style={{ fontSize: 'clamp(2rem, 3.8vw, 2.8rem)', fontWeight: 800, margin: '8px 0 14px', letterSpacing: '-0.02em' }}>
              Transforming Outdated Clinical Practice
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '1.05rem', lineHeight: 1.6 }}>
              Compare how traditional manual methods stack up against our unified cloud clinic architecture.
            </p>
          </div>

          <div className="lp-comparison-grid lp-reveal">
            {/* Old Way */}
            <div className="lp-comparison-col-old">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, color: '#f87171' }}>
                <X size={22} strokeWidth={3} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#fca5a5' }}>
                  Traditional Legacy Practice
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.92rem', color: '#cbd5e1' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>✕</span>
                  <span>Handwritten, illegible prescriptions leading to dangerous pharmacy dispensing mistakes</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>✕</span>
                  <span>Crowded waiting rooms, unorganized queues, and patients complaining about long delays</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>✕</span>
                  <span>Lost physical paper records and zero clinical history when a patient returns months later</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#f87171', fontWeight: 700 }}>✕</span>
                  <span>Isolated clinic branches with no shared visibility into doctors, revenue, or bed capacity</span>
                </li>
              </ul>
            </div>

            {/* Mediplix Way */}
            <div className="lp-comparison-col-new">
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18, color: '#38bdf8' }}>
                <CheckCircle2 size={24} color="#38bdf8" />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: '#ffffff' }}>
                  The Mediplix Cloud Operating System
                </h3>
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.92rem', color: '#e2e8f0' }}>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>60-second digital Rx</strong> with 10,000+ drug database, interaction checks, and 8 languages</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>Real-time WebSocket token queue</strong> and dedicated waiting hall TV board for stress-free OPD</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>Instant 1-click clinic switching</strong> to manage up to 5 branches under 1 master account</span>
                </li>
                <li style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ color: '#38bdf8', fontWeight: 700 }}>✓</span>
                  <span><strong>Integrated split billing & Razorpay gateway</strong> with UPI, Card, and Cash accounting</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Solutions for Every Scale ── */}
      <section id="solutions" style={{ padding: '5.5rem 1.5rem', background: '#f1f5f9' }}>
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="lp-section-header lp-reveal">
            <span className="lp-section-tag">Tailored Architecture</span>
            <h2 className="lp-section-title">Solutions for Every Healthcare Setting</h2>
            <p className="lp-section-desc">
              Whether you are an independent practitioner or orchestrating multiple polyclinics, Mediplix adapts to your scale.
            </p>
          </div>

          <div className="lp-solutions-grid lp-reveal">
            {/* Solution 1 */}
            <div className="lp-solution-card">
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', marginBottom: 8 }}>
                Solo Consulting Doctors
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.55, marginBottom: 14, flexGrow: 1 }}>
                For doctors running private consulting chambers. Fast token queues, customizable digital prescriptions, and patient billing with zero setup friction.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 700 }}>Recommended: Basic (1 Clinic)</div>
            </div>

            {/* Solution 2 */}
            <div className="lp-solution-card">
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', marginBottom: 8 }}>
                Multi-Doctor Polyclinics
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.55, marginBottom: 14, flexGrow: 1 }}>
                For multi-speciality clinics with rotating visiting doctors. Multi-portal logins, front desk billing, and live waiting hall TV queue displays.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 700 }}>Recommended: Standard (3 Clinics)</div>
            </div>

            {/* Solution 3 */}
            <div className="lp-solution-card">
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', marginBottom: 8 }}>
                Healthcare Chains & Hospitals
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.55, marginBottom: 14, flexGrow: 1 }}>
                For healthcare networks managing up to 5 branch clinics. Unified executive reporting, doctor referral commissions, and home healthcare field dispatches.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 700 }}>Recommended: Premium (5 Clinics)</div>
            </div>

            {/* Solution 4 */}
            <div className="lp-solution-card">
              <div style={{ fontWeight: 800, fontSize: '1.2rem', color: '#0f172a', marginBottom: 8 }}>
                Clinic Front Desk & Staff
              </div>
              <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.55, marginBottom: 14, flexGrow: 1 }}>
                Intuitive registration, instant patient search by phone or UHID, multi-tender split payments (Cash, UPI, Card), and real-time appointment rescheduling.
              </p>
              <div style={{ fontSize: '0.82rem', color: '#1d4ed8', fontWeight: 700 }}>Included in All Plans</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4-Step Onboarding ── */}
      <section id="how-it-works" style={{ padding: '5.5rem 1.5rem', maxWidth: 1240, margin: '0 auto' }}>
        <div className="lp-section-header lp-reveal">
          <span className="lp-section-tag">Seamless Onboarding</span>
          <h2 className="lp-section-title">Live & Operational in 4 Simple Steps</h2>
          <p className="lp-section-desc">
            Get your clinic operational and write your first digital prescription in under 5 minutes.
          </p>
        </div>

        <div className="lp-steps-grid lp-reveal">
          <div className="lp-step-card">
            <div className="lp-step-number">01</div>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 6 }}>Select Your Plan</h4>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
              Choose Basic (1 clinic), Standard (3 clinics), or Premium (5 clinics) with monthly or discounted annual billing.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-number">02</div>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 6 }}>Single Sign-On</h4>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
              Sign up or log in using Mediplix unified authentication. Your selected plan configuration is automatically bound.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-number">03</div>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 6 }}>Encrypted Checkout</h4>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
              Complete instant encrypted payment via UPI, Cards, or NetBanking. Signatures are verified cryptographically via Razorpay.
            </p>
          </div>

          <div className="lp-step-card">
            <div className="lp-step-number">04</div>
            <h4 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', marginBottom: 6 }}>Launch Your Clinics</h4>
            <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0, lineHeight: 1.55 }}>
              Instantly create your clinics, customize letterheads, and start clinical consultations with zero setup wait time.
            </p>
          </div>
        </div>
      </section>

      {/* ── Pricing Packages Section ── */}
      <section id="pricing" className="lp-pricing-section">
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div className="lp-section-header lp-reveal">
            <span className="lp-section-tag">Transparent SaaS Licensing</span>
            <h2 className="lp-section-title">Simple, Predictable Clinic Pricing</h2>
            <p className="lp-section-desc">
              All plans include complete clinical EMR workflows and live queues. Select the clinic capacity that matches your practice.
            </p>

            {/* Monthly / Yearly Toggle */}
            <div className="lp-toggle-wrapper">
              <button
                type="button"
                onClick={() => setBillingInterval('monthly')}
                className={`lp-toggle-btn ${billingInterval === 'monthly' ? 'is-active' : ''}`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval('yearly')}
                className={`lp-toggle-btn ${billingInterval === 'yearly' ? 'is-active' : ''}`}
              >
                Annual Billing <span style={{ background: '#dcfce7', color: '#15803d', fontSize: '0.72rem', padding: '2px 8px', borderRadius: 999, marginLeft: 4 }}>Save ~17%</span>
              </button>
            </div>
          </div>

          {/* Pricing Cards Grid */}
          <div className="lp-pricing-grid lp-reveal">
            {SUBSCRIPTION_PLANS.map((plan) => {
              const price = billingInterval === 'yearly' ? plan.price.yearly : plan.price.monthly;
              const monthlyEquivalent = billingInterval === 'yearly' ? Math.round(plan.price.yearly / 12) : plan.price.monthly;

              return (
                <div
                  key={plan.id}
                  className={`lp-pricing-card ${plan.isPopular ? 'lp-pricing-card--popular' : ''}`}
                >
                  {plan.isPopular && (
                    <div className="lp-popular-badge">
                      Most Popular & Recommended
                    </div>
                  )}

                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h3 style={{ fontSize: '1.45rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {plan.name}
                      </h3>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: '#f1f5f9', color: '#475569' }}>
                        {plan.badge}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.85rem', color: '#64748b', margin: '6px 0 0', lineHeight: 1.4 }}>
                      {plan.tagline}
                    </p>
                  </div>

                  {/* Clinic Hard Limit Badge */}
                  <div
                    style={{
                      background: plan.isPopular ? '#eff6ff' : '#f8fafc',
                      border: plan.isPopular ? '1px solid #bfdbfe' : '1px solid #e2e8f0',
                      borderRadius: 10,
                      padding: '8px 12px',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      color: plan.isPopular ? '#1d4ed8' : '#334155',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      marginBottom: 18,
                    }}
                  >
                    <Building size={16} />
                    <span>Clinic Capacity: Up to {plan.maxClinics} {plan.maxClinics === 1 ? 'Clinic' : 'Clinics'}</span>
                  </div>

                  {/* Price Display */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span style={{ color: '#64748b', fontSize: '0.9rem', fontWeight: 600 }}>
                        {billingInterval === 'yearly' ? '/year' : '/month'}
                      </span>
                    </div>
                    {billingInterval === 'yearly' && (
                      <div style={{ fontSize: '0.8rem', color: '#16a34a', fontWeight: 600, marginTop: 4 }}>
                        ₹{monthlyEquivalent.toLocaleString('en-IN')}/month equivalent (billed annually)
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  {(() => {
                    const planTierOrder = { basic: 1, standard: 2, premium: 3 };
                    const currentTier = planTierOrder[activeSub?.planId] || 0;
                    const planTier = planTierOrder[plan.id] || 0;
                    const isCurrent = activeSub?.planId === plan.id;
                    const isLowerTier = currentTier > planTier;
                    const isHigherTier = planTier > currentTier;
                    const hasActiveSub = activeSub && (activeSub.status === 'active' || activeSub.status === 'trialing');

                    if (isCurrent) {
                      return (
                        <button
                          type="button"
                          onClick={() => navigate('/subscription')}
                          style={{
                            width: '100%',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: 12,
                            padding: '12px 18px',
                            fontWeight: 700,
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginBottom: 24,
                          }}
                        >
                          Current Active Plan <ArrowRight size={16} />
                        </button>
                      );
                    }

                    if (isLowerTier && hasActiveSub) {
                      return (
                        <button
                          type="button"
                          disabled
                          style={{
                            width: '100%',
                            background: '#f8fafc',
                            color: '#94a3b8',
                            border: '1px solid #e2e8f0',
                            borderRadius: 12,
                            padding: '12px 18px',
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            cursor: 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: 8,
                            marginBottom: 24,
                          }}
                        >
                          Downgrade Unavailable
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={() => handleSelectPlan(plan.id)}
                        className="lp-btn-primary"
                        style={{
                          width: '100%',
                          justifyContent: 'center',
                          padding: '12px 18px',
                          marginBottom: 24,
                          background: plan.isPopular
                            ? 'linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)'
                            : '#0f172a',
                        }}
                      >
                        {isHigherTier && hasActiveSub ? `Upgrade to ${plan.name}` : `Select ${plan.name} Plan`} <ArrowRight size={16} />
                      </button>
                    );
                  })()}

                  {/* Feature Checklist */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 18, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                      What's Included:
                    </div>
                    {plan.features.map((feature, idx) => (
                      <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: feature.included ? '#334155' : '#94a3b8' }}>
                        <div style={{ marginTop: 2, flexShrink: 0 }}>
                          {feature.included ? (
                            <Check size={16} color="#16a34a" strokeWidth={2.5} />
                          ) : (
                            <X size={16} color="#cbd5e1" strokeWidth={2} />
                          )}
                        </div>
                        <span style={{ lineHeight: 1.4, textDecoration: feature.included ? 'none' : 'line-through' }}>
                          {feature.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ textAlign: 'center', marginTop: '2.5rem', color: '#64748b', fontSize: '0.85rem' }}>
            Prices are in INR. Payment transactions are processed securely via Razorpay. Need custom deployment or enterprise integration? <a href="mailto:support@mediplix.in" style={{ color: '#2563eb', fontWeight: 600 }}>Contact Sales</a>.
          </div>
        </div>
      </section>

      {/* ── FAQ Section ── */}
      <section id="faq" style={{ padding: '5.5rem 1.5rem', maxWidth: 840, margin: '0 auto' }}>
        <div className="lp-section-header lp-reveal">
          <span className="lp-section-tag">Got Questions?</span>
          <h2 className="lp-section-title">Frequently Asked Questions</h2>
          <p className="lp-section-desc">
            Everything you need to know about plans, clinic quotas, and subscription activation.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {faqs.map((faq, index) => {
            const isOpen = activeFaq === index;
            return (
              <div
                key={index}
                className={`lp-faq-item ${isOpen ? 'is-open' : ''}`}
              >
                <button
                  type="button"
                  onClick={() => toggleFaq(index)}
                  className="lp-faq-trigger"
                >
                  <span>{faq.q}</span>
                  {isOpen ? <ChevronUp size={18} color="#2563eb" /> : <ChevronDown size={18} color="#64748b" />}
                </button>
                {isOpen && (
                  <div className="lp-faq-content">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Footer & Legal ── */}
      <footer className="lp-footer">
        <div style={{ maxWidth: 1240, margin: '0 auto' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '2.5rem', marginBottom: '3rem' }}>
            {/* Col 1: Brand */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#ffffff', marginBottom: 14 }}>
                <Activity size={24} color="#3b82f6" />
                <span style={{ fontSize: '1.3rem', fontWeight: 800 }}>mediplix</span>
              </div>
              <p style={{ fontSize: '0.85rem', lineHeight: 1.6, color: '#94a3b8', margin: '0 0 16px' }}>
                Next-generation medical clinic operating SaaS. Multi-clinic EMR, real-time WebSocket queues, multi-lingual prescriptions, and integrated healthcare diagnostics.
              </p>
              <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                Official Website: <a href="https://mediplix.in/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>mediplix.in</a>
              </div>
            </div>

            {/* Col 2: Navigation */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: 14 }}>Clinical Platform</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <li><a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>OPD Live Queue</a></li>
                <li><a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>EMR VisitPad</a></li>
                <li><a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Prescription Designer</a></li>
                <li><a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Diagnostic Lab (LIS)</a></li>
                <li><a href="#features" style={{ color: '#94a3b8', textDecoration: 'none' }}>Day Care & Ward Beds</a></li>
              </ul>
            </div>

            {/* Col 3: Subscriptions */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: 14 }}>Subscription Tiers</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <li><a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Basic (1 Clinic Limit)</a></li>
                <li><a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Standard (3 Clinics Limit)</a></li>
                <li><a href="#pricing" style={{ color: '#94a3b8', textDecoration: 'none' }}>Premium (5 Clinics Limit)</a></li>
                <li><Link to="/login" style={{ color: '#38bdf8', textDecoration: 'none' }}>Sign In to Existing Clinic</Link></li>
              </ul>
            </div>

            {/* Col 4: Contact & Legal */}
            <div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', marginBottom: 14 }}>Legal & Compliance</div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.85rem' }}>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('privacy')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Privacy Policy
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('terms')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Terms of Service
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setActiveLegalModal('refund')}
                    style={{ background: 'none', border: 'none', color: '#94a3b8', padding: 0, cursor: 'pointer', fontSize: '0.85rem' }}
                  >
                    Refund & Cancellation Policy
                  </button>
                </li>
                <li style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, color: '#cbd5e1' }}>
                  <Mail size={14} color="#38bdf8" /> support@mediplix.in
                </li>
              </ul>
            </div>
          </div>

          <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10, fontSize: '0.8rem', color: '#64748b' }}>
            <div>
              © {new Date().getFullYear()} Mediplix Technologies Pvt Ltd. All rights reserved.
            </div>
            <div>
              Secured with 256-bit SSL encryption. Powered by Razorpay.
            </div>
          </div>
        </div>
      </footer>

      {/* ── Checkout Modal (Official Razorpay Gateway Integration) ── */}
      {showCheckoutModal && (
        <CheckoutModal
          isOpen={showCheckoutModal}
          onClose={() => setShowCheckoutModal(false)}
          planId={selectedPlanForCheckout}
          billingInterval={billingInterval}
          onPaymentSuccess={() => {
            setShowCheckoutModal(false);
            navigate('/select-clinic');
          }}
        />
      )}

      {/* ── Legal Policy Modals ── */}
      {activeLegalModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem',
          }}
          onClick={() => setActiveLegalModal(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: 20,
              maxWidth: 680,
              width: '100%',
              maxHeight: '80vh',
              overflowY: 'auto',
              padding: '2.25rem',
              position: 'relative',
              boxShadow: '0 25px 60px rgba(0,0,0,0.3)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveLegalModal(null)}
              style={{
                position: 'absolute',
                top: 18,
                right: 18,
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '50%',
                width: 34,
                height: 34,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <X size={18} />
            </button>

            {activeLegalModal === 'privacy' && (
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>Privacy Policy</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last updated: October 2026</p>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p>Mediplix is committed to safeguarding the privacy and security of health data and personal identification information of all medical practitioners and patients.</p>
                  <p><strong>1. Data Isolation:</strong> Each clinic operates in an isolated tenant environment. Patient health information (PHI) is encrypted in transit using TLS 1.3 and at rest with AES-256 standards.</p>
                  <p><strong>2. Payment Information:</strong> Mediplix does not store raw credit card numbers or UPI MPINs. All payments are securely routed and processed through Razorpay PCI-DSS Level 1 compliant gateway.</p>
                  <p><strong>3. Medical Record Confidentiality:</strong> Only authorized clinicians and staff members credentialed by the clinic administrator can access medical charts and diagnostic reports.</p>
                </div>
              </div>
            )}

            {activeLegalModal === 'terms' && (
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>Terms of Service</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last updated: October 2026</p>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p>By subscribing to Mediplix, you agree to these service conditions.</p>
                  <p><strong>1. Clinic Quotas:</strong> Your account is restricted to the clinic quota defined in your tier: Basic allows 1 clinic, Standard allows up to 3 clinics, and Premium allows up to 5 clinics. Attempting to bypass limits via automated requests is strictly prohibited.</p>
                  <p><strong>2. Medical Liability:</strong> Mediplix is an administrative practice management software and does not provide clinical medical diagnosis or treatment advice. Medical decisions remain the sole responsibility of licensed practitioners.</p>
                  <p><strong>3. Service Availability:</strong> We maintain a target 99.9% uptime for cloud clinic APIs and WebSocket queue streams.</p>
                </div>
              </div>
            )}

            {activeLegalModal === 'refund' && (
              <div>
                <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 12 }}>Refund & Cancellation Policy</h3>
                <p style={{ fontSize: '0.85rem', color: '#64748b' }}>Last updated: October 2026</p>
                <div style={{ fontSize: '0.9rem', color: '#334155', lineHeight: 1.65, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <p>We strive to deliver the highest standard in medical software infrastructure.</p>
                  <p><strong>1. Subscription Cancellations:</strong> You can cancel your subscription auto-renewal at any time via your account dashboard. Following cancellation, your clinic access remains completely active until the end of the prepaid period.</p>
                  <p><strong>2. Refund Eligibility:</strong> If you experience technical failure preventing clinical operations during the first 7 days of initial subscription, contact support@mediplix.in for a full review and refund processing via Razorpay.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
