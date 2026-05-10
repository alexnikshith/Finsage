import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { setMonthlySalary } from '../../features/finance/financeSlice';
import { Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const InitialSalaryModal = ({ isOpen }) => {
  const [salary, setSalary] = useState('');
  const dispatch = useDispatch();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (salary > 0) {
      dispatch(setMonthlySalary(Number(salary)));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-morphism w-full max-w-md p-8 rounded-3xl space-y-6 shadow-2xl border border-white/10"
      >
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center text-primary">
            <Wallet size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">Welcome to FinSage</h2>
            <p className="text-slate-400 mt-1">To get started, please enter your monthly income.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-400">Monthly Salary / Income</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
              <input
                type="number"
                required
                autoFocus
                placeholder="0.00"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-10 pr-4 text-xl font-bold focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black py-4 rounded-2xl font-bold text-lg transition-all active:scale-[0.98] hover:bg-slate-200"
          >
            Start Tracking
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default InitialSalaryModal;
