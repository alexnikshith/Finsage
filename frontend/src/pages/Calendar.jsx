import React, { useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, AlertCircle, FileDown, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const Calendar = () => {
  const calendarRef = useRef(null);
  const [isExporting, setIsExporting] = useState(false);
  // DIRECT ACCESS: No more disconnected brain!
  const finance = useSelector(state => state.finance) || {};
  const { transactions = [], currency = 'INR', locale = 'en-IN' } = finance;
  
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });
  const prevMonth = () => setCurrentDate(new Date(year, month - 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1));

  const handleExportPDF = async () => {
    if (!calendarRef.current) return;
    setIsExporting(true);
    try {
      const element = calendarRef.current;
      const canvas = await html2canvas(element, {
        backgroundColor: '#000000',
        scale: 2, // High quality
        useCORS: true,
        logging: false,
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });
      
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`FinSage_Report_${monthName}_${year}.pdf`);
    } catch (err) {
      console.error('PDF Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat(locale, { 
        style: 'currency', 
        currency: currency || 'INR', 
        maximumFractionDigits: 0 
      }).format(val || 0);
    } catch (e) {
      return `₹${val || 0}`;
    }
  };

  // BRUTE FORCE GROUPING
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const dayBlocks = [];

  // Empty slots
  for (let i = 0; i < firstDay; i++) {
    dayBlocks.push(<div key={`empty-${i}`} className="h-24 border border-white/5 opacity-10" />);
  }

  // Active days
  for (let d = 1; d <= daysInMonth; d++) {
    // ULTRA-LENIENT MATCHING
    const dayTransactions = transactions.filter(t => {
      if (!t || !t.date) return false;
      const tDate = new Date(t.date);
      
      // We check if Year, Month, and Day match the current block
      const match = tDate.getFullYear() === year && 
                    tDate.getMonth() === month && 
                    tDate.getDate() === d;
      return match;
    });

    const totalDaySpent = dayTransactions.reduce((sum, t) => sum + (t.type === 'expense' ? (Number(t.amount) || 0) : 0), 0);
    const dayCount = dayTransactions.length;
    const isToday = new Date().getFullYear() === year && 
                    new Date().getMonth() === month && 
                    new Date().getDate() === d;

    dayBlocks.push(
      <div 
        key={d} 
        className={`h-24 border border-white/10 p-2 flex flex-col relative transition-all ${isToday ? 'bg-white/5' : 'bg-transparent'}`}
      >
        <span className={`text-[10px] font-bold ${isToday ? 'text-white' : 'text-slate-600'}`}>{d}</span>
        
        <div className="flex-1 flex flex-col items-center justify-center space-y-0.5">
          {totalDaySpent > 0 ? (
            <div className="text-center">
              <p className="text-[7px] font-black text-rose-500/50 uppercase tracking-[0.2em]">Spent</p>
              <p className="text-2xl font-black text-white tracking-tighter">
                {formatCurrency(totalDaySpent)}
              </p>
              <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest italic">
                {dayCount} Items
              </p>
            </div>
          ) : (
            <p className="text-sm font-black text-white/5">{formatCurrency(0)}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto bg-black max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black flex items-center gap-3 uppercase tracking-tighter">
          <CalendarIcon size={24} />
          {monthName} {year}
        </h2>
        <div className="flex gap-4">
          <button 
            onClick={handleExportPDF}
            disabled={isExporting}
            className="glass-morphism px-6 py-4 rounded-2xl flex items-center gap-2 hover:bg-white/10 transition-all active:scale-95 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="animate-spin" size={20} /> : <FileDown size={20} />}
            <span className="text-sm font-bold uppercase tracking-widest">{isExporting ? 'Generating...' : 'Export PDF'}</span>
          </button>
          <button onClick={prevMonth} className="glass-morphism p-4 rounded-2xl hover:bg-white/10 transition-all"><ChevronLeft /></button>
          <button onClick={nextMonth} className="glass-morphism p-4 rounded-2xl hover:bg-white/10 transition-all"><ChevronRight /></button>
        </div>
      </div>

      {/* DATA AUDITOR BAR */}
      <div className="p-6 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full animate-pulse ${transactions.length > 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <div>
            <p className="text-lg font-bold">Live Memory Sync: {transactions.length} Active</p>
            <p className="text-sm text-slate-400">
              {transactions.length > 0 
                ? `System is now seeing all ${transactions.length} transactions from your Dashboard.` 
                : "WARNING: System is seeing 0 transactions in memory. Please check Dashboard."}
            </p>
          </div>
        </div>
      </div>

      <div ref={calendarRef} className="rounded-[3rem] border border-white/10 overflow-hidden shadow-2xl bg-black">
        <div className="grid grid-cols-7 bg-white/5">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-4 text-center text-xs font-black text-slate-500 uppercase tracking-widest">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {dayBlocks}
        </div>
      </div>
    </div>
  );
};

export default Calendar;
