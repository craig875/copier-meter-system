import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { authApi } from '../services/api';
import { MODULE_CONNECTIVITY } from '../constants/modules';
import { getAllowedBranches, resolveActiveBranch } from '../utils/branchSelection';

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
  const [activeBranch, setActiveBranch] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const applyActiveBranch = (userData, candidate = null) => {
    const resolved = resolveActiveBranch(userData, candidate);
    setActiveBranch(resolved);
    if (resolved) {
      sessionStorage.setItem('activeBranch', resolved);
    } else {
      sessionStorage.removeItem('activeBranch');
    }
    return resolved;
  };

  useEffect(() => {
    const initAuth = async () => {
      const token = sessionStorage.getItem('token');
      const storedUser = sessionStorage.getItem('user');

      if (token && storedUser) {
        try {
          const response = await authApi.getMe();
          const userData = response.data.user;
          const normalizedUser = {
            ...userData,
            twoFactorEnabled: userData.twoFactorEnabled ?? false,
          };
          setUser(normalizedUser);
          applyActiveBranch(normalizedUser, sessionStorage.getItem('activeBranch'));
        } catch (error) {
          sessionStorage.removeItem('token');
          sessionStorage.removeItem('user');
          sessionStorage.removeItem('activeBranch');
          setActiveBranch(null);
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
    // A new login starts a fresh branch session. Single-branch users are auto-selected.
    sessionStorage.removeItem('activeBranch');
    applyActiveBranch(userWith2FA);
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
      applyActiveBranch(userWith2FA, sessionStorage.getItem('activeBranch'));
    } catch {
      // Ignore - user might have logged out
    }
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('activeBranch');
    localStorage.removeItem('selectedBranch');
    setUser(null);
    setActiveBranch(null);
    queryClient.clear();
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

  const allowedBranches = getAllowedBranches(user);
  const canSwitchBranches = allowedBranches.length > 1;

  const switchBranch = async (branch) => {
    await authApi.switchBranch(branch);
    sessionStorage.setItem('activeBranch', branch);
    setActiveBranch(branch);
    await queryClient.invalidateQueries({ refetchType: 'active' });
    return branch;
  };

  /** Compatibility alias used by existing branch-aware pages and query keys. */
  const effectiveBranch = activeBranch;

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
        allowedBranches,
        activeBranch,
        canSwitchBranches,
        switchBranch,
        effectiveBranch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
