import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../services/api';

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
  const [selectedBranch, setSelectedBranch] = useState(null);
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
          // Initialize selectedBranch for admins or meter users with no branch assigned
          // (both can switch between branches)
          if (userData.role === 'admin' || ((userData.role === 'meter_user' || userData.role === 'capturer') && !userData.branch)) {
            const storedBranch = localStorage.getItem('selectedBranch');
            setSelectedBranch(storedBranch || userData.branch || 'JHB');
          }
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
    if (userWith2FA.role === 'admin' || ((userWith2FA.role === 'meter_user' || userWith2FA.role === 'capturer') && !userWith2FA.branch)) {
      const storedBranch = localStorage.getItem('selectedBranch');
      setSelectedBranch(storedBranch || userWith2FA.branch || 'JHB');
    }
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
    setSelectedBranch(null);
    navigate('/login');
  };

  // Only admins have full access
  const isAdmin = user?.role === 'admin';
  
  // Check if user is a meter user
  const isMeterUser = user?.role === 'meter_user';
  // Check if user is a capturer (capture-only)
  const isCapturer = user?.role === 'capturer';
  
  // Get the effective branch: 
  // - For admins: use selectedBranch (can switch)
  // - For meter users with no branch assigned: use selectedBranch (can switch)
  // - For meter users with branch assigned: use their assigned branch (cannot switch)
  const canSwitchBranches = isAdmin || ((isMeterUser || isCapturer) && !user?.branch);
  const effectiveBranch = canSwitchBranches ? (selectedBranch || 'JHB') : (user?.branch || null);
  
  // Helper to update selectedBranch and persist to localStorage
  const updateSelectedBranch = (branch) => {
    if (canSwitchBranches) {
      setSelectedBranch(branch);
      localStorage.setItem('selectedBranch', branch);
    }
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      loginWith2FA,
      refreshUser,
      logout, 
      isAdmin,
      isMeterUser,
      isCapturer,
      selectedBranch,
      setSelectedBranch,
      effectiveBranch,
      updateSelectedBranch
    }}>
      {children}
    </AuthContext.Provider>
  );
};
