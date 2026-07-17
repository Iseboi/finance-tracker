import { useState } from "react";
import { apiFetch } from "../api";
import arrow from "../assets/next.png";

const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Health", "Other"];

export default function ExpenseForm({ onAdded }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    amount: "",
    category: "Food",
    description: "",
    kind: "expense",
    spent_at: today,
  });
  const [error, setError] = useState("");

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await apiFetch("/expenses", {
      method: "POST",
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    });
    if (!res.ok) {
      setError("Could not save. Amount must be greater than zero.");
      return;
    }
    setForm({ ...form, amount: "", description: "" });
    onAdded();
  }

  return (
    <form className="expense-form" onSubmit={handleSubmit}>
      <div className="seg" role="radiogroup" aria-label="Type">
        <button
          type="button"
          className={form.kind === "expense" ? "active" : ""}
          onClick={() => setForm({ ...form, kind: "expense" })}
        >
          Expense
        </button>
        <button
          type="button"
          className={form.kind === "income" ? "active" : ""}
          onClick={() => setForm({ ...form, kind: "income" })}
        >
          Income
        </button>
      </div>
      <input
        type="number"
        step="0.01"
        min="0.01"
        placeholder="Amount (₱)"
        value={form.amount}
        onChange={set("amount")}
        required
      />
      {form.kind === "expense" && (
        <select value={form.category} onChange={set("category")} aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      )}
      <input
        placeholder="Description (optional)"
        value={form.description}
        onChange={set("description")}
      />
      <input type="date" value={form.spent_at} onChange={set("spent_at")} required />
      <button type="submit" className="cta">Add entry <img src={arrow} alt="" className="arrow" /></button>
      {error && <p className="error">{error}</p>}
    </form>
  );
}
