import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useSelector, useDispatch } from 'react-redux'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Transactions from './pages/Transactions'
import Budgets from './pages/Budgets'
import Borrows from './pages/Borrows'
import Notifications from './pages/Notifications'
import Calendar from './pages/Calendar'
import AIInsights from './pages/AIInsights'
import Settings from './pages/Settings'
import LoginPage from './pages/auth/LoginPage'
import ErrorBoundary from './components/ErrorBoundary'
import { startNewMonth } from './features/finance/financeSlice'

function App() {
  const authState = useSelector(state => state.auth) || {};
  const financeState = useSelector(state => state.finance) || {};
  const { isAuthenticated } = authState;
  const { lastResetMonth } = financeState;
  const dispatch = useDispatch();

  // Self-healing Month Watcher
  useEffect(() => {
    const currentMonth = new Date().getMonth();
    // Only trigger if lastResetMonth is a valid number and doesn't match current
    if (typeof lastResetMonth === 'number' && lastResetMonth !== currentMonth) {
      dispatch(startNewMonth());
    }
  }, [lastResetMonth, dispatch]);

  return (
    <Router>
      <div className="flex h-screen bg-black text-white font-['Outfit'] antialiased selection:bg-white selection:text-black">
        {isAuthenticated && <Sidebar />}
        <main className="flex-1 overflow-hidden flex flex-col relative">
          <Routes>
            <Route 
              path="/login" 
              element={!isAuthenticated ? <LoginPage /> : <Navigate to="/" />} 
            />
            <Route
              path="/*"
              element={
                isAuthenticated ? (
                  <div className="flex-1 flex overflow-hidden">
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/budgets" element={<Budgets />} />
                      <Route path="/borrows" element={<Borrows />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/calendar" element={<Calendar />} />
                      <Route path="/ai-insights" element={<AIInsights />} />
                      <Route path="/history" element={<Transactions />} />
                      <Route path="/settings" element={<Settings />} />
                    </Routes>
                  </div>
                ) : (
                  <Navigate to="/login" />
                )
              }
            />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
