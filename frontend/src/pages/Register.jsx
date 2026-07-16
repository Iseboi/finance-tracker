import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../AuthContext";
import { API } from "../api";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (res.status === 409) {
        setError("That email is already registered.");
        return;
      }
      if (!res.ok) {
        setError("Registration failed. Check your details.");
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
        <h1>Create account</h1>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} autoComplete="email"
                   onChange={(e) => setEmail(e.target.value)} required />
          </label>
          <label>
            Password <span className="hint">(min. 8 characters)</span>
            <input type="password" value={password} autoComplete="new-password"
                   onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>
        <p className="switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
