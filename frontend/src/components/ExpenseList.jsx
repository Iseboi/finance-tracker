export default function ExpenseList({ expenses, onDelete, filtered }) {
  if (expenses.length === 0) {
    return (
      <p className="empty">
        {filtered
          ? "Nothing matches those filters. Try widening them."
          : "No entries yet. Add your first one on the left."}
      </p>
    );
  }
  return (
    <div className="table-wrap">
      <table className="expense-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Category</th>
            <th>Description</th>
            <th className="num">Amount</th>
            <th aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          {expenses.map((e) => (
            <tr key={e.id}>
              <td>{e.spent_at}</td>
              <td><span className="tag">{e.category}</span></td>
              <td>{e.description || ""}</td>
              <td className={`num ${e.kind}`}>
                {e.kind === "income" ? "+" : "-"}₱{Number(e.amount).toFixed(2)}
              </td>
              <td className="actions">
                <button className="ghost danger" onClick={() => onDelete(e.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
