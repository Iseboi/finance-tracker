// Monthly budget with a pacing bar. The budget lives in localStorage —
// no backend change needed.
import { useState } from "react";

export default function BudgetBar({ spent }) {
  const [budget, setBudget] = useState(
    () => Number(localStorage.getItem("monthly_budget")) || 0
  );
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  function save(e) {
    e.preventDefault();
    const val = Math.max(0, Number(draft) || 0);
    localStorage.setItem("monthly_budget", String(val));
    setBudget(val);
    setEditing(false);
  }

  const pct = budget > 0 ? Math.min((spent / budget) * 100, 100) : 0;
  const over = budget > 0 && spent > budget;
  const left = budget - spent;

  return (
    <div className="budget-card">
      <div className="budget-head">
        <span className="label">This month&rsquo;s budget</span>
        <button
          className="link"
          onClick={() => {
            setDraft(budget || "");
            setEditing(!editing);
          }}
        >
          {editing ? "Cancel" : budget ? "Edit" : "Set budget"}
        </button>
      </div>
      {editing ? (
        <form className="budget-edit" onSubmit={save}>
          <input
            type="number"
            min="0"
            step="0.01"
            placeholder="Amount (₱)"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <button type="submit">Save</button>
        </form>
      ) : budget > 0 ? (
        <>
          <strong className="budget-figure">
            ₱{spent.toFixed(2)} <span>of ₱{budget.toFixed(2)}</span>
          </strong>
          <div className={`progress ${over ? "over" : ""}`}>
            <span style={{ width: `${pct}%` }} />
          </div>
          <p className={`budget-note ${over ? "over" : ""}`}>
            {over
              ? `₱${Math.abs(left).toFixed(2)} over. It happens.`
              : `₱${left.toFixed(2)} left to spend.`}
          </p>
        </>
      ) : (
        <p className="budget-note">Set a monthly budget to see how you&rsquo;re pacing.</p>
      )}
    </div>
  );
}
