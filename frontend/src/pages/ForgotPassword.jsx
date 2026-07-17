import { useState } from "react";
import { Link } from "react-router-dom";
import { API } from "../api";
import arrow from "../assets/next.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error();
      setSent(true);
    } catch {
      setError("Could not reach the server. Try again in a moment.");
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="auth-wrap">
        <div className="auth-card">
          <p className="brand">Finance Tracker</p>
          <h1>Check your email</h1>
          <p className="tagline">
            If that email is registered, a reset link is on its way. The link
            is valid for 30 minutes.
          </p>
          <p className="switch">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <p className="brand">Finance Tracker</p>
        <h1>Forgot password</h1>
        <p className="tagline">We&rsquo;ll email you a link to set a new one.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} autoComplete="email"
                   onChange={(e) => setEmail(e.target.value)} required />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" className="cta" disabled={busy}>
            {busy ? "Sending…" : "Send reset link"} <img src={arrow} alt="" className="arrow" />
          </button>
        </form>
        <p className="switch">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
