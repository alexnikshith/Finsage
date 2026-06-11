import React from 'react';
import { motion } from 'framer-motion';
import { Crown, Lock, Zap, BarChart2, BrainCircuit, ArrowRight } from 'lucide-react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const PremiumGuard = ({ children, featureName = 'this feature', featureIcon: FeatureIcon = Crown }) => {
  const navigate = useNavigate();
  const { user } = useSelector(state => state.auth) || {};

  const isPremium = () => {
    if (!user || !user.role) return false;
    if (user.role === 'admin') return true;
    if (user.role !== 'premium') return false;
    // Check expiry
    if (user.subscriptionExpiry) {
      return new Date(user.subscriptionExpiry) > new Date();
    }
    return false;
  };

  if (isPremium()) {
    return children;
  }

  // Show the premium locked overlay
  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-6 bg-black">
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="max-w-lg w-full"
      >
        {/* Glow orb */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-amber-500/5 blur-3xl" />
        </div>

        {/* Lock icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="flex justify-center mb-8"
        >
          <div className="relative">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center">
              <Lock size={40} className="text-amber-400" />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Crown size={16} className="text-white" />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-black text-white mb-3">
            Premium Feature
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            <span className="text-amber-400 font-semibold capitalize">{featureName}</span> is available exclusively for FinSage Premium members. Unlock powerful insights for just ₹99/month.
          </p>
        </div>

        {/* Feature comparison */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Freemium</p>
            {['Dashboard', 'Transactions', 'Budget', 'Borrows', 'Notifications', 'Calendar', 'AI Insights'].map(f => (
              <div key={f} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-300">{f}</span>
              </div>
            ))}
          </div>

          <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/25 rounded-2xl p-4">
            <p className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-1">
              <Crown size={10} /> Premium
            </p>
            {['Dashboard', 'Transactions', 'Budget', 'Borrows', 'Notifications', 'Calendar', 'AI Insights'].map(f => (
              <div key={f} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs text-slate-300">{f}</span>
              </div>
            ))}
            {['Analytics', 'AI Coach'].map(f => (
              <div key={f} className="flex items-center gap-2 py-1">
                <div className="w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                  <Crown size={8} className="text-amber-400" />
                </div>
                <span className="text-xs text-amber-300 font-semibold">{f}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pricing */}
        <div className="bg-gradient-to-r from-amber-500/15 to-orange-500/10 border border-amber-500/30 rounded-2xl p-5 mb-5 text-center">
          <div className="flex items-baseline justify-center gap-1 mb-1">
            <span className="text-4xl font-black text-white">₹99</span>
            <span className="text-slate-400 text-sm">/month</span>
          </div>
          <p className="text-slate-400 text-xs">Full access · Cancel anytime · Instant activation</p>
        </div>

        {/* CTA */}
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => navigate('/settings', { state: { openSubscription: true } })}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 transition-all"
        >
          <Zap size={18} />
          Upgrade to Premium
          <ArrowRight size={18} />
        </motion.button>

        <p className="text-center text-xs text-slate-600 mt-4">
          Powered by Razorpay · Secure & encrypted payment
        </p>
      </motion.div>
    </div>
  );
};

export default PremiumGuard;
