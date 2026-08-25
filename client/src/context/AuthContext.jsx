import { createContext, useContext, useEffect, useRef, useState } from "react";

import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
  register as registerRequest,
  resendEmailVerification,
  verifyEmail,
} from "../api/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const restorePromiseRef = useRef(null);

  useEffect(() => {
    async function restoreSession() {
      if (restorePromiseRef.current) {
        return restorePromiseRef.current;
      }

      restorePromiseRef.current = (async () => {
        try {
          const response = await getCurrentUser();

          setUser(response.user);
        } catch (error) {
          try {
            await refreshSession();

            const response = await getCurrentUser();

            setUser(response.user);
          } catch (refreshError) {
            setUser(null);
          }
        } finally {
          setLoading(false);
        }
      })();

      return restorePromiseRef.current;
    }

    restoreSession();
  }, []);

  async function login(credentials) {
    await loginRequest(credentials);

    const response = await getCurrentUser();

    setUser(response.user);

    return response.user;
  }

  async function register(data) {
    const response = await registerRequest(data);

    return response.user;
  }

  async function logout() {
    await logoutRequest();

    setUser(null);
  }

  async function verifyUserEmail(data) {
    return verifyEmail(data);
  }

  async function resendVerificationEmail(email) {
    return resendEmailVerification(email);
  }

  function updateAuthenticatedUser(updates) {
    setUser((currentUser) =>
      currentUser ? { ...currentUser, ...updates } : currentUser,
    );
  }
  async function refreshUser() {
    const response = await getCurrentUser();

    setUser(response.user);

    return response.user;
  }

  const value = {
    user,
    loading,
    isAuthenticated: Boolean(user),

    login,
    register,
    logout,

    verifyEmail: verifyUserEmail,
    resendVerificationEmail,

    updateAuthenticatedUser,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider.");
  }

  return context;
}
