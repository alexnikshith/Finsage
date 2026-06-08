import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { deleteTransaction } from '../features/finance/financeSlice';
import { Trash2, ShoppingBag, Utensils, FileText, Car, Film, Heart, Package, ShoppingCart, GraduationCap } from 'lucide-react';

const categoryIcons = {
  food: Utensils,
  groceries: ShoppingCart,
  transport: Car,
  shopping: ShoppingBag,
  bills: FileText,
  entertainment: Film,
  health: Heart,
  education: GraduationCap,
  other: Package,
};

const Transactions = () => {
  const finance = useSelector(state => state.finance) || {};
  const transactions = finance.transactions || [];
  const categories = finance.categories || [];
  const currency = finance.currency || 'INR';
  const locale = finance.locale || 'en-IN';
  const dispatch = useDispatch();

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

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Transactions</h2>
          <p className="text-slate-400">A detailed list of all your spending activity.</p>
        </div>
      </div>

      <div className="glass-morphism rounded-3xl overflow-hidden border border-white/5">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-white/5 text-slate-400 uppercase text-xs tracking-widest">
              <th className="px-6 py-4 font-bold">Category</th>
              <th className="px-6 py-4 font-bold">Description</th>
              <th className="px-6 py-4 font-bold">Date</th>
              <th className="px-6 py-4 font-bold text-right">Amount</th>
              <th className="px-6 py-4 font-bold text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">
                  No transactions found. Add some from the Dashboard!
                </td>
              </tr>
            ) : (
              [...transactions].reverse().map((t) => {
                const cat = categories.find(c => c.id === t.category);
                const Icon = categoryIcons[t.category] || Package;
                
                return (
                  <tr key={t.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-white border border-white/5">
                          <Icon size={18} />
                        </div>
                        <span className="font-bold text-sm text-white uppercase tracking-tight">{cat?.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-300 text-sm">
                      {t.description || 'No description'}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs font-medium">
                      {new Date(t.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-white">
                      {formatCurrency(t.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => dispatch(deleteTransaction(t.id))}
                        className="p-2 text-slate-500 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Transactions;
