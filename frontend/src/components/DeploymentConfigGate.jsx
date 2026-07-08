/**
 * Shown in production when VITE_API_URL was not set at build time.
 * Vite inlines env vars during `npm run build` — changing Vercel vars requires a redeploy.
 */
export default function DeploymentConfigGate({ children }) {
  const missingApiUrl = import.meta.env.PROD && !import.meta.env.VITE_API_URL;

  if (!missingApiUrl) {
    return children;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black p-6">
      <div className="max-w-lg w-full popup-panel p-6 space-y-4">
        <h1 className="text-xl font-bold text-amber-400">Frontend not configured for production</h1>
        <p className="text-gray-300 text-sm">
          This build has no <code className="text-amber-200">VITE_API_URL</code>, so API calls will not reach your backend.
        </p>
        <div className="text-sm text-gray-400 space-y-2">
          <p className="font-medium text-gray-300">On your server (repo root):</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Create or edit <code className="text-gray-300">deploy.env</code> (copy from{' '}
              <code className="text-gray-300">deploy.env.example</code>)
            </li>
            <li>
              Set <code className="text-gray-300">VITE_API_URL</code> to your public site URL
              (e.g. <code className="text-gray-300">https://your-domain.com</code>) — no trailing slash, no{' '}
              <code className="text-gray-300">/api</code>
            </li>
            <li>Run <code className="text-gray-300">./scripts/deploy.sh</code> or push to main to redeploy via GitHub Actions</li>
          </ul>
          <p className="font-medium text-gray-300 pt-2">In <code className="text-gray-300">backend/.env</code> on the server:</p>
          <ul className="list-disc list-inside space-y-1">
            <li>
              Set <code className="text-gray-300">FRONTEND_URL</code> to the same public URL users open in the browser
            </li>
          </ul>
        </div>
        <a
          href="/login"
          className="inline-block px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
