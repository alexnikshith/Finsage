import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { loginSuccess } from '../../features/auth/authSlice';
import { hydrateFinance, hardResetFinance } from '../../features/finance/financeSlice';
import api from '../../services/api';
import { Mail, ShieldCheck, ArrowRight, Wallet, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '']);
  const [step, setStep] = useState(1); 
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const dispatch = useDispatch();

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/send-otp', { email });
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send OTP. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    
    if (value && index < 3) {
      document.getElementById(`otp-${index + 1}`).focus();
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const enteredOtp = otp.join('');
    if (enteredOtp.length === 4) {
      setLoading(true);
      setError('');
      try {
        await api.post('/auth/verify-otp', { email, otp: enteredOtp });
        
        localStorage.setItem('finsage_last_user', email);
        dispatch(loginSuccess(email));
        
      } catch (err) {
        setError(err.response?.data?.message || 'Invalid OTP');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-morphism w-full max-w-md p-8 rounded-[2.5rem] border border-white/5 shadow-2xl space-y-8"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center shadow-2xl shadow-white/10">
            <Wallet size={40} className="text-black" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tighter">FinSage</h1>
            <p className="text-slate-400 font-medium">Precision Financial Intelligence</p>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold"
            >
              <AlertCircle size={18} />
              {error}
            </motion.div>
          )}

          {step === 1 ? (
            <motion.form 
              key="email"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleEmailSubmit} 
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-widest text-slate-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-1 focus:ring-white/50 transition-all font-medium"
                    value={email}
                    onChange={(e) => setEmail(e.target.value.trim().toLowerCase())}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Sending Pulse..." : "Request Access"}
                {!loading && <ArrowRight size={20} />}
              </button>
            </motion.form>
          ) : (
            <motion.form 
              key="otp"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleLogin} 
              className="space-y-6"
            >
              <div className="space-y-4 text-center">
                <div>
                  <h3 className="text-xl font-bold">Verify Identity</h3>
                  <p className="text-slate-400 text-sm mt-1">Sent to <span className="text-white">{email}</span></p>
                </div>
                
                <div className="flex justify-center gap-3">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      id={`otp-${i}`}
                      type="number"
                      maxLength="1"
                      className="w-14 h-16 bg-white/5 border border-white/10 rounded-2xl text-center text-2xl font-bold focus:outline-none focus:ring-1 focus:ring-white/50"
                      value={digit}
                      onChange={(e) => handleOtpChange(e.target.value, i)}
                      onKeyDown={(e) => {
                        if (e.key === 'Backspace' && !digit && i > 0) {
                          document.getElementById(`otp-${i-1}`).focus();
                        }
                      }}
                    />
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || otp.some(d => !d)}
                className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Enter Workspace"}
                {!loading && <ShieldCheck size={20} />}
              </button>

              <button 
                type="button"
                onClick={() => setStep(1)}
                className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest hover:text-white transition-colors"
              >
                Back to Email
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        <p className="text-center text-[10px] text-slate-600 uppercase font-bold tracking-[0.2em]">
          SECURE ENCRYPTED ACCESS ONLY
        </p>
      </motion.div>
    </div>
  );
};

export default LoginPage;
