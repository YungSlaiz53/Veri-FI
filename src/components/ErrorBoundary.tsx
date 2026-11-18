import React from 'react';

interface State {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message || 'An unexpected application error occurred.' };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#07080D] text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-lg w-full bg-[#0D101B] border border-white/10 rounded-2xl p-8 space-y-4">
            <h1 className="text-xl font-semibold text-white">Application Recovery</h1>
            <p className="text-sm text-slate-300 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="px-4 py-2.5 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
            >
              Reload Veri-Fi
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
