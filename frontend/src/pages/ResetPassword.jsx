import { useState } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
import { API } from "../api";

export default function ResetPassword() {
  // useSearchParams reads the query string — this is how the token
  // travels from the emailed link into this page.
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, new_password: password }),
      });
      if (!res.ok) {
        setError("This reset link is invalid or has expired. Request a new one.");
        return;
      }
      nav("/login");
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="brand">Finance Tracker</p>
          <h1>Invalid link</h1>
          <p>
            This page needs a reset token.{" "}
            <Link to="/forgot-password">Request a new link</Link>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="brand">Finance Tracker</p>
        <h1>Choose a new password</h1>
        <form onSubmit={handleSubmit}>
          <label>
            New password <span className="hint">(min. 8 characters)</span>
            <input type="password" value={password} autoComplete="new-password"
                   onChange={(e) => setPassword(e.target.value)} required />
          </label>
          <label>
            Confirm new password
            <input type="password" value={confirm} autoComplete="new-password"
                   onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={busy}>
            {busy ? "Saving…" : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
