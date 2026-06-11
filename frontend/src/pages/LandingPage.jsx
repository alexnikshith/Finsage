import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginSuccess } from '../features/auth/authSlice';
import { hardResetFinance } from '../features/finance/financeSlice';
import { 
  Wallet, 
  ArrowRight, 
  Sparkles, 
  Mic, 
  Camera, 
  Calendar, 
  MessageSquare, 
  ShieldCheck, 
  LineChart 
} from 'lucide-react';
import { motion } from 'framer-motion';

const FeatureCard = ({ icon: Icon, title, description }) => (
  <div className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-3 hover:border-white/20 transition-all text-left">
    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center text-white/80">
      <Icon size={24} />
    </div>
    <h3 className="text-lg font-bold text-white">{title}</h3>
    <p className="text-slate-400 text-sm font-medium leading-relaxed">{description}</p>
  </div>
);

const FaqItem = ({ q, a }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-2 text-left">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left focus:outline-none py-1 group"
      >
        <h4 className="font-bold text-base text-white group-hover:text-slate-200 transition-colors">{q}</h4>
        <span className="text-slate-500 group-hover:text-white font-bold text-xl leading-none transition-colors ml-4">
          {isOpen ? '−' : '+'}
        </span>
      </button>
      {isOpen && (
        <motion.p 
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-slate-400 text-sm font-medium leading-relaxed pt-2 border-t border-white/5"
        >
          {faqHtmlWrapper(a)}
        </motion.p>
      )}
    </div>
  );
};

// Simple helper to allow styled links inside FAQ text if needed
const faqHtmlWrapper = (text) => {
  return text;
};

