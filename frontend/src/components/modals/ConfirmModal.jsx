import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Confirm", type = "danger" }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="glass-morphism w-full max-w-sm p-8 rounded-[3rem] border border-white/10 space-y-6 relative text-center shadow-2xl"
        >
          <div className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${type === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-white'}`}>
            <AlertTriangle size={32} />
          </div>
          
          <div className="space-y-2">
            <h3 className="text-2xl font-bold">{title}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              {message}
            </p>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            <button 
              onClick={() => {
                onConfirm();
                onClose();
              }}
              className={`w-full py-4 rounded-2xl font-black text-lg transition-all active:scale-95 ${
                type === 'danger' ? 'bg-rose-600 text-white hover:bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]' : 'bg-white text-black hover:bg-slate-200'
              }`}
            >
              {confirmText}
            </button>
            <button 
              onClick={onClose}
              className="w-full py-4 text-slate-500 font-bold uppercase text-xs tracking-widest hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ConfirmModal;
