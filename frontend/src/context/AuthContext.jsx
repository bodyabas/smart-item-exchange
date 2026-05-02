import { createContext, useContext, useMemo, useState } from "react";

import { api } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("access_token"));
  const [user, setUser] = useState(null);

  const isAuthenticated = Boolean(token);

  const saveToken = (accessToken) => {
    localStorage.setItem("access_token", accessToken);
    setToken(accessToken);
  };

  const login = async (payload) => {
    const response = await api.post("/auth/login", payload);
    saveToken(response.data.access_token);
    setUser(response.data.user);
    return response.data;
  };

  const register = async (payload) => {
    const response = await api.post("/auth/register", payload);
    saveToken(response.data.access_token);
    setUser(response.data.user);
    return response.data;
  };

  const loadUser = async () => {
    const response = await api.get("/users/me");
    setUser(response.data.user);
    return response.data.user;
  };

  const logout = () => {
    localStorage.removeItem("access_token");
    setToken(null);
    setUser(null);
  };

  const value = useMemo(
    () => ({
      isAuthenticated,
      token,
      user,
      login,
      register,
      loadUser,
      logout,
    }),
    [isAuthenticated, token, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return value;
}
