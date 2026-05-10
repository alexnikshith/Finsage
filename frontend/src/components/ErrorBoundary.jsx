import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error("FinSage Application Error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-8 text-center">
          <div className="glass-morphism p-12 rounded-[3rem] border border-white/10 space-y-6 max-w-md">
            <h1 className="text-4xl font-bold tracking-tighter">System Error</h1>
            <p className="text-slate-400">
              Something went wrong in the intelligence engine. We've logged the error.
            </p>
            <button 
              onClick={() => {
                // Only clear the finance state to repair logic, but keep the session
                const userEmail = localStorage.getItem('last_user');
                if (userEmail) {
                   localStorage.removeItem(`finsage_state_${userEmail}`);
                }
                window.location.href = '/';
              }}
              className="bg-white text-black px-8 py-4 rounded-2xl font-bold w-full hover:bg-slate-200 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
            >
              Repair System Logic
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
