import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import logo from '../assets/logo.png';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, loginWith2FA } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/';
  const show2FAStep = !!tempToken;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (show2FAStep) {
        await loginWith2FA(tempToken, code);
        toast.success('Login successful');
        navigate(from, { replace: true });
      } else {
        const result = await login(email, password);
        if (result?.requires2FA && result?.tempToken) {
          setTempToken(result.tempToken);
          setCode('');
          toast.success('Enter your 6-digit code');
        } else {
          toast.success('Login successful');
          navigate(from, { replace: true });
        }
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center px-4"
      style={{ 
        backgroundImage: 'linear-gradient(135deg, rgb(226 232 240), rgb(241 245 249), rgb(228 231 235))'
      }}
    >
      <div className="max-w-md w-full">
        <div className="liquid-glass rounded-2xl p-8" style={{ boxShadow: '0 1px 0 0 rgba(255,255,255,0.5) inset, 0 24px 48px rgba(0,0,0,0.12)' }}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4">
              <img src={logo} alt="Pancom" className="h-16 w-auto" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Systems</h1>
            <p className="text-gray-500 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {show2FAStep ? (
              <>
                <p className="text-sm text-gray-600">Enter the 6-digit code from your authenticator app.</p>
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-2">
                    Verification Code
                  </label>
                  <input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    maxLength={6}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all text-center text-lg tracking-widest"
                    placeholder="000000"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setTempToken(null)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ← Back to sign in
                </button>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading || (show2FAStep && code.length !== 6)}
              className="w-full bg-red-600 text-white py-3 rounded-lg font-medium hover:bg-red-700 focus:ring-4 focus:ring-red-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (show2FAStep ? 'Verifying...' : 'Signing in...') : (show2FAStep ? 'Verify' : 'Sign In')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
