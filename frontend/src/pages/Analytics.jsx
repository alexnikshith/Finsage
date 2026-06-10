import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight, 
  Calendar, 
  PieChart as PieIcon, 
  Activity, 
  Percent, 
  Wallet,
  Scale
} from 'lucide-react';
import { motion } from 'framer-motion';

const CustomTooltip = ({ active, payload, currency, locale }) => {
  if (active && payload && payload.length) {
    const formatCurrency = (val) => new Intl.NumberFormat(locale || 'en-IN', { 
      style: 'currency', 
      currency: currency || 'INR', 
      maximumFractionDigits: 0 
    }).format(val);

    return (
      <div className="bg-black/90 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">{payload[0].payload.date || payload[0].name}</p>
        {payload.map((item, idx) => (
          <p key={idx} className="text-sm font-bold text-white mt-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: item.color || item.fill }} />
            <span>{item.name}:</span>
            <span className="text-slate-100">{formatCurrency(item.value)}</span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const getCategoryColor = (catId, categories) => {
  const customColors = {
    food: '#ff6b6b',
    groceries: '#51cf66',
    transport: '#339af0',
    shopping: '#cc5de8',
    bills: '#fcc419',
    entertainment: '#ff922b',
    health: '#20c997',
    education: '#845ef7',
    other: '#868e96',
  };
  const cat = categories.find(c => c.id === catId);
  if (cat && cat.color && cat.color !== '#ffffff' && !cat.color.startsWith('#e5') && !cat.color.startsWith('#d1') && !cat.color.startsWith('#9c')) {
    return cat.color;
  }
  return customColors[catId] || customColors.other;
};

const filterTxsByRange = (txs, range) => {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let cutOffDate = new Date(startOfDay);

  if (range === '7days') {
    cutOffDate.setDate(startOfDay.getDate() - 7);
  } else if (range === '30days') {
    cutOffDate.setDate(startOfDay.getDate() - 30);
  } else if (range === '90days') {
    cutOffDate.setDate(startOfDay.getDate() - 90);
  } else {
    return txs;
  }
  return txs.filter(t => new Date(t.date) >= cutOffDate);
};

const Analytics = () => {
  const { currency, locale, monthlySalary, monthlyReports } = useSelector(selectFinanceStats);
  const transactions = useSelector(state => state.finance.transactions) || [];
  const categories = useSelector(state => state.finance.categories) || [];

  const [range, setRange] = useState('30days');
  const [hoveredCategory, setHoveredCategory] = useState(null);

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

  // 1. Process Range Statistics
  const rangeStats = useMemo(() => {
    const rangeTxs = filterTxsByRange(transactions, range);
    const expenses = rangeTxs.filter(t => t.type === 'expense');
    const totalExpenses = expenses.reduce((sum, t) => sum + (t.amount || 0), 0);

    // Dynamic scaled Inflow
    let totalInflow = rangeTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);
    let days = 30;
    if (range === '7days') {
      days = 7;
      totalInflow += (monthlySalary * 7 / 30);
    } else if (range === '30days') {
      days = 30;
      totalInflow += monthlySalary;
    } else if (range === '90days') {
      days = 90;
      totalInflow += (monthlySalary * 3);
    } else {
      // All time
      if (transactions.length === 0) {
        totalInflow += monthlySalary;
      } else {
        const dates = transactions.map(t => new Date(t.date).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date();
        const diffMonths = Math.max(1, (maxDate.getFullYear() - minDate.getFullYear()) * 12 + maxDate.getMonth() - minDate.getMonth() + 1);
        totalInflow += (monthlySalary * diffMonths);
        
        const diffTime = Math.abs(maxDate - minDate);
        days = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }
    }

    const savings = totalInflow - totalExpenses;
    const savingsRate = totalInflow > 0 ? Math.max(0, Math.round((savings / totalInflow) * 100)) : 0;
    const dailyAverage = totalExpenses / days;

    return {
      totalExpenses,
      totalInflow,
      savings,
      savingsRate,
      dailyAverage,
      rangeTxs,
      expenses
    };
  }, [transactions, range, monthlySalary]);

  // 2. Process Pie Chart Data (Category spending)
  const pieData = useMemo(() => {
    const catMap = {};
    categories.forEach(c => {
      catMap[c.id] = {
        id: c.id,
        name: c.label,
        value: 0,
        icon: c.icon,
        color: getCategoryColor(c.id, categories),
        count: 0
      };
    });

    rangeStats.expenses.forEach(t => {
      const catId = t.category || 'other';
      if (!catMap[catId]) {
        catMap[catId] = {
          id: catId,
          name: catId.charAt(0).toUpperCase() + catId.slice(1),
          value: 0,
          icon: '📦',
          color: '#868e96',
          count: 0
        };
      }
      catMap[catId].value += Number(t.amount) || 0;
      catMap[catId].count += 1;
    });

    return Object.values(catMap).filter(c => c.value > 0).sort((a, b) => b.value - a.value);
  }, [rangeStats.expenses, categories]);

  // Default selected category details card
  const selectedCategoryDetails = useMemo(() => {
    if (pieData.length === 0) return null;
    if (hoveredCategory) {
      return pieData.find(c => c.id === hoveredCategory) || pieData[0];
    }
    return pieData[0];
  }, [pieData, hoveredCategory]);

  // 3. Process Cumulative Trend Line Data
  const trendData = useMemo(() => {
    const daysLimit = range === '7days' ? 8 : range === '30days' ? 31 : range === '90days' ? 91 : 366;
    const data = [];
    const now = new Date();
    
    const expenseMap = {};
    rangeStats.expenses.forEach(t => {
      const d = new Date(t.date);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      expenseMap[key] = (expenseMap[key] || 0) + (t.amount || 0);
    });

    let runningTotal = 0;
    
    for (let i = daysLimit - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const dailySpend = expenseMap[key] || 0;
      runningTotal += dailySpend;
      
      data.push({
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
        amount: runningTotal,
        daily: dailySpend
      });
    }

    if (range === 'all') {
      const startOfLimit = new Date();
      startOfLimit.setDate(now.getDate() - 365);
      const olderExpenses = transactions
        .filter(t => t.type === 'expense' && new Date(t.date) < startOfLimit)
        .reduce((sum, t) => sum + (t.amount || 0), 0);
        
      data.forEach(pt => {
        pt.amount += olderExpenses;
      });
    }

    return data;
  }, [rangeStats.expenses, range, transactions]);

  // 4. Process Monthly Bar Chart (Income vs Expense)
  const monthlyBarData = useMemo(() => {
    const data = [];
    
    (monthlyReports || []).forEach(r => {
      data.push({
        name: `${r.month.substring(0,3)} ${r.year.toString().substring(2,4)}`,
        Income: (r.salary || 0) + (r.earned || 0),
        Expense: r.spent || 0
      });
    });

    const now = new Date();
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonthName = monthNames[now.getMonth()];
    const currentYearName = now.getFullYear().toString().substring(2,4);

    const currentMonthTxs = transactions.filter(t => new Date(t.date).getMonth() === now.getMonth());
    const currentSpent = currentMonthTxs.filter(t => t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0);
    const currentEarned = currentMonthTxs.filter(t => t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0);

    data.push({
      name: `${currentMonthName} ${currentYearName} (Cur)`,
      Income: monthlySalary + currentEarned,
      Expense: currentSpent
    });

    return data.slice(-6);
  }, [monthlyReports, monthlySalary, transactions]);

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BarChart3 className="text-white" size={32} />
            Advanced Analytics
          </h2>
          <p className="text-slate-400">Deep structural visualization of your income, savings, and expense categories.</p>
        </div>

        {/* Range Selector */}
        <div className="flex bg-white/5 border border-white/5 p-1 rounded-2xl shrink-0 self-start md:self-auto">
          {[
            { id: '7days', label: '7D' },
            { id: '30days', label: '30D' },
            { id: '90days', label: '90D' },
            { id: 'all', label: 'ALL' }
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setRange(opt.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
                range === opt.id ? 'bg-white text-black' : 'text-slate-400 hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-2"
        >
          <div className="flex items-center gap-2 text-emerald-500">
            <TrendingUp size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Inflow</span>
          </div>
          <h3 className="text-3xl font-black">{formatCurrency(rangeStats.totalInflow)}</h3>
          <p className="text-[10px] text-slate-500">Salary + incomes in range</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-2"
        >
          <div className="flex items-center gap-2 text-rose-500">
            <TrendingDown size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Total Outflow</span>
          </div>
          <h3 className="text-3xl font-black text-rose-500">{formatCurrency(rangeStats.totalExpenses)}</h3>
          <p className="text-[10px] text-slate-500">Accumulated expenses in range</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-2"
        >
          <div className="flex items-center gap-2 text-cyan-400">
            <Percent size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Savings Rate</span>
          </div>
          <h3 className="text-3xl font-black text-cyan-400">{rangeStats.savingsRate}%</h3>
          <p className="text-[10px] text-slate-500">Percentage of inflow saved</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 15 }} 
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="glass-morphism p-6 rounded-3xl border border-white/5 space-y-2"
        >
          <div className="flex items-center gap-2 text-amber-500">
            <Activity size={16} />
            <span className="text-xs font-bold uppercase tracking-wider">Daily Avg Spend</span>
          </div>
          <h3 className="text-3xl font-black text-amber-500">{formatCurrency(rangeStats.dailyAverage)}</h3>
          <p className="text-[10px] text-slate-500">Expenses divided by days</p>
        </motion.div>
      </div>

      {/* Main Chart Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Spending Category Breakdown (Pie Chart) */}
        <div className="lg:col-span-2 glass-morphism p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <PieIcon size={18} />
              Segment Distribution
            </h3>
            <p className="text-slate-400 text-xs">Hover over segment slices to see absolute spending details.</p>
          </div>

          {pieData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-500">
              <Activity size={32} className="text-slate-700 mb-2" />
              <p className="text-sm font-medium">No expenses logged in this range.</p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 md:grid-cols-12 items-center gap-6 mt-4">
              <div className="md:col-span-7 h-64 relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={95}
                      paddingAngle={4}
                      dataKey="value"
                      onMouseEnter={(e, index) => {
                        if (pieData[index]) setHoveredCategory(pieData[index].id);
                      }}
                      onMouseLeave={() => setHoveredCategory(null)}
                    >
                      {pieData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.color} 
                          style={{
                            filter: hoveredCategory === entry.id ? 'drop-shadow(0 0 8px rgba(255,255,255,0.25))' : 'none',
                            transition: 'all 0.2s ease'
                          }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Total Expense centered in doughnut */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Total Spent</span>
                  <span className="text-xl font-black text-white">{formatCurrency(rangeStats.totalExpenses)}</span>
                </div>
              </div>

              {/* Dynamic Interactive Segment Card */}
              {selectedCategoryDetails && (
                <div className="md:col-span-5 bg-white/5 border border-white/5 rounded-3xl p-6 space-y-4 shadow-xl">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl p-2 bg-white/10 rounded-2xl inline-block">{selectedCategoryDetails.icon}</span>
                    <div>
                      <h4 className="font-bold text-md text-white">{selectedCategoryDetails.name}</h4>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Category</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-2 border-t border-white/5 pt-4">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Total Spent</span>
                      <span className="text-base font-black text-white">{formatCurrency(selectedCategoryDetails.value)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Of Range Outflow</span>
                      <span className="text-base font-black text-white">
                        {rangeStats.totalExpenses > 0 ? Math.round((selectedCategoryDetails.value / rangeStats.totalExpenses) * 100) : 0}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Transactions</span>
                      <span className="text-sm font-bold text-white">{selectedCategoryDetails.count} items</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Average Size</span>
                      <span className="text-sm font-bold text-white">
                        {formatCurrency(selectedCategoryDetails.value / selectedCategoryDetails.count)}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Monthly Income vs Expense (Bar Chart) */}
        <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 flex flex-col justify-between min-h-[380px]">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Scale size={18} />
              Income vs Outflow
            </h3>
            <p className="text-slate-400 text-xs">Past 6 months comparison (including current month).</p>
          </div>

          <div className="flex-1 h-64 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyBarData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 10, color: '#fff', paddingTop: 10 }} />
                <Bar dataKey="Income" fill="#10b981" radius={[4, 4, 0, 0]} name="Inflow" />
                <Bar dataKey="Expense" fill="#f43f5e" radius={[4, 4, 0, 0]} name="Outflow" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Cumulative Trend Line Area Chart */}
      <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 space-y-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Activity size={18} />
            Cumulative Spend Speed
          </h3>
          <p className="text-slate-400 text-xs">Visualize the velocity of your outflows across the selected timeline.</p>
        </div>

        {trendData.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-slate-500 text-sm">
            Add transactions to view the spend speed curve.
          </div>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ffffff" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ffffff" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.3)" fontSize={10} tickLine={false} />
                <Tooltip content={<CustomTooltip currency={currency} locale={locale} />} />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#ffffff" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                  name="Cumulative Spent"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Structured Category Table */}
      <div className="glass-morphism rounded-[2.5rem] border border-white/5 overflow-hidden">
        <div className="p-6 border-b border-white/5">
          <h3 className="text-lg font-bold">Structural Category Analysis</h3>
          <p className="text-slate-400 text-xs">Segment spending details ordered by maximum volume.</p>
        </div>

        {pieData.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm font-medium">
            No spending category details available.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/5 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-6">Segment</th>
                  <th className="py-4 px-6 text-right">Transactions</th>
                  <th className="py-4 px-6 text-right">Avg Size</th>
                  <th className="py-4 px-6 text-right">Percentage</th>
                  <th className="py-4 px-6 text-right">Total Outflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {pieData.map((cat, idx) => {
                  const percentage = rangeStats.totalExpenses > 0 ? Math.round((cat.value / rangeStats.totalExpenses) * 100) : 0;
                  return (
                    <tr key={cat.id} className="hover:bg-white/5 transition-all">
                      <td className="py-4 px-6 flex items-center gap-3">
                        <span className="text-2xl p-1.5 bg-white/5 border border-white/5 rounded-xl block">{cat.icon}</span>
                        <span className="text-white font-bold">{cat.name}</span>
                      </td>
                      <td className="py-4 px-6 text-right text-slate-300">{cat.count} items</td>
                      <td className="py-4 px-6 text-right text-slate-300">{formatCurrency(cat.value / cat.count)}</td>
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-2">
                          <span className="text-xs text-slate-400 font-bold">{percentage}%</span>
                          <div className="w-16 bg-white/10 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="h-full rounded-full" 
                              style={{ width: `${percentage}%`, backgroundColor: cat.color }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-right text-white font-bold">{formatCurrency(cat.value)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Analytics;
