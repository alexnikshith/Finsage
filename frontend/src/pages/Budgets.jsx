import React from 'react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';

const Budgets = () => {
  const { monthlySalary, categorySpending, currency, locale } = useSelector(selectFinanceStats);
  const categories = useSelector(state => state.finance.categories);

  const formatCurrency = (val) => new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency: currency, 
    maximumFractionDigits: 0 
  }).format(val);

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      <div>
        <h2 className="text-3xl font-bold">Budgets</h2>
        <p className="text-slate-400">Monitor your category limits and stay within range.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {categories.map((cat) => {
          const spent = categorySpending[cat.id] || 0;
          // For demo, let's assume a budget of 20% of salary for each category
          const budget = monthlySalary * 0.2;
          const percentage = (spent / budget) * 100;
          const isOver = spent > budget;

          return (
            <div key={cat.id} className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{cat.icon}</span>
                  <h3 className="font-bold text-lg">{cat.label}</h3>
                </div>
                <div className="text-right">
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-widest">Spent</p>
                  <p className={`font-bold ${isOver ? 'text-red-500' : 'text-white'}`}>{formatCurrency(spent)}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold uppercase tracking-tighter">
                  <span className="text-slate-500">Progress</span>
                  <span className={isOver ? 'text-red-500' : 'text-slate-400'}>{Math.round(percentage)}% of {formatCurrency(budget)}</span>
                </div>
                <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <div 
                    className={`h-full transition-all duration-500 ${isOver ? 'bg-white' : 'bg-white/40'}`}
                    style={{ width: `${Math.min(percentage, 100)}%` }}
                  />
                </div>
              </div>

              {isOver && (
                <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-xl">
                  <p className="text-xs text-red-500 font-bold">⚠️ Budget Exceeded! Try to minimize spending in this segment.</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Budgets;
