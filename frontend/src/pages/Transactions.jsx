// Transactions — the full ledger with richer filters than the dashboard.
import { useEffect, useMemo, useState, useCallback } from "react";
import { apiFetch } from "../api";
import ExpenseList from "../components/ExpenseList";
import Navbar from "../components/Navbar";

const CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Health", "Other"];

export default function Transactions() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState("all");
  const [filterCat, setFilterCat] = useState("all");
  const [filterMonth, setFilterMonth] = useState("all");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    const res = await apiFetch("/expenses");
    if (res.ok) setExpenses(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id) {
    await apiFetch(`/expenses/${id}`, { method: "DELETE" });
    load();
  }

  const months = useMemo(
    () => [...new Set(expenses.map((e) => e.spent_at.slice(0, 7)))].sort().reverse(),
    [expenses]
  );

  const q = query.trim().toLowerCase();
  const filtered = expenses.filter(
    (e) =>
      (kind === "all" || e.kind === kind) &&
      (filterCat === "all" || e.category === filterCat) &&
      (filterMonth === "all" || e.spent_at.startsWith(filterMonth)) &&
      (q === "" ||
        (e.description || "").toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q))
  );
  const isFiltered =
    kind !== "all" || filterCat !== "all" || filterMonth !== "all" || q !== "";

  const income = filtered
    .filter((e) => e.kind === "income")
    .reduce((s, e) => s + Number(e.amount), 0);
  const spent = filtered
    .filter((e) => e.kind === "expense")
    .reduce((s, e) => s + Number(e.amount), 0);

  const monthLabel = (m) =>
    new Date(`${m}-02`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  return (
    <>
      <Navbar />
      <main className="dashboard">
        <header className="page-head">
          <h1>Transactions</h1>
          <p>{filtered.length} {filtered.length === 1 ? "entry" : "entries"}{isFiltered ? " (filtered)" : ""}</p>
        </header>

        <div className="stat-strip">
          <div className="panel stat">
            <span className="label">Income</span>
            <strong className="pos">+₱{income.toFixed(2)}</strong>
          </div>
          <div className="panel stat">
            <span className="label">Expenses</span>
            <strong className="neg">-₱{spent.toFixed(2)}</strong>
          </div>
          <div className="panel stat">
            <span className="label">Net</span>
            <strong>₱{(income - spent).toFixed(2)}</strong>
          </div>
        </div>

        <div className="ledger-head">
          <div className="chips">
            <button className={`chip ${kind === "all" ? "active" : ""}`} onClick={() => setKind("all")}>All</button>
            <button className={`chip ${kind === "expense" ? "active" : ""}`} onClick={() => setKind("expense")}>Expenses</button>
            <button className={`chip ${kind === "income" ? "active" : ""}`} onClick={() => setKind("income")}>Income</button>
          </div>
          <input
            className="search"
            placeholder="Search description or category"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search"
          />
        </div>

        <div className="ledger-head">
          <div className="chips">
            <button className={`chip ${filterCat === "all" ? "active" : ""}`} onClick={() => setFilterCat("all")}>
              All categories
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
      </main>
    </>
  );
}
