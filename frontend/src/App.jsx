import React, { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'
import AICoach from './pages/AICoach'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Borrows from './pages/Borrows'
import Notifications from './pages/Notifications'
import Calendar from './pages/Calendar'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import LoginPage from './pages/auth/LoginPage'
import LandingPage from './pages/LandingPage'
import GuestWarningBanner from './components/GuestWarningBanner'
import { startNewMonth, hydrateFinance } from './features/finance/financeSlice'
import api from './services/api'
import ErrorBoundary from './components/ErrorBoundary'
import PremiumGuard from './components/PremiumGuard'

function App() {
  const authState = useSelector(state => state.auth) || {};
  const financeState = useSelector(state => state.finance) || {};
  const { isAuthenticated } = authState;
  const { lastResetMonth } = financeState;
  const dispatch = useDispatch();
  const location = useLocation();

  // Background Cloud Sync Pull & Polling
  useEffect(() => {
    let intervalId = null;

    const syncWithCloud = async () => {
      if (isAuthenticated) {
        // Skip pull if there is an active push in progress to prevent overwriting local state
        if (typeof window !== 'undefined' && window.isFinsageSyncing) {
          return;
        }
        try {
          const response = await api.get('/sync/pull');
          if (response.data?.finance) {
            dispatch(hydrateFinance(response.data.finance));
          }
        } catch (err) {
          console.warn("Cloud pull failed - using local data only");
        }
      }
    };

    // 1. Initial Sync
    syncWithCloud();

    // 2. Sync on Window/Tab Focus
    const handleFocus = () => {
      syncWithCloud();
    };
    window.addEventListener('focus', handleFocus);

    // 3. Periodic Background Sync (every 15 seconds)
    intervalId = setInterval(syncWithCloud, 15000);

    return () => {
      window.removeEventListener('focus', handleFocus);
      if (intervalId) clearInterval(intervalId);
    };
  }, [isAuthenticated, dispatch]);

  // Self-healing Month Watcher
  useEffect(() => {
    const currentMonth = new Date().getMonth();
    // Only trigger if lastResetMonth is a valid number and doesn't match current
    if (typeof lastResetMonth === 'number' && lastResetMonth !== currentMonth) {
      dispatch(startNewMonth());
    }
  }, [lastResetMonth, dispatch]);



  return (
    <div className="flex h-screen bg-black text-white font-['Outfit'] antialiased selection:bg-white selection:text-black">
      {isAuthenticated && location.pathname !== '/login' && <Sidebar />}
      <main className="flex-1 overflow-hidden flex flex-col relative font-['Outfit']">
        {isAuthenticated && authState.user?.isGuest && <GuestWarningBanner />}
        <Routes>
          <Route 
            path="/" 
            element={isAuthenticated ? <Dashboard /> : <LandingPage />} 
          />
          <Route 
            path="/login" 
            element={(!isAuthenticated || authState.user?.isGuest) ? <LoginPage /> : <Navigate to="/" />} 
          />
          <Route
            path="/*"
            element={
              isAuthenticated ? (
                <div className="flex-1 flex overflow-hidden">
                  <Routes>
                    <Route path="/analytics" element={<PremiumGuard featureName="Analytics"><Analytics /></PremiumGuard>} />
                    <Route path="/ai-coach" element={<PremiumGuard featureName="AI Coach"><AICoach /></PremiumGuard>} />
                    <Route path="/transactions" element={<Transactions />} />
                    <Route path="/budgets" element={<Budgets />} />
                    <Route path="/borrows" element={<Borrows />} />
                    <Route path="/notifications" element={<Notifications />} />
                    <Route path="/calendar" element={<Calendar />} />
                    <Route path="/ai-insights" element={<AIInsights />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="*" element={<Navigate to="/" />} />
                  </Routes>
                </div>
              ) : (
                <Navigate to="/" />
              )
            }
          />
        </Routes>
      </main>
    </div>
  )
}

export default App
