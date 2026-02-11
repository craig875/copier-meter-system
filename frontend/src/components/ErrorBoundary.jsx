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
        <div className="min-h-screen flex items-center justify-center bg-gray-100 p-6">
          <div className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6">
            <h1 className="text-xl font-bold text-red-600 mb-2">Something went wrong</h1>
            <p className="text-gray-700 mb-4 font-mono text-sm break-all">
              {this.state.error?.message || String(this.state.error)}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Check that VITE_API_URL is set to your backend URL in Vercel, and FRONTEND_URL matches your Vercel URL in Railway.
            </p>
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
