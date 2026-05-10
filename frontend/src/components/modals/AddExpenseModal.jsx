import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addTransaction } from '../../features/finance/financeSlice';
import { X, PlusCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const AddExpenseModal = ({ isOpen, onClose }) => {
  const categories = useSelector(state => state.finance.categories);
  const { currency = 'INR', locale = 'en-IN' } = useSelector(state => state.finance);
  const dispatch = useDispatch();
  
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('other');

  const formatCurrency = (val) => new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency: currency, 
    maximumFractionDigits: 0 
  }).format(val || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (amount > 0) {
      const now = new Date();
      dispatch(addTransaction({
        title: description || `Spending on ${category}`,
        amount: Number(amount),
        description: description || `Manual expense entry`,
        category,
        type: 'expense',
        date: now.toISOString() // Explicitly set the date
      }));
      setAmount('');
      setDescription('');
      setCategory('other');
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-morphism w-full max-w-md p-6 rounded-3xl space-y-4 shadow-2xl border border-white/10 relative"
      >
        <button 
          onClick={onClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-white">
            <PlusCircle size={20} />
          </div>
          <h2 className="text-xl font-bold">Add Expense</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            {/* Amount */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Amount</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">
                  {currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : '₹'}
                </span>
                <input
                  type="number"
                  required
                  placeholder="0.00"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xl font-bold focus:outline-none focus:ring-1 focus:ring-white/50"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
            </div>

            {/* Category Grid */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Category Segment</label>
              <div className="grid grid-cols-3 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.id)}
                    className={`flex flex-col items-center p-3 rounded-2xl border transition-all ${
                      category === cat.id 
                      ? 'bg-white text-black border-white shadow-lg' 
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <span className="text-xl mb-1">{cat.icon}</span>
                    <span className={`text-[10px] font-bold uppercase tracking-tight ${category === cat.id ? 'text-black' : 'text-slate-400'}`}>{cat.label.split(' ')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400">Description (Optional)</label>
              <input
                type="text"
                placeholder="What was this for?"
                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 px-6 focus:outline-none focus:ring-1 focus:ring-white/50 text-sm"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-white text-black py-3 rounded-2xl font-bold transition-all active:scale-[0.98] hover:bg-slate-200"
          >
            Save Expense
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default AddExpenseModal;
