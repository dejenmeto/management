import { createContext, useContext, useEffect, useState } from "react";

import { apiRequest } from "../services/api";

// Shared authentication context.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Restore the token after a page refresh in the same tab.
  const [token, setToken] = useState(() =>
    sessionStorage.getItem("company_auth_token"),
  );

  // User information returned by the backend.
  const [user, setUser] = useState(null);

  // Avoid showing protected pages before checking the token.
  const [loading, setLoading] = useState(() =>
    Boolean(sessionStorage.getItem("company_auth_token")),
  );

  // When the app starts, verify any previously saved token.
  useEffect(() => {
    let cancelled = false;

    async function loadCurrentUser() {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      setLoading(true);

      try {
        const result = await apiRequest("/auth/me", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setUser(result.data);
        }
      } catch (error) {
        if (!cancelled) {
          // An expired or invalid token must not remain active.
          sessionStorage.removeItem("company_auth_token");
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCurrentUser();

    // Prevent updates if this effect is cleaned up.
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Send credentials to the backend and save the returned JWT.
  async function login(email, password) {
    const result = await apiRequest("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    sessionStorage.setItem("company_auth_token", result.token);

    setUser(result.data);
    setToken(result.token);

    return result;
  }

  // Register an ordinary user through the backend.
  async function register(name, email, password) {
    return apiRequest("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });
  }

  // Clear the browser's authentication session.
  function logout() {
    sessionStorage.removeItem("company_auth_token");
    setToken(null);
    setUser(null);
  }

  const value = {
    user,
    token,
    loading,
    isAuthenticated: Boolean(user && token),
    login,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Custom hook used by components to access authentication.
export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider.");
  }

  return context;
}
