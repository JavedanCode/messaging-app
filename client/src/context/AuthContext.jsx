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

  console.log("[AuthContext] render:", {
    user,
    loading,
    isAuthenticated: Boolean(user),
  });

  useEffect(() => {
    async function restoreSession() {
      if (restorePromiseRef.current) {
        return restorePromiseRef.current;
      }

      restorePromiseRef.current = (async () => {
        console.log("[AuthContext] restoreSession started");

        try {
          console.log("[AuthContext] requesting /auth/me");

          const response = await getCurrentUser();

          console.log("[AuthContext] /auth/me succeeded", response.user);

          setUser(response.user);
        } catch (error) {
          console.log("[AuthContext] /auth/me failed:", error.message);

          try {
            console.log("[AuthContext] attempting session refresh");

            await refreshSession();

            console.log("[AuthContext] refresh succeeded");

            const response = await getCurrentUser();

            console.log(
              "[AuthContext] /auth/me after refresh succeeded",
              response.user,
            );

            setUser(response.user);
          } catch (refreshError) {
            console.log(
              "[AuthContext] SESSION RESTORE FAILED:",
              refreshError.message,
            );

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
