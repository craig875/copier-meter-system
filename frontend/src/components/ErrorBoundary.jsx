import { Component } from 'react';

/**
 * Catches React errors and shows them instead of a white screen.
 * Helps debug deployment issues.
 */
export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App error:', error, errorInfo);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-black p-6">
          <div className="max-w-lg w-full popup-panel p-6">
            <h1 className="text-xl font-bold text-red-400 mb-2">Something went wrong</h1>
            <p className="text-gray-300 mb-4 font-mono text-sm break-all">
              {this.state.error?.message || String(this.state.error)}
            </p>
            {import.meta.env.PROD && (
              <p className="text-xs text-gray-600 mb-2 font-mono break-all">
                API: {import.meta.env.VITE_API_URL || '(VITE_API_URL not set at build time)'}
              </p>
            )}
            {import.meta.env.PROD ? (
              <p className="text-sm text-gray-500 mb-4">
                Production: set <code className="text-gray-400">VITE_API_URL</code> in{' '}
                <code className="text-gray-400">deploy.env</code> on the server, then redeploy.
              </p>
            ) : (
              <p className="text-sm text-gray-500 mb-4">
                Local dev: start the backend on port 3001 (<code className="text-gray-400">node src/app.js</code> in{' '}
                <code className="text-gray-400">backend/</code>). No <code className="text-gray-400">VITE_API_URL</code> needed.
              </p>
            )}
            <button
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Back to Login
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
