import {
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from "recharts";

const COLORS = ["#01497c", "#2c7da0", "#61a5c2", "#89c2d9", "#2a6f97", "#a9d6e5"];

const tooltipStyle = {
  background: "#ffffff",
  border: "1px solid #bcd9e7",
  borderRadius: 10,
  boxShadow: "0 12px 36px -14px rgba(1,42,74,0.35)",
  fontFamily: "inherit",
};

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
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={catData}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
                stroke="#ffffff"
                strokeWidth={2}
              >
                {catData.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(v) => `₱${Number(v).toFixed(2)}`}
                contentStyle={tooltipStyle}
              />
              <Legend iconType="circle" iconSize={8} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
      {monthData.length > 0 && (
        <div className="chart">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthData} barGap={4}>
              <CartesianGrid stroke="#d3e4ee" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="month"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#5b7f99", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#5b7f99", fontSize: 12 }}
              />
              <Tooltip
                formatter={(v) => `₱${Number(v).toFixed(2)}`}
                contentStyle={tooltipStyle}
                cursor={{ fill: "rgba(1,42,74,0.05)" }}
              />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Income" fill="#2c7da0" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="Expenses" fill="#61a5c2" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