const LandingPage = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleStartFree = () => {
    // Start guest session
    dispatch(hardResetFinance());
    dispatch(loginSuccess({ email: 'guest@finsage.local', isGuest: true }));
    localStorage.setItem('finsage_token', 'guest_token');
    navigate('/');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-black text-white overflow-y-auto selection:bg-white selection:text-black font-['Outfit']">
      {/* Header - Widen container to max-w-[1400px] to bring logo to the left */}
      <header className="max-w-[1400px] mx-auto px-8 py-8 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-white/5">
            <Wallet size={20} className="text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">FinSage</span>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 text-center space-y-8">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-bold uppercase tracking-wider text-slate-400"
        >
          <Sparkles size={12} className="text-emerald-400" />
          <span>Intelligent Wealth Companion</span>
        </motion.div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-5xl md:text-7xl font-bold tracking-tighter leading-tight"
        >
          Take Control of Your <span className="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 to-emerald-400">Financial Future</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="max-w-2xl mx-auto text-slate-400 text-base md:text-lg font-medium leading-relaxed"
        >
          Optimize cash flow, manage debt, visualize monthly trends dynamically, and consult your dedicated AI Financial Coach—all inside a premium, unified workspace.
        </motion.p>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          <button
            onClick={handleStartFree}
            className="w-full sm:w-auto bg-white text-black font-black text-base uppercase tracking-wider px-8 py-5 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-[0.98] shadow-2xl shadow-white/5"
          >
            Start Trial
            <ArrowRight size={18} />
          </button>
          <button
            onClick={handleLogin}
            className="w-full sm:w-auto text-white bg-white/5 hover:bg-white/10 font-bold text-base uppercase tracking-wider px-8 py-5 rounded-2xl border border-white/10 transition-all active:scale-[0.98]"
          >
            Sign In with OTP
          </button>
        </motion.div>
      </section>

      {/* Quick Stats Grid */}
      <section className="max-w-[1400px] mx-auto px-8 pb-16 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
        {[
          { value: '10K+', label: 'Active Trackers' },
          { value: 'Under 2s', label: 'AI Transaction Audits' },
          { value: '99.9%', label: 'Cloud Sync Uptime' },
          { value: '100%', label: 'Secure OTP Access' }
        ].map((stat, i) => (
          <div key={i} className="p-5 bg-white/5 rounded-3xl border border-white/5 space-y-1.5 flex flex-col items-center justify-center">
            <h3 className="text-3xl font-black text-white tracking-tight">{stat.value}</h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</p>
          </div>
        ))}
      </section>

      {/* Feature Section */}
      <section className="max-w-[1400px] mx-auto px-8 py-20 border-t border-white/5 text-center space-y-12">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">Core Financial Capabilities</h2>
          <p className="max-w-xl mx-auto text-slate-400 text-sm font-medium">
            Everything you need to analyze your spending habits, coordinate repayments, and receive expert budgeting consultations.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={MessageSquare} 
            title="AI Financial Coach" 
            description="Access your own personal financial advisor with persistent chat history. Analyze salary limits, savings metrics, and spending alerts." 
          />
          <FeatureCard 
            icon={Camera} 
            title="Smart Receipt OCR" 
            description="Simply snap a photo of any receipt. FinSage's vision extractor automatically logs the merchant, item amount, category, and date." 
          />
          <FeatureCard 
            icon={Mic} 
            title="Voice-activated Logging" 
            description="Add transactions on the go using speech inputs. Say 'spent twenty dollars on groceries' and watch it categorize instantly." 
          />
          <FeatureCard 
            icon={LineChart} 
            title="Dynamic Analytics & Budgets" 
            description="Track spending segments on visual charts, set category limits, and customize your workspace with custom category colors and emojis." 
          />
          <FeatureCard 
            icon={Calendar} 
            title="Interactive Financial Calendar" 
            description="Pinpoint spending trends day by day, view income flows, and download monthly statements to evaluate your wealth progression." 
          />
          <FeatureCard 
            icon={ShieldCheck} 
            title="Secure Sync Sequence" 
            description="Log in securely using passwordless OTP. All data is backed up to a dedicated cloud MongoDB schema with automated sync sequences." 
          />
        </div>
      </section>

      {/* Motivation Section */}
      <section className="max-w-4xl mx-auto px-6 py-24 border-t border-white/5 text-center space-y-8">
        <h2 className="text-3xl font-bold tracking-tight">Why Choose FinSage?</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left pt-6">
          <div className="space-y-2">
            <h4 className="font-bold text-lg text-white">Traditional Budgeting is Broken</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed font-sans">
              Spreadsheets are static, and traditional apps require manual labor. FinSage streamlines the workflow through intelligent automation (OCR & Speech) and helps you see cash trends before they affect your account.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-bold text-lg text-white">Private & Zero-Lockin Onboarding</h4>
            <p className="text-slate-400 text-sm font-medium leading-relaxed font-sans">
              Our passwordless OTP sign-in ensures secure workspace access across all your devices, while guest mode allows you to explore the interface without providing credentials upfront.
            </p>
          </div>
        </div>
      </section>

      {/* Interactive FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-20 border-t border-white/5 space-y-12">
        <div className="text-center space-y-4">
          <h2 className="text-3xl font-bold tracking-tight text-white">Frequently Asked Questions</h2>
          <p className="text-slate-400 text-sm font-medium">Clear answers to help you navigate your FinSage workspace.</p>
        </div>
        <div className="space-y-4">
          <FaqItem 
            q="How does Guest Mode work?" 
            a="Guest mode runs entirely in your browser's active memory without writing any data to local storage or the database. You can test out our AI coach, log expenses, and design custom categories. When you decide to sign up, simply click 'Log In & Save Data' to merge your guest transactions automatically into your permanent cloud account."
          />
          <FaqItem 
            q="Is my financial data secure?" 
            a="Yes. FinSage does not use traditional passwords which can be compromised. We enforce passwordless OTP authentication. All data in transit is encrypted, and cloud backups are saved directly to a secure MongoDB cluster dedicated to your account."
          />
          <FaqItem 
            q="Do the AI voice and scan features cost anything?" 
            a="We offer free speech-to-text and camera receipt scanning trials. You can speak transaction logs or snap a receipt photograph directly without entering any credit card information. Full capabilities are unlocked immediately on trial entry."
          />
        </div>
      </section>

      {/* Footer */}
      <footer className="max-w-[1400px] mx-auto px-8 py-12 border-t border-white/5 text-center text-xs text-slate-600 font-bold uppercase tracking-widest space-y-2">
        <p>© {new Date().getFullYear()} FinSage Workspace. All rights reserved.</p>
        <p className="text-[10px] opacity-60">Precision Wealth Intelligence Suite v1.2.0</p>
      </footer>
    </div>
  );
};

export default LandingPage;
