import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../api";
import { useAuth } from "../AuthContext";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import SpendingChart from "../components/SpendingChart";
import BudgetBar from "../components/BudgetBar";
import Navbar from "../components/Navbar";

const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Health", "Other"];

export default function Dashboard() {
  const [expenses, setExpenses] = useState([]);
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
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
  const net = totalIncome - totalExpenses;

  const months = useMemo(
    () => [...new Set(expenses.map((e) => e.spent_at.slice(0, 7)))].sort().reverse(),
    [expenses]
  );
  const filtered = expenses.filter(
    (e) =>
      (filterCat === "all" || e.category === filterCat) &&
      (filterMonth === "all" || e.spent_at.startsWith(filterMonth))
  );
  const isFiltered = filterCat !== "all" || filterMonth !== "all";

  const thisMonth = new Date().toISOString().slice(0, 7);
  const spentThisMonth = expenses
    .filter((e) => e.kind === "expense" && e.spent_at.startsWith(thisMonth))
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthLabel = (m) =>
    new Date(`${m}-02`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <Navbar />
      <main className="dashboard">

      <section className="hero">
        <div>
          <span className="label">Net balance</span>
          <strong className={`net ${net < 0 ? "negative" : ""}`}>₱{net.toFixed(2)}</strong>
        </div>
        <div className="hero-stats">
          <div>
            <span className="label">Income</span>
            <em className="income">+₱{totalIncome.toFixed(2)}</em>
          </div>
          <div>
            <span className="label">Expenses</span>
            <em className="expense">-₱{totalExpenses.toFixed(2)}</em>
          </div>
        </div>
        <BudgetBar spent={spentThisMonth} />
      </section>

      <div className="columns">
        <aside className="rail">
          <section className="panel">
            <ExpenseForm onAdded={load} />
          </section>
        </aside>

        <div>
          <SpendingChart byCategory={byCategory} byMonth={byMonth} />

          <section className="ledger">
            <div className="ledger-head">
              <div className="chips">
                <button
                  className={`chip ${filterCat === "all" ? "active" : ""}`}
                  onClick={() => setFilterCat("all")}
                >
                  All
                </button>
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={`chip ${filterCat === c ? "active" : ""}`}
                    onClick={() => setFilterCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <select
                value={filterMonth}
                onChange={(e) => setFilterMonth(e.target.value)}
                aria-label="Filter by month"
              >
                <option value="all">All months</option>
                {months.map((m) => (
                  <option key={m} value={m}>{monthLabel(m)}</option>
                ))}
              </select>
            </div>
            {loading ? (
              <p className="empty">Loading your entries…</p>
            ) : (
              <ExpenseList expenses={filtered} onDelete={handleDelete} filtered={isFiltered} />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
