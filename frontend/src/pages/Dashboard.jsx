import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, ArrowUpRight, ArrowDownRight, BrainCircuit, Plus } from 'lucide-react';
import { selectFinanceStats } from '../features/finance/financeSlice';
import InitialSalaryModal from '../components/modals/InitialSalaryModal';
import AddExpenseModal from '../components/modals/AddExpenseModal';

const StatCard = ({ title, value, change, isPositive, colorClass }) => (
  <div className="glass-morphism p-6 rounded-2xl space-y-2 border-l-4" style={{ borderLeftColor: colorClass }}>
    <p className="text-slate-400 text-sm font-medium">{title}</p>
    <div className="flex items-end justify-between">
      <h3 className="text-2xl font-bold">{value}</h3>
      {change !== undefined && (
        <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${
          isPositive ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
        }`}>
          {isPositive ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(change)}%
        </div>
      )}
    </div>
  </div>
);

const Dashboard = () => {
  const { monthlySalary, totalExpenses, remainingBalance, totalDebt, categorySpending, currency, locale } = useSelector(selectFinanceStats);
  const isSalarySet = useSelector(state => state.finance.isSalarySet);
  const transactions = useSelector(state => state.finance.transactions);
  const categories = useSelector(state => state.finance.categories);
  
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Format currency
  const formatCurrency = (val) => new Intl.NumberFormat(locale, { 
    style: 'currency', 
    currency: currency, 
    maximumFractionDigits: 0 
  }).format(val);

  // Prepare chart data (simple mock for now based on transactions)
  const chartData = transactions.slice(-7).map(t => ({
    name: new Date(t.date).toLocaleDateString('en-US', { weekday: 'short' }),
    amount: t.amount
  }));

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Onboarding Modal */}
      <InitialSalaryModal isOpen={!isSalarySet} />
      
      {/* Add Expense Modal */}
      <AddExpenseModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Financial Overview</h2>
          <p className="text-slate-400">Manage your salary and track your segment-wise spending.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-wider">Cloud Live</span>
          </div>
          <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-widest ${transactions.length > 0 ? 'bg-white/5 border-white/10 text-white' : 'bg-white/5 border-white/5 text-slate-500'}`}>
            {transactions.length} Transactions Active
          </div>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="bg-white text-black px-6 py-3 rounded-2xl font-bold transition-all flex items-center gap-2 hover:bg-slate-200 active:scale-95"
          >
            <Plus size={20} />
            Add Expense
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Monthly Salary" 
          value={formatCurrency(monthlySalary)} 
          colorClass="#ffffff" 
        />
        <StatCard 
          title="Total Expenses" 
          value={formatCurrency(totalExpenses)} 
          colorClass={totalExpenses > (monthlySalary + (totalDebt > 0 ? totalDebt : 0)) ? '#f43f5e' : '#3f3f46'} 
          isPositive={totalExpenses <= monthlySalary}
          change={monthlySalary > 0 ? Math.round((totalExpenses / monthlySalary) * 100) : 0}
        />
        <StatCard 
          title="Remaining Balance" 
          value={formatCurrency(remainingBalance)} 
          colorClass={remainingBalance < 0 ? '#f43f5e' : '#71717a'} 
          isPositive={remainingBalance >= 0} 
        />
        <StatCard 
          title="Total Debt" 
          value={formatCurrency(totalDebt)} 
          colorClass={totalDebt > 0 ? '#fbbf24' : '#10b981'} 
          isPositive={totalDebt === 0} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-morphism p-6 rounded-2xl">
          <h3 className="text-lg font-bold mb-6">Spending segments</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {categories.map(cat => {
              const spent = categorySpending[cat.id] || 0;
              const percentage = monthlySalary > 0 ? (spent / monthlySalary) * 100 : 0;
              
              return (
                <div key={cat.id} className="p-4 bg-white/5 rounded-xl border border-white/5 flex flex-col items-center text-center">
                  <span className="text-2xl mb-2">{cat.icon}</span>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">{cat.label}</p>
                  <p className="text-lg font-bold">{formatCurrency(spent)}</p>
                  <div className="w-full bg-white/10 h-1 rounded-full mt-2 overflow-hidden">
                    <div 
                      className="h-full bg-white" 
                      style={{ width: `${Math.min(percentage, 100)}%`, backgroundColor: '#ffffff' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="glass-morphism p-6 rounded-2xl space-y-6">
          <div className="flex items-center gap-2 text-white">
            <BrainCircuit size={20} />
            <h3 className="text-lg font-bold text-white">AI Analysis</h3>
          </div>
          <div className="space-y-4">
            {transactions.length === 0 ? (
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl text-center">
                <p className="text-sm text-slate-400">
                  Add your first expense to generate AI insights.
                </p>
              </div>
            ) : (
              <div className="p-4 bg-primary/5 border border-primary/10 rounded-xl">
                <p className="text-sm text-slate-300">
                  {remainingBalance < 0 
                    ? `⚠️ ALERT: You have exceeded your budget by ${formatCurrency(Math.abs(remainingBalance))}. Immediate spending freeze recommended.` 
                    : remainingBalance < (monthlySalary * 0.2) 
                    ? "⚠️ Caution: Low liquidity. You have less than 20% of your salary remaining." 
                    : "✅ Healthy: Your spending is well optimized for this month's budget."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
