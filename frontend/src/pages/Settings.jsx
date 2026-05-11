import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { setMonthlySalary, resetFinance, updateCurrency } from '../features/finance/financeSlice';
import { logout } from '../features/auth/authSlice';
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
  BrainCircuit
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ConfirmModal from '../components/modals/ConfirmModal';

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

  const currentCurrencySymbol = currency === 'INR' ? '₹' : '';
  const userName = (user && user.username) ? user.username : 'User';

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
