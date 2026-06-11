import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, LogIn } from 'lucide-react';
import { motion } from 'framer-motion';

const GuestWarningBanner = () => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-amber-500/10 border-b border-amber-500/20 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-4 z-40 relative shadow-lg"
    >
      <div className="flex items-center gap-3 text-left">
        <div className="w-8 h-8 rounded-lg bg-amber-500/15 flex items-center justify-center text-amber-500 flex-shrink-0 animate-pulse">
          <AlertTriangle size={16} />
        </div>
        <div className="space-y-0.5">
          <h4 className="font-bold text-xs uppercase tracking-wider text-amber-500">Guest Mode Active</h4>
          <p className="text-xs text-slate-400 font-medium">
            Your transactions are only stored temporarily. If you close this tab, your data will be permanently lost.
          </p>
        </div>
      </div>
      <button
        onClick={() => navigate('/login')}
        className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest px-4 py-2.5 rounded-xl transition-all hover:scale-[1.03] active:scale-95 flex-shrink-0 shadow-lg shadow-amber-500/10"
      >
        <LogIn size={13} />
        <span>Log In & Save Data</span>
      </button>
    </motion.div>
  );
};

export default GuestWarningBanner;
