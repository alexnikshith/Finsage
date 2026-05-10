import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { selectFinanceStats, markNotificationsRead } from '../features/finance/financeSlice';
import { Bell, Info, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import { motion } from 'framer-motion';

const NotificationItem = ({ notification }) => {
  const getIcon = () => {
    switch (notification.type) {
      case 'warning': return <AlertTriangle size={20} className="text-rose-500" />;
      case 'success': return <CheckCircle2 size={20} className="text-emerald-500" />;
      default: return <Info size={20} className="text-blue-500" />;
    }
  };

  return (
    <div className={`p-6 glass-morphism rounded-3xl border transition-all ${notification.read ? 'border-white/5 opacity-60' : 'border-white/20 bg-white/[0.02]'}`}>
      <div className="flex gap-4">
        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
          {getIcon()}
        </div>
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h4 className="font-bold">{notification.title}</h4>
            {!notification.read && <div className="w-2 h-2 bg-emerald-500 rounded-full" />}
          </div>
          <p className="text-sm text-slate-400 leading-relaxed">{notification.message}</p>
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest pt-1">
            {new Date(notification.date).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
};

const Notifications = () => {
  const { notifications } = useSelector(selectFinanceStats);
  const dispatch = useDispatch();

  useEffect(() => {
    // Mark as read when viewing the page
    return () => {
      dispatch(markNotificationsRead());
    };
  }, [dispatch]);

  return (
    <div className="flex-1 p-8 space-y-8 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold">Notifications</h2>
          <p className="text-slate-400">System alerts and financial intelligence updates.</p>
        </div>
        <div className="w-12 h-12 glass-morphism rounded-2xl flex items-center justify-center text-white border border-white/10">
          <Bell size={24} />
        </div>
      </div>

      <div className="max-w-3xl space-y-4">
        {notifications.length === 0 ? (
          <div className="p-12 text-center glass-morphism rounded-[3rem] border border-dashed border-white/10">
            <History size={48} className="mx-auto text-slate-700 mb-4" />
            <p className="text-slate-500 font-medium">No notifications yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {[...notifications].reverse().map(n => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}

        <div className="pt-8 text-center">
          <p className="text-[10px] text-slate-700 font-bold uppercase tracking-[0.3em]">
            Notification History Clear after 30 days
          </p>
        </div>
      </div>
    </div>
  );
};

export default Notifications;
