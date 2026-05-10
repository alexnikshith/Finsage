import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';
import { BrainCircuit, TrendingDown, AlertCircle, CheckCircle2, BarChart3, Wallet, ArrowUpRight, ArrowDownRight, PiggyBank } from 'lucide-react';
import { motion } from 'framer-motion';

const AIInsights = () => {
  const { monthlySalary, totalExpenses, remainingBalance, categorySpending, monthlyReports, currency, locale } = useSelector(selectFinanceStats);
  const transactions = useSelector(state => state.finance.transactions) || [];
  const [activeTab, setActiveTab] = useState('insights');

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
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BrainCircuit className="text-white" size={32} />
            Financial Intelligence
          </h2>
          <p className="text-slate-400">Deep analysis of your spending habits and monthly performance.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-white/5 pb-1">
        <button 
          onClick={() => setActiveTab('insights')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${activeTab === 'insights' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
        >
          AI Analysis
          {activeTab === 'insights' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${activeTab === 'reports' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
        >
          Monthly Reports
          {activeTab === 'reports' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
      </div>

      {activeTab === 'insights' ? (
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Current Month Intelligence</h3>
          {transactions.length === 0 ? (
            <div className="glass-morphism p-12 rounded-[2.5rem] text-center border-dashed border-white/10">
              <BrainCircuit size={40} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium">Add transactions to generate current month insights.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6">
              <div className="glass-morphism p-8 rounded-[3rem] border border-white/5 space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <TrendingDown className="mb-2 text-slate-400" size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Savings Rate</p>
                    <p className="text-2xl font-black">{monthlySalary > 0 ? Math.round((remainingBalance / monthlySalary) * 100) : 0}%</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <AlertCircle className="mb-2 text-slate-400" size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Daily Burn</p>
                    <p className="text-2xl font-black">{formatCurrency(totalExpenses / 30)}</p>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <CheckCircle2 className="mb-2 text-emerald-500" size={20} />
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Stability</p>
                    <p className="text-2xl font-black text-white">{remainingBalance > 0 ? 'STABLE' : 'CRITICAL'}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-bold text-lg border-b border-white/5 pb-2">Optimization Tips</h4>
                  <div className="space-y-4">
                    <div className="flex gap-4 p-5 bg-white/5 rounded-3xl border border-white/5 items-start group hover:border-white/20 transition-all">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-black shrink-0 text-xs">01</div>
                       <p className="text-sm text-slate-300 leading-relaxed">
                        Your fixed costs are currently {Math.round((categorySpending['rent'] || 0) / (monthlySalary || 1) * 100)}% of your income. 
                        Targeting below 30% is ideal for long-term wealth building.
                       </p>
                    </div>
                    <div className="flex gap-4 p-5 bg-white/5 rounded-3xl border border-white/5 items-start group hover:border-white/20 transition-all">
                       <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-black font-black shrink-0 text-xs">02</div>
                       <p className="text-sm text-slate-300 leading-relaxed">
                        You have {formatCurrency(categorySpending['other'] || 0)} in uncategorized spending. 
                        Categorizing these would allow for more accurate AI detection of waste.
                       </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Monthly Archives</h3>
          {(!monthlyReports || monthlyReports.length === 0) ? (
            <div className="p-20 glass-morphism rounded-[3rem] border border-dashed border-white/10 text-center">
              <BarChart3 size={48} className="mx-auto text-slate-700 mb-4" />
              <p className="text-slate-500 font-medium italic">Monthly reports will be automatically generated at the end of every month.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[...monthlyReports].reverse().map(report => (
                <div key={report.id} className="glass-morphism p-8 rounded-[3rem] border border-white/5 space-y-6 hover:border-white/20 transition-all group">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="text-2xl font-black group-hover:translate-x-1 transition-transform">{report.month} {report.year}</h4>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">Closed on {new Date(report.date).toLocaleDateString()}</p>
                    </div>
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-tighter ${report.savings >= 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                      {report.savings >= 0 ? 'Surplus' : 'Deficit'}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 py-6 border-y border-white/5">
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Earned</p>
                      <p className="text-sm font-black">{formatCurrency((report.salary || 0) + (report.earned || 0))}</p>
                    </div>
                    <div className="space-y-1 text-center border-x border-white/5">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Spent</p>
                      <p className="text-sm font-black text-rose-500">{formatCurrency(report.spent)}</p>
                    </div>
                    <div className="space-y-1 text-center">
                      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Saved</p>
                      <p className={`text-sm font-black ${report.savings >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>{formatCurrency(report.savings)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-white/5 rounded-2xl border border-white/5 text-xs text-slate-400">
                    <PiggyBank size={18} className="text-emerald-500" />
                    <span>
                      You saved <span className="text-white font-bold">{Math.round((report.savings / ((report.salary || 0) + (report.earned || 0) || 1)) * 100)}%</span> of your total income.
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="pt-8 text-center">
        <p className="text-[10px] text-slate-800 font-bold uppercase tracking-[0.4em]">
          Automated Monthly Report Engine Active
        </p>
      </div>
    </div>
  );
};

export default AIInsights;
