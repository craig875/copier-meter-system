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
      const token = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');
      
      if (token && storedUser) {
        try {
          const response = await authApi.getMe();
          const userData = response.data.user;
          setUser(userData);
          // Initialize selectedBranch for admins or meter users with no branch assigned
          // (both can switch between branches)
          if (userData.role === 'admin' || (userData.role === 'meter_user' && !userData.branch)) {
            const storedBranch = localStorage.getItem('selectedBranch');
            setSelectedBranch(storedBranch || userData.branch || 'JHB');
          }
        } catch (error) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email, password) => {
    const response = await authApi.login({ email, password });
    const { token, user } = response.data;
    
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    setUser(user);
    
    // Initialize selectedBranch for admins or meter users with no branch assigned
    // (both can switch between branches)
    if (user.role === 'admin' || (user.role === 'meter_user' && !user.branch)) {
      const storedBranch = localStorage.getItem('selectedBranch');
      setSelectedBranch(storedBranch || user.branch || 'JHB');
    }
    
    return user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('selectedBranch');
    setUser(null);
    setSelectedBranch(null);
    navigate('/login');
  };

  // Only admins have full access
  const isAdmin = user?.role === 'admin';
  
  // Check if user is a meter user
  const isMeterUser = user?.role === 'meter_user';
  
  // Get the effective branch: 
  // - For admins: use selectedBranch (can switch)
  // - For meter users with no branch assigned: use selectedBranch (can switch)
  // - For meter users with branch assigned: use their assigned branch (cannot switch)
  const canSwitchBranches = isAdmin || (isMeterUser && !user?.branch);
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
      logout, 
      isAdmin,
      isMeterUser,
      selectedBranch,
      setSelectedBranch,
      effectiveBranch,
      updateSelectedBranch
    }}>
      {children}
    </AuthContext.Provider>
  );
};
