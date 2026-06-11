import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';
import { 
  BrainCircuit, 
  TrendingDown, 
  AlertCircle, 
  CheckCircle2, 
  BarChart3, 
  Wallet, 
  ArrowUpRight, 
  ArrowDownRight, 
  PiggyBank,
  Send,
  Bot,
  Sparkles,
  MessageSquare
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const AIInsights = () => {
  const { monthlySalary, totalExpenses, remainingBalance, categorySpending, monthlyReports, currency, locale } = useSelector(selectFinanceStats);
  const transactions = useSelector(state => state.finance.transactions) || [];
  const finance = useSelector(state => state.finance) || {};
  const [activeTab, setActiveTab] = useState('insights');

  // Chat State
  const [messages, setMessages] = useState([
    { 
      id: 'welcome', 
      role: 'model', 
      content: "Hello! I am your FinSage AI Coach. I have loaded your current monthly salary, recent transactions, and borrows history.\n\nHow can I help you optimize your personal finances today?" 
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

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

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'coach') {
      scrollToBottom();
    }
  }, [messages, activeTab]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text || text.trim() === '') return;

    if (!textToSend) {
      setInput('');
    }

    const userMsg = { id: Date.now().toString(), role: 'user', content: text };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsTyping(true);

    try {
      const response = await api.post('/ai/chat', {
        messages: newMessages.map(m => ({ role: m.role, content: m.content })),
        finance
      });

      if (response.data?.reply) {
        setMessages(prev => [...prev, { 
          id: Date.now().toString() + '-reply', 
          role: 'model', 
          content: response.data.reply 
        }]);
      }
    } catch (err) {
      console.error("AI Coach Chat Error:", err);
      setMessages(prev => [...prev, { 
        id: Date.now().toString() + '-err', 
        role: 'model', 
        content: "I couldn't reach the intelligence engine. Please check your connection and try again." 
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    
    // Escape standard HTML tags to prevent XSS
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    // Bold: **text** -> <strong>text</strong>
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Bullet Lists: Line starting with * or -
    const lines = html.split('\n');
    let inList = false;
    const processedLines = [];
    
    lines.forEach(line => {
      const listMatch = line.match(/^(\s*)[*\-]\s+(.*)$/);
      if (listMatch) {
        if (!inList) {
          processedLines.push('<ul class="list-disc pl-6 space-y-1.5 my-3 text-slate-300">');
          inList = true;
        }
        processedLines.push(`<li>${listMatch[2]}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line.trim() !== '') {
          processedLines.push(`<p class="my-2.5 leading-relaxed text-slate-200">${line}</p>`);
        }
      }
    });
    
    if (inList) {
      processedLines.push('</ul>');
    }
    
    return processedLines.join('\n');
  };

  const quickPrompts = [
    { label: "📊 Budget Overview", prompt: "Provide a quick summary of my current budget, transactions count, and borrow status." },
    { label: "💸 Recent Spending", prompt: "List my most recent transactions and summarize my main spending categories." },
    { label: "📈 Savings Rate Analysis", prompt: "Compute my current month's savings rate and let me know if I am on track." },
    { label: "💡 Optimization Tips", prompt: "Analyze my category spending patterns and suggest 3 direct ways to cut costs." }
  ];

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto flex flex-col min-h-0 animate-fade-in">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <BrainCircuit className="text-white" size={32} />
            Financial Intelligence
          </h2>
          <p className="text-slate-400">Deep analysis of your spending habits and monthly performance.</p>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-4 border-b border-white/5 pb-1 shrink-0">
        <button 
          onClick={() => setActiveTab('insights')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${activeTab === 'insights' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
        >
          AI Analysis
          {activeTab === 'insights' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
        <button 
          onClick={() => setActiveTab('coach')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${activeTab === 'coach' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
        >
          AI Coach Chat
          {activeTab === 'coach' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
        <button 
          onClick={() => setActiveTab('reports')}
          className={`pb-4 px-4 font-bold text-sm transition-all relative ${activeTab === 'reports' ? 'text-white' : 'text-slate-500 hover:text-white'}`}
        >
          Monthly Reports
          {activeTab === 'reports' && <motion.div layoutId="tab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />}
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 min-h-0">
        {activeTab === 'insights' && (
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
        )}

        {activeTab === 'coach' && (
          <div className="flex flex-col bg-white/[0.02] border border-white/5 rounded-[2.5rem] h-[55vh] max-w-4xl mx-auto overflow-hidden shadow-2xl">
            {/* Messages Box */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-white/10">
              {messages.map((msg) => (
                <div 
                  key={msg.id} 
                  className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'self-end flex-row-reverse ml-auto' : 'self-start mr-auto'}`}
                >
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-white shadow-inner">
                      <Bot size={16} />
                    </div>
                  )}
                  <div 
                    className={`px-4 py-3 rounded-2xl text-sm ${
                      msg.role === 'user' 
                        ? 'bg-white text-black font-semibold rounded-tr-none shadow-lg' 
                        : 'bg-white/[0.04] border border-white/5 text-white rounded-tl-none shadow-md'
                    }`}
                  >
                    {msg.role === 'model' ? (
                      <div 
                        className="space-y-1 text-slate-200"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing Dot Animation */}
              {isTyping && (
                <div className="flex gap-3 max-w-[80%] self-start mr-auto">
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0 border border-white/10 text-white">
                    <Bot size={16} />
                  </div>
                  <div className="bg-white/[0.04] border border-white/5 text-white px-5 py-4 rounded-2xl rounded-tl-none flex items-center gap-1.5 shadow-md">
                    <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 rounded-full bg-white/40 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            {messages.length === 1 && !isTyping && (
              <div className="px-6 py-3 flex flex-wrap gap-2 border-t border-white/[0.03] pt-4 shrink-0 bg-black/20">
                {quickPrompts.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(p.prompt)}
                    className="bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 text-xs font-bold text-slate-300 px-4 py-2 rounded-xl transition-all duration-200 flex items-center gap-1.5 active:scale-95"
                  >
                    <Sparkles size={12} className="text-amber-400" />
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Message Input Panel */}
            <div className="p-4 bg-black/40 border-t border-white/5 flex gap-3 items-center shrink-0">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                disabled={isTyping}
                placeholder={isTyping ? "AI Coach is analyzing..." : "Ask your coach (e.g. 'Analyze my savings rate')..."}
                className="flex-1 bg-white/[0.03] border border-white/5 focus:border-white/20 px-5 py-3.5 rounded-2xl text-sm text-white placeholder-slate-500 outline-none transition-all disabled:opacity-50"
              />
              <button
                onClick={() => handleSend()}
                disabled={isTyping || !input.trim()}
                className="bg-white text-black p-3.5 rounded-2xl hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.15)] disabled:opacity-30 disabled:scale-100 active:scale-95 hover:scale-105"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
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
      </div>

      <div className="pt-8 text-center shrink-0">
        <p className="text-[10px] text-slate-800 font-bold uppercase tracking-[0.4em]">
          Automated Monthly Report Engine Active
        </p>
      </div>
    </div>
  );
};

export default AIInsights;
