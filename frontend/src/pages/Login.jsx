import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { API } from "../api";
import arrow from "../assets/next.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        setError("Invalid email or password.");
        return;
      }
      login(await res.json());
      nav("/");
    } catch {
      setError("Could not reach the server. Is the API running?");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="brand">Finance Tracker</p>
        <h1>Welcome back</h1>
        <p className="tagline">Sign in to pick up where you left off.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} autoComplete="email"
                   onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" value={password} autoComplete="current-password"
                   onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="cta" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"} <img src={arrow} alt="" className="arrow" />
          </button>
        </form>
        <p className="switch">
          <Link to="/forgot-password">Forgot your password?</Link>
        </p>
        <p className="switch">
          No account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
}
