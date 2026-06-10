import { NavLink } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { logout } from '../features/auth/authSlice';
import { hardResetFinance } from '../features/finance/financeSlice';
import { 
  LayoutDashboard, 
  Wallet, 
  TrendingUp, 
  Target, 
  HandCoins,
  BrainCircuit, 
  Settings,
  LogOut,
  Bell,
  Calendar,
  BarChart3
} from 'lucide-react';
import { useSelector } from 'react-redux';
import { selectFinanceStats } from '../features/finance/financeSlice';

const SidebarItem = ({ icon: Icon, label, to, onClick, badge }) => {
  const content = (
    <>
      <div className="flex items-center gap-3">
        <Icon size={20} />
        <span className="font-medium">{label}</span>
      </div>
      {badge > 0 && (
        <div className="bg-emerald-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
          {badge}
        </div>
      )}
    </>
  );

  if (onClick) {
    return (
      <div 
        onClick={onClick}
        className="flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 text-slate-400 hover:bg-white/5 hover:text-white"
      >
        {content}
      </div>
    );
  }

  return (
    <NavLink 
      to={to}
      className={({ isActive }) => `flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-all duration-200 ${
        isActive ? 'bg-white text-black font-bold' : 'text-slate-400 hover:bg-white/5 hover:text-white'
      }`}
    >
      {content}
    </NavLink>
  );
};

const Sidebar = () => {
  const dispatch = useDispatch();
  const { unreadNotifications } = useSelector(selectFinanceStats);

  return (
    <div className="w-64 h-screen glass-morphism border-r border-white/5 flex flex-col p-6 sticky top-0">
      <div 
        onClick={() => window.location.reload()}
        className="flex items-center gap-3 mb-10 px-2 cursor-pointer group"
      >
        <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
          <Wallet size={18} className="text-black" />
        </div>
        <h1 className="text-xl font-bold text-white tracking-tighter group-hover:text-slate-300 transition-colors">
          FinSage
        </h1>
      </div>

      <div className="flex-1 space-y-2">
        <SidebarItem icon={LayoutDashboard} label="Dashboard" to="/" />
        <SidebarItem icon={BarChart3} label="Analytics" to="/analytics" />
        <SidebarItem icon={TrendingUp} label="Transactions" to="/transactions" />
        <SidebarItem icon={Target} label="Budgets" to="/budgets" />
        <SidebarItem icon={HandCoins} label="Borrows" to="/borrows" />
        <SidebarItem icon={Bell} label="Notifications" to="/notifications" badge={unreadNotifications} />
        <SidebarItem icon={Calendar} label="Calendar" to="/calendar" />
        <SidebarItem icon={BrainCircuit} label="AI Insights" to="/ai-insights" />
      </div>

      <div className="pt-6 border-t border-white/5 space-y-2">
        <SidebarItem icon={Settings} label="Settings" to="/settings" />
        <SidebarItem 
          icon={LogOut} 
          label="Logout" 
          onClick={() => {
            dispatch(logout());
          }} 
        />
      </div>
    </div>
  );
};

export default Sidebar;
