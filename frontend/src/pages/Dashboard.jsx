import { useEffect, useState, useCallback } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../AuthContext";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import SpendingChart from "../components/SpendingChart";

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const { logout } = useAuth();

  // Promise.all fires the three requests in PARALLEL, not sequentially.
  const load = useCallback(async () => {
    const [a, b, c] = await Promise.all([
      apiFetch("/expenses"),
      apiFetch("/expenses/summary/by-category"),
      apiFetch("/expenses/summary/by-month"),
    ]);
    if (a.ok) setExpenses(await a.json());
    if (b.ok) setByCategory(await b.json());
    if (c.ok) setByMonth(await c.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    load();
  }

  const totalExpenses = expenses
    .filter((e) => e.kind === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);
  const totalIncome = expenses
    .filter((e) => e.kind === "income")
    .reduce((s, e) => s + Number(e.amount), 0);

  return (
    <main className="dashboard">
      <header className="topbar">
        <h1>Finance Tracker</h1>
        <button className="ghost" onClick={logout}>Log out</button>
      </header>

      <section className="totals">
        <div className="total-card income">
          <span>Income</span>
          <strong>₱{totalIncome.toFixed(2)}</strong>
        </div>
        <div className="total-card expense">
          <span>Expenses</span>
          <strong>₱{totalExpenses.toFixed(2)}</strong>
        </div>
        <div className="total-card">
          <span>Net</span>
          <strong>₱{(totalIncome - totalExpenses).toFixed(2)}</strong>
        </div>
      </section>

      <ExpenseForm onAdded={load} />
      <SpendingChart byCategory={byCategory} byMonth={byMonth} />
      {loading
        ? <p className="empty">Loading…</p>
        : <ExpenseList expenses={expenses} onDelete={handleDelete} />}
    </main>
  );
}
