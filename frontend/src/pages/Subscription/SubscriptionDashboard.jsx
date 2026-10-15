import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity, LogOut, Globe,
  CreditCard, ShieldCheck, CheckCircle2, AlertTriangle, Building,
  ArrowUpRight, RefreshCw, Calendar, FileText, ArrowLeft, Check, Sparkles, Trash2
} from 'lucide-react';
import subscriptionService from '../../services/subscriptionService';
import { SUBSCRIPTION_PLANS, getPlanById } from '../../config/subscriptionPlans';
import CheckoutModal from './CheckoutModal';
// Clean SaaS Navigation Header for Account & Subscription
const SaaSHeader = ({ onNavigate }) => {
  const currentClinicName = localStorage.getItem('clinicName');
  const currentClinicId = localStorage.getItem('clinicId');

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('clinicId');
    localStorage.removeItem('clinicName');
    window.location.href = '/login';
  };

  return (
    <nav
      style={{
        height: '62px',
        backgroundColor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 2rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      {/* Brand Logo -> Landing Page */}
      <div
        onClick={() => onNavigate('/')}
        style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
        title="Go to Mediplix Landing Page"
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 9,
            background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#ffffff',
            boxShadow: '0 2px 6px rgba(37,99,235,0.3)',
          }}
        >
          <Activity size={18} strokeWidth={2.5} />
        </div>
        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
          medi<span style={{ color: '#2563eb' }}>plix</span>
        </span>
        <span style={{ fontSize: '0.65rem', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '1px 6px', borderRadius: 4, textTransform: 'uppercase' }}>
          SaaS
        </span>
      </div>

      {/* Navigation Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => onNavigate('/select-clinic')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#eff6ff',
            color: '#1d4ed8',
            border: '1px solid #bfdbfe',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Select or switch clinic"
        >
          <Building size={15} /> Select Clinic
        </button>

        {currentClinicId && (
          <button
            type="button"
            onClick={() => onNavigate('/dashboard')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: '#f0fdf4',
              color: '#15803d',
              border: '1px solid #bbf7d0',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: '0.85rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
            title="Go to clinic workstation"
          >
            Enter {currentClinicName || 'Clinic'} &rarr;
          </button>
        )}

        <button
          type="button"
          onClick={() => onNavigate('/')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#f8fafc',
            color: '#475569',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Go to Mediplix Landing Page"
        >
          <Globe size={15} /> Landing Page
        </button>

        <button
          type="button"
          onClick={handleLogout}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '0.85rem',
            fontWeight: 600,
            cursor: 'pointer',
          }}
          title="Sign out of Mediplix"
        >
          <LogOut size={15} /> Logout
        </button>
      </div>
    </nav>
  );
};

const SubscriptionDashboard = () => {
  const [data, setData] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState('');
  const [selectedPlanForUpgrade, setSelectedPlanForUpgrade] = useState(null);
  const [billingInterval, setBillingInterval] = useState('monthly');
  const [showCheckout, setShowCheckout] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [subData, txData] = await Promise.all([
        subscriptionService.getMySubscription(),
        subscriptionService.getTransactions(),
      ]);
      setData(subData);
      setTransactions(txData.transactions || []);
      if (subData.subscription?.billingInterval) {
        setBillingInterval(subData.subscription.billingInterval);
      }
    } catch (err) {
      console.error('Failed to load subscription details', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelAutoRenew = async () => {
    if (!window.confirm('Are you sure you want to stop automatic renewal? You will retain full access until the end of your current billing period.')) {
      return;
    }
    setCancelling(true);
    try {
      const res = await subscriptionService.cancelSubscription('User requested via dashboard');
      setCancelMessage(res.message);
      await loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to cancel subscription');
    } finally {
      setCancelling(false);
    }
  };

  const handleOpenUpgrade = (planId) => {
    setSelectedPlanForUpgrade(planId);
    setShowCheckout(true);
  };

  const handleClearRecords = async () => {
    if (!window.confirm('Are you sure you want to delete all payment and invoice history records? This cannot be undone.')) {
      return;
    }
    try {
      await subscriptionService.clearTransactions();
      setTransactions([]);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to clear payment records');
    }
  };

  if (loading) {
    return (
      <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
        <SaaSHeader onNavigate={navigate} />
        <div className="flex-grow-1 d-flex align-items-center justify-content-center" style={{ minHeight: '70vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  const sub = data?.subscription;
  const planConfig = sub ? getPlanById(sub.planId) : null;
  const clinicsCount = data?.clinicsCount || 0;
  const maxClinics = data?.maxClinics || (planConfig ? planConfig.maxClinics : 1);
  const quotaPercentage = Math.min(100, Math.round((clinicsCount / (maxClinics || 1)) * 100));

  const isExpired = sub && new Date(sub.currentPeriodEnd) <= new Date();

  return (
    <div className="d-flex flex-column" style={{ minHeight: '100vh', backgroundColor: '#f8fafc' }}>
      <SaaSHeader onNavigate={navigate} />
      <div className="flex-grow-1 overflow-auto" style={{ padding: '2rem 1rem' }}>
        <div style={{ maxWidth: 1140, margin: '0 auto' }}>
          {/* Top Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <button
            onClick={() => navigate('/select-clinic')}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#64748b',
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              cursor: 'pointer',
              marginBottom: 6,
              padding: 0,
            }}
          >
            <ArrowLeft size={16} /> Back to Clinics
          </button>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
            Subscription & Licensing
          </h2>
          <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.9rem' }}>
            Manage your Mediplix SaaS plan, clinic capacities, billing, and payment records.
          </p>
        </div>

        <button
          onClick={loadData}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 8,
            padding: '8px 14px',
            fontSize: '0.85rem',
            color: '#334155',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
          }}
        >
          <RefreshCw size={14} /> Refresh Status
        </button>
      </div>

      {cancelMessage && (
        <div style={{ background: '#fef3c7', border: '1px solid #fde68a', color: '#92400e', padding: '12px 16px', borderRadius: 10, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {cancelMessage}
        </div>
      )}

      {/* Grid: Current Plan & Quota */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {/* Active Plan Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: 0, right: 0, width: 90, height: 90, background: 'linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(37,99,235,0) 100%)', borderBottomLeftRadius: 90 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              Current Active Plan
            </span>
            <span
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: 999,
                background: sub?.status === 'active' ? '#dcfce7' : sub?.status === 'trialing' ? '#e0f2fe' : '#fee2e2',
                color: sub?.status === 'active' ? '#15803d' : sub?.status === 'trialing' ? '#0369a1' : '#b91c1c',
              }}
            >
              {sub?.status === 'active' ? 'Active' : sub?.status === 'trialing' ? 'Grace Period / Trial' : 'Expired'}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
            <h3 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {planConfig ? planConfig.name : 'No Active Plan'}
            </h3>
            {sub && (
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>
                ({sub.billingInterval === 'yearly' ? 'Yearly Billing' : 'Monthly Billing'})
              </span>
            )}
          </div>

          <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0 0 16px' }}>
            {planConfig?.tagline || 'Select a plan below to activate clinic capacity.'}
          </p>

          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Calendar size={15} color="#64748b" /> Next Billing / Expiry:</span>
              <strong style={{ color: '#0f172a' }}>{sub ? new Date(sub.currentPeriodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : 'N/A'}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: '#475569' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CreditCard size={15} color="#64748b" /> Billed Amount:</span>
              <strong style={{ color: '#0f172a' }}>{sub ? `₹${sub.amount.toLocaleString('en-IN')}` : '₹0'}</strong>
            </div>
          </div>

          {sub?.autoRenew && (
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={handleCancelAutoRenew}
                disabled={cancelling}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#dc2626',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline',
                }}
              >
                {cancelling ? 'Cancelling...' : 'Cancel Auto-Renewal'}
              </button>
            </div>
          )}
        </div>

        {/* Clinic Quota Card */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: 16,
            border: '1px solid #e2e8f0',
            padding: '1.75rem',
            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
              Clinic Capacity Usage
            </span>
            <Building size={18} color="#2563eb" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 6 }}>
            <span style={{ fontSize: '2.2rem', fontWeight: 800, color: '#0f172a' }}>{clinicsCount}</span>
            <span style={{ fontSize: '1.1rem', color: '#64748b', fontWeight: 600 }}>/ {maxClinics} Clinics Used</span>
          </div>

          {/* Progress bar */}
          <div style={{ width: '100%', height: 10, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden', margin: '12px 0 16px' }}>
            <div
              style={{
                width: `${quotaPercentage}%`,
                height: '100%',
                background: quotaPercentage >= 100 ? '#ef4444' : 'linear-gradient(90deg, #3b82f6, #1d4ed8)',
                borderRadius: 999,
                transition: 'width 0.3s',
              }}
            />
          </div>

          <p style={{ fontSize: '0.85rem', color: clinicsCount >= maxClinics ? '#b91c1c' : '#475569', margin: '0 0 16px' }}>
            {clinicsCount >= maxClinics
              ? `You have reached the maximum ${maxClinics} clinic limit for this tier. Upgrade to add more clinic branches.`
              : `You have ${maxClinics - clinicsCount} available clinic ${maxClinics - clinicsCount === 1 ? 'slot' : 'slots'} remaining.`}
          </p>

          <button
            onClick={() => handleOpenUpgrade(sub?.planId === 'basic' ? 'standard' : 'premium')}
            style={{
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: 10,
              padding: '10px 16px',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: '#1d4ed8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              width: '100%',
            }}
          >
            <Sparkles size={16} /> Upgrade Clinic Capacity
          </button>
        </div>
      </div>

      {/* Available Plans Upgrade Section */}
      <div style={{ marginBottom: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              Available Subscription Packages
            </h3>
            <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '0.85rem' }}>
              Enforced clinic limits: Basic (1 Clinic), Standard (3 Clinics), Premium (5 Clinics).
            </p>
          </div>

          {/* Monthly / Yearly Toggle */}
          <div
            style={{
              background: '#f1f5f9',
              padding: 4,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            <button
              onClick={() => setBillingInterval('monthly')}
              style={{
                border: 'none',
                background: billingInterval === 'monthly' ? '#ffffff' : 'transparent',
                color: billingInterval === 'monthly' ? '#0f172a' : '#64748b',
                boxShadow: billingInterval === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingInterval('yearly')}
              style={{
                border: 'none',
                background: billingInterval === 'yearly' ? '#ffffff' : 'transparent',
                color: billingInterval === 'yearly' ? '#0f172a' : '#64748b',
                boxShadow: billingInterval === 'yearly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                padding: '6px 14px',
                borderRadius: 8,
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Yearly (Save ~17%)
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem' }}>
          {SUBSCRIPTION_PLANS.map((plan) => {
            const price = billingInterval === 'yearly' ? plan.price.yearly : plan.price.monthly;

            const planTierOrder = { basic: 1, standard: 2, premium: 3 };
            const currentTier = planTierOrder[sub?.planId] || 0;
            const planTier = planTierOrder[plan.id] || 0;
            const isCurrent = sub?.planId === plan.id;
            const isHigherTier = planTier > currentTier;
            const isLowerTier = currentTier > planTier;
            const hasActiveSub = sub && (sub.status === 'active' || sub.status === 'trialing') && !isExpired;

            let creditAmount = 0;
            if (isHigherTier && sub && sub.amount > 0 && sub.status === 'active') {
              creditAmount = sub.amount;
            }
            const adjustedPrice = Math.max(0, price - creditAmount);

            return (
              <div
                key={plan.id}
                style={{
                  background: '#ffffff',
                  borderRadius: 16,
                  border: isCurrent ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  padding: '1.75rem',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  boxShadow: plan.isPopular ? '0 10px 25px -5px rgba(37,99,235,0.15)' : 'none',
                }}
              >
                {plan.isPopular && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      left: '50%',
                      transform: 'translateX(-50%)',
                      background: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '3px 12px',
                      borderRadius: 999,
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                    }}
                  >
                    Recommended
                  </div>
                )}

                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#0f172a' }}>{plan.name}</div>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2 }}>{plan.tagline}</div>
                </div>

                <div style={{ marginBottom: 16 }}>
                  {isHigherTier && creditAmount > 0 ? (
                    <div>
                      <div style={{ fontSize: '0.85rem', color: '#94a3b8', textDecoration: 'line-through' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#16a34a' }}>
                          ₹{adjustedPrice.toLocaleString('en-IN')}
                        </span>
                        <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                          {billingInterval === 'yearly' ? '/year' : '/month'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#16a34a', fontWeight: 700, marginTop: 2 }}>
                        ✨ Adjusted with {sub.planId.toUpperCase()} credit (-₹{creditAmount.toLocaleString('en-IN')})
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span style={{ fontSize: '1.8rem', fontWeight: 800, color: '#0f172a' }}>
                        ₹{price.toLocaleString('en-IN')}
                      </span>
                      <span style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        {billingInterval === 'yearly' ? '/year' : '/month'}
                      </span>
                    </div>
                  )}
                  <div style={{ fontSize: '0.78rem', color: '#1d4ed8', fontWeight: 600, marginTop: 4 }}>
                    Max {plan.maxClinics} {plan.maxClinics === 1 ? 'Clinic' : 'Clinics'} Allowed
                  </div>
                </div>

                <button
                  onClick={() => handleOpenUpgrade(plan.id)}
                  disabled={isCurrent || (isLowerTier && hasActiveSub)}
                  style={{
                    background: isCurrent
                      ? '#f1f5f9'
                      : isLowerTier && hasActiveSub
                      ? '#f8fafc'
                      : plan.isPopular
                      ? 'linear-gradient(135deg, #1d4ed8, #2563eb)'
                      : '#0f172a',
                    color: isCurrent || (isLowerTier && hasActiveSub) ? '#94a3b8' : '#ffffff',
                    border: isLowerTier && hasActiveSub ? '1px solid #e2e8f0' : 'none',
                    borderRadius: 10,
                    padding: '10px 14px',
                    fontWeight: 600,
                    fontSize: '0.85rem',
                    cursor: isCurrent || (isLowerTier && hasActiveSub) ? 'not-allowed' : 'pointer',
                    marginBottom: isLowerTier && hasActiveSub ? 8 : 20,
                  }}
                >
                  {isCurrent
                    ? 'Current Active Plan'
                    : isLowerTier && hasActiveSub
                    ? 'Downgrade Unavailable'
                    : isHigherTier && creditAmount > 0
                    ? `Upgrade (Pay ₹${adjustedPrice.toLocaleString('en-IN')})`
                    : `Select ${plan.name}`}
                </button>

                {isLowerTier && hasActiveSub && (
                  <div style={{ fontSize: '0.72rem', color: '#64748b', textAlign: 'center', marginBottom: 14 }}>
                    Your active {sub.planId.toUpperCase()} plan already includes higher capacity.
                  </div>
                )}

                <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, flexGrow: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {plan.features.slice(0, 6).map((feat, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8rem', color: feat.included ? '#334155' : '#94a3b8' }}>
                      <Check size={14} color={feat.included ? '#16a34a' : '#cbd5e1'} />
                      <span style={{ textDecoration: feat.included ? 'none' : 'line-through' }}>{feat.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Transaction History Table */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: 16,
          border: '1px solid #e2e8f0',
          padding: '1.75rem',
          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} color="#2563eb" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: 0, color: '#0f172a' }}>
              Payment & Invoice Records
            </h3>
          </div>
          {transactions.length > 0 && (
            <button
              onClick={handleClearRecords}
              style={{
                background: '#fff1f2',
                border: '1px solid #fecdd3',
                color: '#e11d48',
                padding: '6px 12px',
                borderRadius: 8,
                fontSize: '0.78rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={13} /> Clear Records
            </button>
          )}
        </div>

        {transactions.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
            No payment transactions recorded yet.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #e2e8f0', color: '#64748b' }}>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Date</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Order ID / Receipt</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Plan</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Amount</th>
                  <th style={{ padding: '10px 12px', fontWeight: 600 }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((tx) => (
                  <tr key={tx._id} style={{ borderBottom: '1px solid #f8fafc' }}>
                    <td style={{ padding: '12px', color: '#334155' }}>
                      {new Date(tx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td style={{ padding: '12px', fontFamily: 'monospace', color: '#0f172a' }}>
                      {tx.orderId}
                    </td>
                    <td style={{ padding: '12px', textTransform: 'capitalize', color: '#334155', fontWeight: 600 }}>
                      {tx.planId} ({tx.billingInterval})
                    </td>
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹{tx.amount.toLocaleString('en-IN')}
                      </div>
                      {tx.metadata?.isUpgrade && tx.metadata?.creditAmount > 0 && (
                        <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600, marginTop: 2 }}>
                          Adjusted Upgrade (₹{tx.metadata.originalPrice?.toLocaleString('en-IN')} − ₹{tx.metadata.creditAmount?.toLocaleString('en-IN')} credit)
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 999,
                          background: tx.status === 'success' ? '#dcfce7' : tx.status === 'created' ? '#fef3c7' : '#fee2e2',
                          color: tx.status === 'success' ? '#15803d' : tx.status === 'created' ? '#b45309' : '#b91c1c',
                        }}
                      >
                        {tx.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

          {/* Checkout Modal */}
          {showCheckout && (
            <CheckoutModal
              isOpen={showCheckout}
              onClose={() => setShowCheckout(false)}
              planId={selectedPlanForUpgrade}
              billingInterval={billingInterval}
              onPaymentSuccess={() => {
                setShowCheckout(false);
                loadData();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SubscriptionDashboard;
