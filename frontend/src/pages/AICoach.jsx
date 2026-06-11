import React, { useState, useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';
import { 
  Send,
  Bot,
  Sparkles,
  Trash2,
  MessageSquare
} from 'lucide-react';
import api from '../services/api';

const AICoach = () => {
  const { monthlySalary, totalExpenses, remainingBalance, categorySpending, monthlyReports, currency, locale } = useSelector(selectFinanceStats);
  const transactions = useSelector(state => state.finance.transactions) || [];
  const finance = useSelector(state => state.finance) || {};
  const email = useSelector(state => state.auth.user?.email);

  // Initialize and persist chat history using localStorage
  const getSavedMessages = () => {
    try {
      if (email) {
        const saved = localStorage.getItem(`finsage_chat_${email}`);
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
  const messagesEndRef = useRef(null);

  // Sync state with storage when messages change
  useEffect(() => {
    if (email) {
      localStorage.setItem(`finsage_chat_${email}`, JSON.stringify(messages));
    }
  }, [messages, email]);

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

  const clearChat = () => {
    const confirmed = window.confirm("Are you sure you want to clear your chat history?");
    if (confirmed) {
      const resetMsg = [
        { 
          id: 'welcome', 
          role: 'model', 
          content: "Hello! I am your FinSage AI Coach. I have loaded your current monthly salary, recent transactions, and borrows history.\n\nHow can I help you optimize your personal finances today?" 
        }
      ];
      setMessages(resetMsg);
      if (email) {
        localStorage.removeItem(`finsage_chat_${email}`);
      }
    }
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
            AI Financial Coach
          </h2>
          <p className="text-slate-400">Contextual financial intelligence chatbot powered by your live ledger.</p>
        </div>

        {/* Clear Chat Button */}
        <button
          onClick={clearChat}
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

      <div className="pt-8 text-center shrink-0">
        <p className="text-[10px] text-slate-800 font-bold uppercase tracking-[0.4em]">
          Automated Monthly Report Engine Active
        </p>
      </div>
    </div>
  );
};

export default AICoach;
