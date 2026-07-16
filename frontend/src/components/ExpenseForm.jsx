import { useState } from "react";
import { apiFetch } from "../api";

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
      <select value={form.kind} onChange={set("kind")} aria-label="Type">
        <option value="expense">Expense</option>
        <option value="income">Income</option>
      </select>
      <input type="number" step="0.01" min="0.01" placeholder="Amount (₱)"
             value={form.amount} onChange={set("amount")} required />
      <select value={form.category} onChange={set("category")} aria-label="Category">
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <input placeholder="Description (optional)"
             value={form.description} onChange={set("description")} />
      <input type="date" value={form.spent_at} onChange={set("spent_at")} required />
      <button type="submit">Add entry</button>
      {error && <p className="error span-all">{error}</p>}
    </form>
  );
}
