// Reports — charts plus category and monthly breakdowns.
// Uses the existing summary endpoints; no backend changes needed.
import { useEffect, useState } from "react";
import { apiFetch } from "../api";
import SpendingChart from "../components/SpendingChart";
import Navbar from "../components/Navbar";

export default function Reports() {
  const [byCategory, setByCategory] = useState([]);
  const [byMonth, setByMonth] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [a, b] = await Promise.all([
        apiFetch("/expenses/summary/by-category"),
        apiFetch("/expenses/summary/by-month"),
      ]);
      if (a.ok) setByCategory(await a.json());
      if (b.ok) setByMonth(await b.json());
      setLoading(false);
    })();
  }, []);

  const totalSpent = byCategory.reduce((s, c) => s + Number(c.total), 0);
  const catRows = [...byCategory]
    .map((c) => ({ name: c.category, total: Number(c.total) }))
    .sort((a, b) => b.total - a.total);

  const monthLabel = (m) =>
    new Date(`${m}-02`).toLocaleDateString(undefined, { month: "long", year: "numeric" });

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="dashboard">
          <p className="empty">Loading your reports…</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="dashboard">
        <header className="page-head">
          <h1>Reports</h1>
          <p>Where your money goes, month over month.</p>
        </header>

        {catRows.length === 0 && byMonth.length === 0 ? (
          <p className="empty">No data yet. Add a few entries and come back.</p>
        ) : (
          <>
            <SpendingChart byCategory={byCategory} byMonth={byMonth} />

            <div className="report-grid">
              <div className="table-wrap">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Share</th>
                      <th className="num">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {catRows.map((c) => {
                      const pct = totalSpent > 0 ? (c.total / totalSpent) * 100 : 0;
                      return (
                        <tr key={c.name}>
                          <td><span className="tag">{c.name}</span></td>
                          <td>
                            <div className="pct">
                              <span style={{ width: `${pct}%` }} />
                            </div>
                            <small className="pct-num">{pct.toFixed(1)}%</small>
                          </td>
                          <td className="num expense">-₱{c.total.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="table-wrap">
                <table className="expense-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th className="num">Income</th>
                      <th className="num">Expenses</th>
                      <th className="num">Net</th>
                    </tr>
                  </thead>
                  <tbody>
                    {byMonth.map((m) => {
                      const net = Number(m.income) - Number(m.expenses);
                      return (
                        <tr key={m.month}>
                          <td>{monthLabel(m.month)}</td>
                          <td className="num income">+₱{Number(m.income).toFixed(2)}</td>
                          <td className="num expense">-₱{Number(m.expenses).toFixed(2)}</td>
                          <td className="num">₱{net.toFixed(2)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  );
}
