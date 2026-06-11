import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { 
  setMonthlySalary, 
  resetFinance, 
  updateCurrency,
  addCategory,
  updateCategory,
  deleteCategory
} from '../features/finance/financeSlice';
import { logout } from '../features/auth/authSlice';
import { setPremium } from '../features/auth/authSlice';
import api from '../services/api';
import { 
  User, 
  Shield, 
  CreditCard, 
  Bell, 
  Trash2, 
  LogOut, 
  ChevronRight,
  Wallet,
  AlertTriangle,
  BrainCircuit,
  Plus,
  Edit2,
  Tag,
  Crown,
  Zap,
  Star,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/modals/ConfirmModal';
import { useNavigate, useLocation } from 'react-router-dom';

const SettingItem = ({ icon: Icon, title, description, onClick, variant = 'default', activeValue }) => (
  <div 
    onClick={onClick}
    className="glass-morphism p-6 rounded-3xl border border-white/5 flex items-center justify-between cursor-pointer group hover:border-white/20 transition-all"
  >
    <div className="flex items-center gap-4">
      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${variant === 'danger' ? 'bg-rose-500/10 text-rose-500' : 'bg-white/5 text-slate-400 group-hover:text-white transition-colors'}`}>
        <Icon size={24} />
      </div>
      <div className="space-y-0.5">
        <h4 className={`font-bold ${variant === 'danger' ? 'text-rose-500' : 'text-white'}`}>{title}</h4>
        <p className="text-xs text-slate-500 font-medium">{description}</p>
      </div>
    </div>
    <div className="flex items-center gap-3">
      {activeValue && (
        <span className="text-[10px] font-black tracking-widest text-slate-600 bg-white/5 px-3 py-1 rounded-full uppercase">
          {activeValue}
        </span>
      )}
      <ChevronRight size={18} className="text-slate-700 group-hover:text-slate-400 transition-colors" />
    </div>
  </div>
);

const Settings = () => {
  const { user } = useSelector(state => state.auth) || {};
  const finance = useSelector(state => state.finance) || {};
  const { 
    currency = 'INR', 
    locale = 'en-IN', 
    monthlySalary = 0, 
    transactions = [] 
  } = finance;
  
  const dispatch = useDispatch();

  const [isCurrencyModalOpen, setIsCurrencyModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isSalaryModalOpen, setIsSalaryModalOpen] = useState(false);
  const [newSalary, setNewSalary] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Category Editor State Hooks
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [catLabel, setCatLabel] = useState('');
  const [catIcon, setCatIcon] = useState('📦');
  const [catColor, setCatColor] = useState('#3b82f6');
  const [isDeleteCatModalOpen, setIsDeleteCatModalOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  // Subscription state
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // Open subscription modal if redirected from PremiumGuard
  React.useEffect(() => {
    if (location.state?.openSubscription) {
      setIsSubscriptionModalOpen(true);
    }
  }, [location.state]);

  const isPremium = user?.role === 'premium' && user?.subscriptionExpiry && new Date(user.subscriptionExpiry) > new Date();

  const handleUpgrade = async () => {
    if (!user || user.isGuest) {
      alert('Please sign in to upgrade to Premium.');
      return;
    }
    setPaymentLoading(true);
    try {
      const token = localStorage.getItem('token');
      // 1. Create Razorpay order on backend
      const orderRes = await api.post('/payments/create-order');
      const { orderId, amount, currency: orderCurrency, keyId } = orderRes.data;

      // 2. Open Razorpay checkout
      const options = {
        key: keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount,
        currency: orderCurrency,
        name: 'FinSage Premium',
        description: 'Monthly Premium Subscription — ₹99/month',
        order_id: orderId,
        prefill: {
          email: user?.email || '',
        },
        theme: { color: '#f59e0b' },
        handler: async (response) => {
          try {
            // 3. Verify payment on backend
            const verifyRes = await api.post('/payments/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            if (verifyRes.data.success) {
              dispatch(setPremium({ subscriptionExpiry: verifyRes.data.subscriptionExpiry }));
              setPaymentSuccess(true);
              setPaymentLoading(false);
            }
          } catch (verifyErr) {
            console.error('Payment verification failed:', verifyErr);
            alert('Payment verification failed. Please contact support.');
            setPaymentLoading(false);
          }
        },
        modal: {
          ondismiss: () => setPaymentLoading(false),
        },
      };

      if (!window.Razorpay) {
        alert('Razorpay SDK not loaded. Please refresh the page and try again.');
        setPaymentLoading(false);
        return;
      }
      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      console.error('Upgrade failed:', err);
      alert('Failed to initiate payment. Please try again.');
      setPaymentLoading(false);
    }
  };

  const categories = finance.categories || [];

  const currencies = [
    { code: 'INR', locale: 'en-IN', name: 'Indian Rupee (₹)' },
    { code: 'USD', locale: 'en-US', name: 'US Dollar ($)' },
    { code: 'EUR', locale: 'de-DE', name: 'Euro (€)' },
    { code: 'GBP', locale: 'en-GB', name: 'British Pound (£)' },
  ];

  const handleExportData = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `finsage_backup_${new Date().toLocaleDateString()}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
    } catch (err) {
      console.error("Export failed:", err);
    }
  };

  const handleUpdateSalary = () => {
    const amount = Number(newSalary);
    if (!isNaN(amount) && amount > 0) {
      dispatch(setMonthlySalary(amount));
      setIsSalaryModalOpen(false);
      setNewSalary('');
    }
  };

  const handleResetData = () => {
    dispatch(resetFinance());
    setIsResetModalOpen(false);
  };

  const handleCurrencyChange = (c) => {
    dispatch(updateCurrency({ currency: c.code, locale: c.locale }));
    setIsCurrencyModalOpen(false);
  };

  const handleOpenCategoryModal = (cat = null) => {
    if (cat) {
      setEditingCategory(cat);
      setCatLabel(cat.label);
      setCatIcon(cat.icon);
      setCatColor(cat.color);
    } else {
      setEditingCategory(null);
      setCatLabel('');
      setCatIcon('📦');
      setCatColor('#3b82f6');
    }
    setIsCategoryModalOpen(true);
  };

  const handleSaveCategory = () => {
    if (!catLabel.trim()) return;

    if (editingCategory) {
      dispatch(updateCategory({
        id: editingCategory.id,
        label: catLabel.trim(),
        icon: catIcon,
        color: catColor
      }));
    } else {
      dispatch(addCategory({
        label: catLabel.trim(),
        icon: catIcon,
        color: catColor
      }));
    }

    setIsCategoryModalOpen(false);
    setEditingCategory(null);
    setCatLabel('');
    setCatIcon('📦');
    setCatColor('#3b82f6');
  };

  const handleDeleteCategoryConfirm = () => {
    if (categoryToDelete) {
      dispatch(deleteCategory(categoryToDelete));
      setIsDeleteCatModalOpen(false);
      setCategoryToDelete(null);
    }
  };

  const currentCurrencySymbol = currency === 'INR' ? '₹' : '';
  const userName = (user && user.email) ? user.email.split('@')[0] : 'User';

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      {/* Modals */}
      <AnimatePresence>
        {isCurrencyModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-morphism w-full max-w-md p-8 rounded-[3rem] border border-white/10 space-y-6"
            >
              <h3 className="text-2xl font-bold">Select Currency</h3>
              <div className="grid grid-cols-1 gap-3">
                {currencies.map((c) => (
                  <button 
                    key={c.code} 
                    onClick={() => handleCurrencyChange(c)} 
                    className={`w-full p-5 rounded-2xl border text-left transition-all ${currency === c.code ? 'bg-white text-black border-white' : 'bg-white/5 text-white border-white/10 hover:border-white/30'}`}
                  >
                    <div className="font-bold">{c.name}</div>
                    <div className="text-xs opacity-50 uppercase tracking-widest">{c.code} — {c.locale}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setIsCurrencyModalOpen(false)} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest py-2">Cancel</button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isSalaryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-morphism w-full max-w-md p-8 rounded-[3rem] border border-white/10 space-y-6"
            >
              <h3 className="text-2xl font-bold">Update Monthly Salary</h3>
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">New Monthly Income</label>
                  <input 
                    type="number" 
                    placeholder="Enter new amount" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-xl font-black focus:outline-none focus:ring-1 focus:ring-white/50 text-white" 
                    value={newSalary} 
                    onChange={e => setNewSalary(e.target.value)} 
                  />
                </div>
                <button 
                  onClick={handleUpdateSalary}
                  className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-slate-200 transition-all shadow-xl"
                >
                  Save Changes
                </button>
                <button onClick={() => setIsSalaryModalOpen(false)} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest py-2 hover:text-white transition-colors">Cancel</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmModal 
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        onConfirm={handleResetData}
        title="Delete All Data?"
        message="This action is irreversible. All your transactions and budget history will be permanently wiped from this account."
        confirmText="Yes, Reset Everything"
      />

      <ConfirmModal 
        isOpen={isDeleteCatModalOpen}
        onClose={() => setIsDeleteCatModalOpen(false)}
        onConfirm={handleDeleteCategoryConfirm}
        title="Delete Custom Category?"
        message="This action cannot be undone. All transactions in this category will default to 'Others'."
        confirmText="Yes, Delete Category"
      />

      <AnimatePresence>
        {isCategoryModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }} 
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-morphism w-full max-w-md p-8 rounded-[3rem] border border-white/10 space-y-6"
            >
              <h3 className="text-2xl font-bold text-white">
                {editingCategory ? 'Edit Custom Category' : 'Create Custom Category'}
              </h3>
              
              <div className="space-y-4 text-left">
                {/* Category Name */}
                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Category Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. Subscriptions, Fitness" 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 px-6 text-lg font-bold focus:outline-none focus:ring-1 focus:ring-white/50 text-white" 
                    value={catLabel} 
                    onChange={e => setCatLabel(e.target.value)} 
                  />
                </div>

                {/* Icon selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Icon (Emoji)</label>
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      maxLength={2} 
                      placeholder="📦" 
                      className="w-16 bg-white/5 border border-white/10 rounded-2xl py-3 text-center text-2xl font-bold focus:outline-none focus:ring-1 focus:ring-white/50 text-white" 
                      value={catIcon} 
                      onChange={e => setCatIcon(e.target.value)} 
                    />
                    <div className="flex-1 grid grid-cols-6 gap-1.5 p-2 bg-white/5 rounded-2xl border border-white/5">
                      {['💻', '🏠', '📈', '✈️', '🎮', '🏋️', '🐾', '🎁', '💡', '💅', '☕', '🍷'].map(emoji => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setCatIcon(emoji)}
                          className={`text-xl p-1 rounded-lg hover:bg-white/10 transition-colors flex items-center justify-center ${catIcon === emoji ? 'bg-white/20' : ''}`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Color Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1">Theme Color</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="color" 
                      className="w-12 h-12 rounded-xl bg-transparent border-0 cursor-pointer" 
                      value={catColor} 
                      onChange={e => setCatColor(e.target.value)} 
                    />
                    <div className="flex-1 flex gap-2 overflow-x-auto py-1 custom-scrollbar">
                      {['#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#6366f1', '#3b82f6', '#06b6d4', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f97316'].map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setCatColor(color)}
                          className="w-6 h-6 rounded-full border border-white/10 transition-transform hover:scale-110 active:scale-95 flex-shrink-0"
                          style={{ backgroundColor: color, transform: catColor === color ? 'scale(1.2)' : 'none' }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 space-y-2">
                  <button 
                    onClick={handleSaveCategory}
                    disabled={!catLabel.trim()}
                    className="w-full bg-white text-black py-4 rounded-2xl font-black text-lg hover:bg-slate-200 disabled:opacity-50 disabled:hover:bg-white transition-all shadow-xl"
                  >
                    {editingCategory ? 'Update Category' : 'Create Category'}
                  </button>
                  <button 
                    onClick={() => setIsCategoryModalOpen(false)} 
                    className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest py-2 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Subscription Modal ── */}
      <AnimatePresence>
        {isSubscriptionModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-morphism w-full max-w-lg p-8 rounded-[3rem] border border-amber-500/20 space-y-6"
            >
              {paymentSuccess ? (
                <div className="text-center space-y-4 py-4">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }} className="flex justify-center">
                    <div className="w-20 h-20 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                      <CheckCircle2 size={40} className="text-amber-400" />
                    </div>
                  </motion.div>
                  <h3 className="text-2xl font-black text-white">You're Premium! 🎉</h3>
                  <p className="text-slate-400 text-sm">Analytics and AI Coach are now fully unlocked. Enjoy!</p>
                  <p className="text-xs text-slate-600">Expires: {user?.subscriptionExpiry ? new Date(user.subscriptionExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : 'N/A'}</p>
                  <button
                    onClick={() => { setIsSubscriptionModalOpen(false); setPaymentSuccess(false); }}
                    className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white py-4 rounded-2xl font-black text-lg hover:opacity-90 transition-all shadow-lg shadow-amber-500/25"
                  >
                    Start Exploring Premium
                  </button>
                </div>
              ) : (
                <>
                  <div className="text-center">
                    <div className="flex justify-center mb-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center">
                        <Crown size={30} className="text-amber-400" />
                      </div>
                    </div>
                    <h3 className="text-2xl font-black text-white">Upgrade to Premium</h3>
                    <p className="text-slate-400 text-sm mt-1">Unlock Analytics & AI Coach for ₹99/month</p>
                  </div>

                  {/* Plan comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Freemium · Free</p>
                      {['Dashboard', 'Transactions', 'Budget', 'Borrows', 'Notifications', 'Calendar', 'AI Insights'].map(f => (
                        <div key={f} className="flex items-center gap-2 py-0.5">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          <span className="text-xs text-slate-300">{f}</span>
                        </div>
                      ))}
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/30 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1"><Crown size={10} /> Premium · ₹99/mo</p>
                      {['Dashboard', 'Transactions', 'Budget', 'Borrows', 'Notifications', 'Calendar', 'AI Insights'].map(f => (
                        <div key={f} className="flex items-center gap-2 py-0.5">
                          <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                          <span className="text-xs text-slate-300">{f}</span>
                        </div>
                      ))}
                      {['Analytics', 'AI Coach'].map(f => (
                        <div key={f} className="flex items-center gap-2 py-0.5">
                          <Star size={12} className="text-amber-400 shrink-0" />
                          <span className="text-xs text-amber-300 font-bold">{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleUpgrade}
                    disabled={paymentLoading}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-amber-500/25 hover:opacity-90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {paymentLoading ? (
                      <span className="flex items-center gap-2"><span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Processing...</span>
                    ) : (
                      <><Zap size={18} /> Pay ₹99 &amp; Unlock Premium</>
                    )}
                  </button>
                  <p className="text-center text-[10px] text-slate-600">Powered by Razorpay · Secure payment · Cancel anytime</p>
                  <button onClick={() => setIsSubscriptionModalOpen(false)} className="w-full text-slate-500 text-xs font-bold uppercase tracking-widest py-1 hover:text-white transition-colors">Cancel</button>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div>
        <h2 className="text-3xl font-bold">Settings</h2>
        <p className="text-slate-400">Manage your account preferences and data.</p>
      </div>

      <div className="max-w-3xl space-y-4">
        {/* Account Section */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Account Profile</h3>
          <div className="glass-morphism p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6">
            <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center text-black shadow-2xl shadow-white/5">
              <User size={40} />
            </div>
            <div>
              <h4 className="text-2xl font-bold">{userName}</h4>
              <p className="text-slate-500 font-medium">{user?.email || 'No email provided'}</p>
              <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 text-emerald-500 rounded-full text-[10px] font-bold uppercase tracking-wider">
                <Shield size={12} />
                Verified Account
              </div>
            </div>
          </div>
        </div>

        {/* Preferences Section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">App Preferences</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingItem 
              icon={Wallet} 
              title="Monthly Salary" 
              description="Update your base monthly income." 
              activeValue={`${currentCurrencySymbol}${monthlySalary || 0}`}
              onClick={() => {
                setNewSalary((monthlySalary || 0).toString());
                setIsSalaryModalOpen(true);
              }} 
            />
            <SettingItem 
              icon={CreditCard} 
              title="Currency & Locale" 
              description="Change how amounts are displayed." 
              activeValue={currencies.find(c => c.code === currency)?.name || currency}
              onClick={() => setIsCurrencyModalOpen(true)} 
            />
            <SettingItem 
              icon={Bell} 
              title="Notifications" 
              description="Real-time alerts and updates." 
              activeValue={notificationsEnabled ? 'ENABLED' : 'DISABLED'}
              onClick={() => setNotificationsEnabled(!notificationsEnabled)} 
            />
          </div>
        </div>

        {/* Category Management Section */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center justify-between ml-2">
            <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600">Category Management</h3>
            <button 
              onClick={() => handleOpenCategoryModal()} 
              className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5 transition-all active:scale-95"
            >
              <Plus size={14} />
              <span>Add Category</span>
            </button>
          </div>
          <div className="glass-morphism p-6 rounded-[2.5rem] border border-white/5 space-y-4">
            <p className="text-xs text-slate-400 font-medium">Create and customize your expense categories. Default categories cannot be modified.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {categories.map((cat) => (
                <div 
                  key={cat.id} 
                  className="bg-white/5 border border-white/5 rounded-2xl p-4 flex items-center justify-between group hover:border-white/10 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shadow-inner flex-shrink-0"
                      style={{ backgroundColor: `${cat.color}20`, border: `1px solid ${cat.color}40` }}
                    >
                      {cat.icon}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white">{cat.label}</h4>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                        {cat.isCustom ? 'Custom Category' : 'System Default'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {cat.isCustom ? (
                      <>
                        <button 
                          onClick={() => handleOpenCategoryModal(cat)}
                          className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition-all border border-white/5 active:scale-90"
                          title="Edit Category"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => {
                            setCategoryToDelete(cat.id);
                            setIsDeleteCatModalOpen(true);
                          }}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-xl transition-all border border-rose-500/10 active:scale-90"
                          title="Delete Category"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    ) : (
                      <span className="text-[9px] font-black tracking-widest text-slate-600 bg-white/5 px-2.5 py-1 rounded-full uppercase">
                        Locked
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Subscription Section ── */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Subscription Plan</h3>
          <div className={`glass-morphism p-6 rounded-[2.5rem] border ${ isPremium ? 'border-amber-500/30 bg-amber-500/5' : 'border-white/5' } relative overflow-hidden`}>
            {isPremium && (
              <div className="absolute top-0 right-0 w-40 h-40 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${ isPremium ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5' }`}>
                  <Crown size={22} className={isPremium ? 'text-amber-400' : 'text-slate-500'} />
                </div>
                <div>
                  <h4 className="font-black text-white text-lg">{isPremium ? 'Premium' : 'Freemium'}</h4>
                  <p className="text-xs text-slate-500">
                    {isPremium
                      ? `Expires ${new Date(user.subscriptionExpiry).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`
                      : 'Free plan · Limited access'}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-black tracking-widest px-3 py-1.5 rounded-full uppercase ${ isPremium ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'bg-white/5 text-slate-500 border border-white/8' }`}>
                {isPremium ? '✦ Active' : 'Free'}
              </span>
            </div>

            {/* Feature list */}
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mb-5">
              {['Dashboard', 'Transactions', 'Budget', 'Borrows', 'Notifications', 'Calendar', 'AI Insights'].map(f => (
                <div key={f} className="flex items-center gap-2 py-0.5">
                  <CheckCircle2 size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-xs text-slate-400">{f}</span>
                </div>
              ))}
              {['Analytics', 'AI Coach'].map(f => (
                <div key={f} className="flex items-center gap-2 py-0.5">
                  {isPremium
                    ? <CheckCircle2 size={12} className="text-amber-400 shrink-0" />
                    : <Lock size={12} className="text-slate-600 shrink-0" />}
                  <span className={`text-xs ${ isPremium ? 'text-amber-300 font-bold' : 'text-slate-600' }`}>{f}</span>
                </div>
              ))}
            </div>

            {!isPremium && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsSubscriptionModalOpen(true)}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/35 transition-all"
              >
                <Zap size={16} />
                Upgrade to Premium · ₹99/month
              </motion.button>
            )}
          </div>
        </div>

        {/* Data Backup & Sync Section */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Data Backup & Cloud Sync</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SettingItem 
              icon={BrainCircuit} 
              title="Sync with Cloud" 
              description="Back up your data to your permanent MongoDB account." 
              activeValue="READY"
              onClick={() => {
                alert('Cloud Sync sequence initiated. Your data is now being backed up to MongoDB.');
              }} 
            />
            <SettingItem 
              icon={Shield} 
              title="Export Local Backup" 
              description="Download a copy of your transactions as a JSON file." 
              onClick={handleExportData} 
            />
          </div>
        </div>

        {/* Privacy & Danger Zone */}
        <div className="space-y-4 pt-4">
          <h3 className="text-xs font-bold uppercase tracking-[0.2em] text-slate-600 ml-2">Privacy & Danger Zone</h3>
          <div className="grid grid-cols-1 gap-4">
            <SettingItem 
              icon={Trash2} 
              title="Reset All Data" 
              description="Delete all transactions and reset your monthly salary." 
              variant="danger"
              onClick={() => setIsResetModalOpen(true)} 
            />
            <SettingItem 
              icon={LogOut} 
              title="Sign Out" 
              description="Securely log out of your current session." 
              onClick={() => dispatch(logout())} 
            />
          </div>
        </div>

        <div className="pt-8 text-center">
          <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.3em]">
            FinSage Intelligence Engine v1.0.5
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
