import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../services/api';
import toast from 'react-hot-toast';
import { Shield, ShieldCheck, ShieldOff } from 'lucide-react';

const SecuritySettings = () => {
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState({ enabled: false });
  const [loading, setLoading] = useState(true);
  const [setupLoading, setSetupLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [disableLoading, setDisableLoading] = useState(false);

  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [code, setCode] = useState('');
  const [disablePassword, setDisablePassword] = useState('');

  const fetchStatus = async () => {
    try {
      const res = await authApi.get2FAStatus();
      setStatus(res.data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to load 2FA status');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleSetup = async () => {
    setSetupLoading(true);
    try {
      const res = await authApi.setup2FA();
      setQrCode(res.data.qrCode);
      setSecret(res.data.secret);
      setCode('');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to start 2FA setup');
    } finally {
      setSetupLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    if (!secret || code.length !== 6) return;
    setVerifyLoading(true);
    try {
      await authApi.verify2FASetup({ code, secret });
      toast.success('2FA enabled successfully');
      setQrCode(null);
      setSecret(null);
      setCode('');
      await refreshUser();
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid code. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleCancelSetup = () => {
    setQrCode(null);
    setSecret(null);
    setCode('');
  };

  const handleDisable = async (e) => {
    e.preventDefault();
    if (!disablePassword) return;
    setDisableLoading(true);
    try {
      await authApi.disable2FA({ password: disablePassword });
      toast.success('2FA disabled successfully');
      setDisablePassword('');
      fetchStatus();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setDisableLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-xl font-semibold text-gray-800 mb-6">Two-Factor Authentication</h2>

      <div className="liquid-glass rounded-xl p-6 mb-6" style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.5) inset, 0 12px 24px rgba(0,0,0,0.08)' }}>
        <div className="flex items-center gap-4 mb-4">
          {status.enabled ? (
            <ShieldCheck className="h-8 w-8 text-green-600" />
          ) : (
            <ShieldOff className="h-8 w-8 text-gray-400" />
          )}
          <div>
            <p className="font-medium text-gray-800">
              {status.enabled ? '2FA is enabled' : '2FA is disabled'}
            </p>
            <p className="text-sm text-gray-500">
              {status.enabled
                ? 'Your account is protected with an authenticator app.'
                : 'Add an extra layer of security to your account.'}
            </p>
          </div>
        </div>

        {!status.enabled && !qrCode && (
          <button
            onClick={handleSetup}
            disabled={setupLoading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <Shield className="h-4 w-4" />
            {setupLoading ? 'Setting up...' : 'Enable 2FA'}
          </button>
        )}

        {!status.enabled && qrCode && secret && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.):
            </p>
            <div className="flex gap-6 items-start">
              <img src={qrCode} alt="QR Code" className="w-40 h-40 rounded-lg border border-gray-200" />
              <div className="text-sm text-gray-500">
                <p className="font-medium text-gray-700 mb-1">Or enter manually:</p>
                <code className="block bg-gray-100 px-2 py-1 rounded break-all font-mono text-xs">
                  {secret}
                </code>
              </div>
            </div>
            <form onSubmit={handleVerifySetup} className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Enter the 6-digit code from your app to verify:
              </label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                maxLength={6}
                className="w-40 px-3 py-2 border border-gray-300 rounded-lg text-center text-lg tracking-widest"
                placeholder="000000"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={verifyLoading || code.length !== 6}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {verifyLoading ? 'Verifying...' : 'Verify & Enable'}
                </button>
                <button
                  type="button"
                  onClick={handleCancelSetup}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {status.enabled && (
          <form onSubmit={handleDisable} className="space-y-3 mt-4">
            <label className="block text-sm font-medium text-gray-700">
              Enter your password to disable 2FA:
            </label>
            <input
              type="password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Your password"
            />
            <button
              type="submit"
              disabled={disableLoading || !disablePassword}
              className="inline-flex items-center gap-2 px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              <ShieldOff className="h-4 w-4" />
              {disableLoading ? 'Disabling...' : 'Disable 2FA'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default SecuritySettings;
