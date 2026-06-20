import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { repayBorrow, addBorrow } from '../features/finance/financeSlice';
import { HandCoins, ArrowDownRight, ArrowUpRight, History, Plus, AlertCircle, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BorrowCard = ({ borrow, formatCurrency, onRepay }) => {
  const progress = ((borrow.amount - (borrow.remainingAmount || 0)) / borrow.amount) * 100;
  
  return (
    <div className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-4 hover:border-white/20 transition-all group">
      <div className="flex justify-between items-start">
        <div className="flex gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${borrow.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-white/5 text-slate-400'}`}>
            <HandCoins size={20} />
          </div>
          <div>
            <h4 className="font-bold text-lg">{borrow.source}</h4>
            <p className="text-xs text-slate-500 font-medium">Borrowed on {new Date(borrow.date).toLocaleDateString()}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Remaining</p>
          <p className={`text-xl font-black ${borrow.status === 'paid' ? 'text-emerald-500' : 'text-white'}`}>
            {formatCurrency(borrow.remainingAmount)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-slate-500">
          <span>Repayment Progress</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 ${borrow.status === 'paid' ? 'bg-emerald-500' : 'bg-white'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-2">
        <div className="text-xs text-slate-500">
          Total: <span className="text-slate-300 font-bold">{formatCurrency(borrow.amount)}</span>
        </div>
        {borrow.status === 'pending' && (
          <button 
            onClick={() => onRepay(borrow)}
            className="px-4 py-2 bg-white text-black text-xs font-bold rounded-xl hover:bg-slate-200 transition-all active:scale-95"
          >
            Pay Back
          </button>
        )}
      </div>
    </div>
  );
};

const Borrows = () => {
  const finance = useSelector(state => state.finance) || {};
  const borrows = finance.borrows || [];
  const currency = finance.currency || 'INR';
  const locale = finance.locale || 'en-IN';
  const dispatch = useDispatch();
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [repayModal, setRepayModal] = useState({ isOpen: false, borrow: null, amount: '', showWarning: false });
  const [newBorrow, setNewBorrow] = useState({ source: '', amount: '' });

  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: currency, 
        maximumFractionDigits: 0 
      }).format(val || 0);
    } catch (e) {
      return `₹${val || 0}`;
    }
  };

  const handleAddBorrow = () => {
    if (newBorrow.amount > 0 && newBorrow.source) {
      dispatch(addBorrow({
        amount: Number(newBorrow.amount),
        source: newBorrow.source
      }));
      setNewBorrow({ source: '', amount: '' });
      setIsAddModalOpen(false);
    }
  };

  const handleRepay = () => {
    const amount = Number(repayModal.amount);
    if (amount > (repayModal.borrow?.remainingAmount || 0) && !repayModal.showWarning) {
      setRepayModal(prev => ({ ...prev, showWarning: true }));
      return;
    }
    
    if (amount > 0 && repayModal.borrow) {
      dispatch(repayBorrow({
        borrowId: repayModal.borrow.id,
        repayAmount: amount
      }));
      setRepayModal({ isOpen: false, borrow: null, amount: '', showWarning: false });
    }
  };

  const pendingBorrows = borrows.filter(b => b.status === 'pending');
  const paidBorrows = borrows.filter(b => b.status === 'paid');

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto relative">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Borrow & Debt</h2>
          <p className="text-slate-400">Track money you owe and manage repayments.</p>
        </div>
        <button 
          onClick={() => setIsAddModalOpen(true)}
          className="bg-white text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 hover:bg-slate-200"
        >
          <Plus size={20} />
          Borrow Money
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Active Debts */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Active Debts</h3>
          {pendingBorrows.length === 0 ? (
            <div className="glass-morphism p-12 rounded-[2.5rem] text-center border-dashed border-white/10">
              <CheckCircle2 size={40} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium">No active debts. You're all clear!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingBorrows.map(b => (
                <BorrowCard key={b.id} borrow={b} formatCurrency={formatCurrency} onRepay={(borrow) => setRepayModal({ isOpen: true, borrow, amount: '', showWarning: false })} />
              ))}
            </div>
          )}
        </div>

        {/* History / Paid Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Repayment History</h3>
          <div className="space-y-4 opacity-60">
            {paidBorrows.map(b => (
              <BorrowCard key={b.id} borrow={b} formatCurrency={formatCurrency} />
            ))}
            {paidBorrows.length === 0 && (
               <div className="p-8 text-center border border-white/5 rounded-3xl">
                  <p className="text-slate-600 text-sm">History of cleared debts will appear here.</p>
               </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL OVERLAY */}
      {isAddModalOpen && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl pointer-events-auto"
          onClick={() => setIsAddModalOpen(false)}
        >
          <div 
            className="glass-morphism w-full max-w-md p-8 rounded-[3rem] border border-white/20 space-y-6 relative pointer-events-auto shadow-[0_0_50px_rgba(255,255,255,0.1)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setIsAddModalOpen(false)}
              className="absolute right-6 top-6 text-slate-500 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>

            <h3 className="text-2xl font-bold">Borrow Money</h3>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Lender / Source</label>
                <input 
                  type="text" 
                  placeholder="Who are you borrowing from?" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 focus:outline-none focus:ring-1 focus:ring-white/50 text-white font-medium" 
                  value={newBorrow.source} 
                  onChange={e => setNewBorrow({ ...newBorrow, source: e.target.value })} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Amount</label>
                <input 
                  type="number" 
                  placeholder="0.00" 
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black focus:outline-none focus:ring-1 focus:ring-white/50 text-white" 
                  value={newBorrow.amount} 
                  onChange={e => setNewBorrow({ ...newBorrow, amount: e.target.value })} 
                />
              </div>
              
              <div className="pt-2 space-y-3">
                <button 
                  onClick={handleAddBorrow}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all active:scale-[0.98] cursor-pointer"
                >
                  Record Loan
                </button>
                <button 
                  onClick={() => setIsAddModalOpen(false)} 
                  className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest py-3 hover:text-white transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Repay Modal */}
      <AnimatePresence>
        {repayModal.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl pointer-events-auto">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-morphism w-full max-w-md p-8 rounded-[3rem] border border-white/10 space-y-6 relative pointer-events-auto">
              <button 
                onClick={() => setRepayModal({ isOpen: false, borrow: null, amount: '', showWarning: false })}
                className="absolute right-6 top-6 text-slate-500 hover:text-white"
              >
                <X size={20} />
              </button>
              <div>
                <h3 className="text-2xl font-bold">Repay {repayModal.borrow?.source}</h3>
                <p className="text-slate-400 text-sm">Remaining Debt: {formatCurrency(repayModal.borrow?.remainingAmount)}</p>
              </div>
              {repayModal.showWarning ? (
                <div className="space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 p-4 rounded-2xl flex items-start gap-3 text-amber-500">
                    <AlertCircle size={20} className="shrink-0 mt-0.5" />
                    <p className="text-sm font-medium">The payment amount ({formatCurrency(repayModal.amount)}) exceeds the remaining debt ({formatCurrency(repayModal.borrow?.remainingAmount)}). Are you sure you want to continue?</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleRepay} className="flex-1 bg-amber-500 text-black py-4 rounded-2xl font-black text-sm hover:bg-amber-400 transition-all cursor-pointer">Continue to Pay</button>
                    <button onClick={() => setRepayModal(prev => ({ ...prev, showWarning: false }))} className="flex-1 bg-white/5 text-white py-4 rounded-2xl font-black text-sm hover:bg-white/10 transition-all cursor-pointer">Edit Amount</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1">Payment Amount</label>
                    <input 
                      type="number" 
                      required 
                      placeholder="How much are you paying back?" 
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black focus:outline-none focus:ring-1 focus:ring-white/50 text-white" 
                      value={repayModal.amount} 
                      onChange={e => setRepayModal({ ...repayModal, amount: e.target.value })} 
                    />
                  </div>
                  <button onClick={handleRepay} className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all cursor-pointer">Confirm Payment</button>
                  <button onClick={() => setRepayModal({ isOpen: false, borrow: null, amount: '', showWarning: false })} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest py-2 cursor-pointer">Cancel</button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Borrows;
