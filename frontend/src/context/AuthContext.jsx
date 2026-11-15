import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  authApi,
  SEED_USERS,
  DEFAULT_SEED_PASSWORD,
  RBAC_MATRIX,
  TOKEN_STORAGE_KEY,
  USER_STORAGE_KEY,
} from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(USER_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch (_e) {
      return null;
    }
  });

  const [token, setToken] = useState(() => {
    return localStorage.getItem(TOKEN_STORAGE_KEY) || null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user && token) {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_STORAGE_KEY, token);
    }
  }, [user, token]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const response = await authApi.login({ email, password });
      const { user: loggedUser, token: jwtToken } = response.data;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(loggedUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, jwtToken);
      setUser(loggedUser);
      setToken(jwtToken);
      return loggedUser;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setToken(null);
  };

  /**
   * Cambia en 1 clic entre cualquiera de los 6 roles operativos RBAC de El Salvador
   * autenticándose contra el backend real (o fallback en memoria si no hay servidor).
   */
  const switchRoleDemo = async (rolObjetivo) => {
    const normalizedRol = String(rolObjetivo || '').toUpperCase().trim();
    const targetAccount =
      SEED_USERS.find((u) => u.rol === normalizedRol) || SEED_USERS[0];

    try {
      const response = await authApi.login({
        email: targetAccount.email,
        password: DEFAULT_SEED_PASSWORD,
      });
      const { user: switchedUser, token: switchedToken } = response.data;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(switchedUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, switchedToken);
      setUser(switchedUser);
      setToken(switchedToken);
      return switchedUser;
    } catch (_err) {
      const fallbackToken = `demo-jwt-sv-${targetAccount.rol.toLowerCase()}-${Date.now()}`;
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(targetAccount));
      localStorage.setItem(TOKEN_STORAGE_KEY, fallbackToken);
      setUser(targetAccount);
      setToken(fallbackToken);
      return targetAccount;
    }
  };

  const hasRole = (...rolesPermitidos) => {
    if (!user || !user.rol) return false;
    const flatRoles = rolesPermitidos.flat();
    return flatRoles.includes(user.rol);
  };

  const currentRolePermits = useMemo(() => {
    if (!user?.rol) return null;
    return RBAC_MATRIX[user.rol] || null;
  }, [user]);

  const value = useMemo(
    () => ({
      user,
      token,
      loading,
      isAuthenticated: Boolean(user && token),
      login,
      logout,
      switchRoleDemo,
      hasRole,
      currentRolePermits,
      seedUsers: SEED_USERS,
      rbacMatrix: RBAC_MATRIX,
    }),
    [user, token, loading, currentRolePermits]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
};

export default AuthContext;
