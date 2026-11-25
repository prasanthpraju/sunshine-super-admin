import React from 'react';

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
      message: error.message || 'An unexpected application error occurred.',
    };
  }

  override componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Sunshine School Super Admin ErrorBoundary caught error:', error, info.componentStack);
  }

  private handleReset = () => {
    this.setState({ hasError: false, message: '' });
  };

  override render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
          <div
            role="alert"
            className="max-w-lg w-full bg-white border border-slate-200 rounded-xl p-6 space-y-4"
          >
            <h1 className="text-lg font-semibold text-slate-900">
              Application Error
            </h1>
            <p className="text-sm text-slate-600 break-words">
              {this.state.message}
            </p>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
              >
                Try Again
              </button>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors"
              >
                Reload Console
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
