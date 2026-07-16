// Auth state shared app-wide via React Context — avoids "prop drilling".
// Local state (form inputs) stays in components; only truly global state
// (am I logged in?) lives here.
import { createContext, useContext, useState } from "react";
import { saveTokens, clearTokens } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loggedIn, setLoggedIn] = useState(
    () => !!localStorage.getItem("access_token")
  );

  const login = (tokens) => {
    saveTokens(tokens);
    setLoggedIn(true);
  };

  const logout = () => {
    clearTokens();
    setLoggedIn(false);
  };

  return (
    <AuthContext.Provider value={{ loggedIn, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
