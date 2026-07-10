import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';
import { MODULE_CONNECTIVITY } from '../constants/modules';

const AuthContext = createContext(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');

      if (token && storedUser) {
        try {
          const response = await authApi.getMe();
          const userData = response.data.user;
          setUser({ ...userData, twoFactorEnabled: userData.twoFactorEnabled ?? false });
        } catch (error) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const completeLogin = (token, user) => {
    const userWith2FA = { ...user, twoFactorEnabled: user.twoFactorEnabled ?? false };
    sessionStorage.setItem('token', token);
    sessionStorage.setItem('user', JSON.stringify(userWith2FA));
    setUser(userWith2FA);
    // Clear legacy soft-tenancy key if present
    localStorage.removeItem('selectedBranch');
    return userWith2FA;
  };

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const data = response?.data;
    if (data?.requires2FA && data?.tempToken) {
      return { requires2FA: true, tempToken: data.tempToken };
    }
    if (!data?.token || !data?.user) {
      throw new Error('Invalid response from server. Check that the backend is running and CORS is configured.');
    }
    return completeLogin(data.token, data.user);
  };

  const loginWith2FA = async (tempToken, code) => {
    const response = await authApi.verify2FA({ tempToken, code });
    const data = response?.data;
    if (!data?.token || !data?.user) {
      throw new Error('Invalid response from server.');
    }
    return completeLogin(data.token, data.user);
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      const userData = response.data.user;
      const userWith2FA = { ...userData, twoFactorEnabled: userData.twoFactorEnabled ?? false };
      setUser(userWith2FA);
      sessionStorage.setItem('user', JSON.stringify(userWith2FA));
    } catch {
      // Ignore - user might have logged out
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    localStorage.removeItem('selectedBranch');
    setUser(null);
    navigate('/login');
  };

  const isAdmin = user?.role === 'admin';
  const isManager = user?.role === 'manager';
  const isSalesAgent = user?.role === 'sales_agent';
  /** Admin or manager (elevated UI; managers still use `modules` via hasModule) */
  const isElevated = isAdmin || isManager;

  const isMeterUser = user?.role === 'meter_user';
  const isCapturer = user?.role === 'capturer';
  const isViewer = user?.role === 'viewer';

  const hasModule = (moduleKey) => {
    if (user?.role === 'admin') return true;
    const list = user?.modules ?? [];
    return Array.isArray(list) && list.includes(moduleKey);
  };

  const canAccessConnectivity = hasModule(MODULE_CONNECTIVITY);
  const canManageConnectivity =
    isAdmin || (isManager && hasModule(MODULE_CONNECTIVITY));

  /** Always the logged-in user's home branch (hard tenancy). */
  const effectiveBranch = user?.branch || null;

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        loginWith2FA,
        refreshUser,
        logout,
        isAdmin,
        isManager,
        isSalesAgent,
        isElevated,
        isMeterUser,
        isCapturer,
        isViewer,
        canAccessConnectivity,
        canManageConnectivity,
        hasModule,
        effectiveBranch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
