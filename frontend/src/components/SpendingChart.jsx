import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#1f5c45", "#a4432c", "#2e4a6b", "#8a6d1f", "#5e4a7d", "#555555"];

export default function SpendingChart({ byCategory, byMonth }) {
  const catData = byCategory.map((c) => ({
    name: c.category,
    value: Number(c.total),
  }));
  const monthData = byMonth.map((m) => ({
    month: m.month,
    Expenses: Number(m.expenses),
    Income: Number(m.income),
  }));

  if (catData.length === 0 && monthData.length === 0) return null;

  return (
    <section className="charts">
      {catData.length > 0 && (
        <div className="chart">
          <h2>Spending by category</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={catData} dataKey="value" nameKey="name"
                   outerRadius={90} label>
                {catData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {monthData.length > 0 && (
        <div className="chart">
          <h2>Income vs expenses by month</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip formatter={(v) => `₱${Number(v).toFixed(2)}`} />
              <Legend />
              <Bar dataKey="Income" fill="#1f5c45" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Expenses" fill="#a4432c" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
