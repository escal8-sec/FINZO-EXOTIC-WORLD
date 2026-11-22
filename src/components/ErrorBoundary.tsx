import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || 'An unexpected error occurred.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('Application ErrorBoundary caught:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#040B16] text-slate-100 flex items-center justify-center p-6">
          <div className="glass-panel rounded-3xl p-8 max-w-lg w-full text-center space-y-5">
            <div className="w-12 h-12 mx-auto rounded-full bg-amber-400/15 border border-amber-300/30 flex items-center justify-center text-amber-300">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="font-display text-3xl font-semibold text-white">
              Connection Interrupted
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              We encountered a data or permission error while syncing with FINZO EXOTIC WORLD services.
            </p>
            <button
              type="button"
              onClick={() => {
                this.setState({ hasError: false, message: '' });
                window.location.href = '/';
              }}
              className="px-6 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-[#040B16] text-sm font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Return Home
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
