import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectFinanceStats } from '../features/finance/financeSlice';
import { 
  Send,
  Bot,
  Sparkles,
  Trash2,
  MessageSquare,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import api from '../services/api';

const AICoach = () => {
  const { monthlySalary, totalExpenses, remainingBalance, categorySpending, monthlyReports, currency, locale } = useSelector(selectFinanceStats);
  const transactions = useSelector(state => state.finance.transactions) || [];
  const finance = useSelector(state => state.finance) || {};
  const email = useSelector(state => state.auth.user?.email);
  const auth = useSelector(state => state.auth) || {};
  const isGuest = auth.user?.isGuest;
  
  const navigate = useNavigate();
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [queriesCount, setQueriesCount] = useState(Number(sessionStorage.getItem('finsage_guest_queries') || 0));

  // Initialize and persist chat history using sessionStorage for guests and localStorage for real users
  const getSavedMessages = () => {
    try {
      if (email && !isGuest) {
        const saved = localStorage.getItem(`finsage_chat_${email}`);
        if (saved) {
          return JSON.parse(saved);
        }
      } else if (isGuest) {
        const saved = sessionStorage.getItem('finsage_chat_guest');
        if (saved) {
          return JSON.parse(saved);
        }
      }
    } catch (e) {
      console.error("Failed to load chat history:", e);
    }
    return [
      { 
        id: 'welcome', 
        role: 'model', 
        content: "Hello! I am your FinSage AI Coach. I have loaded your current monthly salary, recent transactions, and borrows history.\n\nHow can I help you optimize your personal finances today?" 
      }
    ];
  };

  const [messages, setMessages] = useState(getSavedMessages);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const messagesEndRef = useRef(null);

  // Sync state with storage when messages change
  useEffect(() => {
    if (email && !isGuest) {
      localStorage.setItem(`finsage_chat_${email}`, JSON.stringify(messages));
    } else if (isGuest) {
      sessionStorage.setItem('finsage_chat_guest', JSON.stringify(messages));
    }
  }, [messages, email, isGuest]);

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
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text || text.trim() === '') return;

    if (isGuest) {
      const currentQueries = Number(sessionStorage.getItem('finsage_guest_queries') || 0);
      if (currentQueries >= 5) {
        setShowLimitModal(true);
        return;
      }
    }

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

        if (isGuest) {
          const nextCount = Number(sessionStorage.getItem('finsage_guest_queries') || 0) + 1;
          sessionStorage.setItem('finsage_guest_queries', String(nextCount));
          setQueriesCount(nextCount);
        }
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

  const clearChat = () => {
    const resetMsg = [
      { 
        id: 'welcome', 
        role: 'model', 
        content: "Hello! I am your FinSage AI Coach. I have loaded your current monthly salary, recent transactions, and borrows history.\n\nHow can I help you optimize your personal finances today?" 
      }
    ];
    setMessages(resetMsg);
    if (email && !isGuest) {
      localStorage.removeItem(`finsage_chat_${email}`);
    } else if (isGuest) {
      sessionStorage.removeItem('finsage_chat_guest');
    }
    setShowClearConfirm(false);
  };

  const renderMarkdown = (text) => {
    if (!text) return '';
    
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
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
    <div className="flex-1 p-8 space-y-8 overflow-y-auto flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold flex items-center gap-3">
            <MessageSquare className="text-white" size={32} />
            <span>AI Financial Coach</span>
            {isGuest && (
              <span className="text-[10px] bg-white/5 border border-white/10 px-3 py-1 rounded-full font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5 shrink-0 select-none">
                <Sparkles size={11} className="animate-pulse" />
                <span>Queries: {queriesCount} / 5</span>
              </span>
            )}
          </h2>
          <p className="text-slate-400">Contextual financial intelligence chatbot powered by your live ledger.</p>
        </div>

        {/* Clear Chat Button */}
        <button
          onClick={() => setShowClearConfirm(true)}
          className="bg-white/5 border border-white/5 hover:bg-red-500/10 hover:border-red-500/20 text-slate-400 hover:text-red-500 p-3.5 rounded-2xl transition-all active:scale-95 shadow-md flex items-center gap-2 text-xs font-bold"
          title="Clear Conversation History"
        >
          <Trash2 size={16} />
          Clear Chat
        </button>
      </div>

      {/* Main Chat Panel Container */}
      <div className="flex-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-[2.5rem] min-h-[50vh] overflow-hidden shadow-2xl max-w-5xl w-full mx-auto">
        {/* Messages Stream Area */}
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
          
          {/* Typing Loading State */}
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

        {/* Quick Prompts Panel */}
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

        {/* Input Bar */}
        <div className="p-4 bg-black/40 border-t border-white/5 flex gap-3 items-center shrink-0">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend();
            }}
            disabled={isTyping}
            placeholder={isTyping ? "AI Coach is analyzing..." : "Ask your coach (e.g. 'How can I save money?')..."}
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

      {/* Custom Clear Chat Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-morphism p-8 rounded-[2rem] border border-white/10 max-w-sm w-full space-y-6 text-center shadow-2xl animate-fade-in"
          >
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto text-red-500">
              <Trash2 size={24} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Clear Chat History</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                This will permanently delete this conversation log. You cannot undo this action.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-5 py-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-bold transition-all active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={clearChat}
                className="px-5 py-3 rounded-xl bg-white hover:bg-slate-200 text-black text-sm font-bold transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.15)]"
              >
                Delete
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Queries Limit Exceeded Modal */}
      {showLimitModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-morphism p-8 rounded-[2.5rem] border border-white/10 max-w-sm w-full space-y-6 text-center shadow-2xl"
          >
            <div className="w-12 h-12 bg-amber-500/10 border border-amber-500/20 rounded-full flex items-center justify-center mx-auto text-amber-500">
              <Lock size={20} />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-white">Coach Queries Exceeded</h3>
              <p className="text-xs text-slate-400 leading-relaxed px-1">
                You have reached your limit of 5 free coach queries in trial mode. Sign in for uninterrupted experience to save your transaction history!
              </p>
            </div>
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={() => {
                  setShowLimitModal(false);
                  navigate('/login');
                }}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-slate-200 text-black text-xs font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
              >
                Log In & Save Data
              </button>
              <button
                onClick={() => setShowLimitModal(false)}
                className="w-full py-2.5 rounded-xl text-slate-500 hover:text-white text-xs font-bold uppercase tracking-wider transition-colors"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <div className="pt-8 text-center shrink-0">
        <p className="text-[10px] text-slate-800 font-bold uppercase tracking-[0.4em]">
          Automated Monthly Report Engine Active
        </p>
      </div>
    </div>
  );
};

export default AICoach;
