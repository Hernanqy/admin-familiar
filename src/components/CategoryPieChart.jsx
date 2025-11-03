// src/components/CategoryPieChart.jsx
import { PieChart, Pie, Tooltip, Legend, Cell } from "recharts";

const COLORS = [
  "#60a5fa",
  "#34d399",
  "#f97316",
  "#f87171",
  "#a78bfa",
  "#f472b6",
  "#22d3ee",
  "#4ade80",
];

function CategoryPieChart({ expenses }) {
  // Agrupar por categoría
  const data = Object.entries(
    expenses.reduce((acc, e) => {
      const cat = e.categoryName || "Sin categoría";
      acc[cat] = (acc[cat] || 0) + (e.amount || 0);
      return acc;
    }, {})
  ).map(([name, total]) => ({ name, total }));

  if (data.length === 0) {
    return <p>No hay datos suficientes para el gráfico.</p>;
  }

  return (
    <div className="chart-container" style={{ display: "flex", justifyContent: "center" }}>
      <PieChart width={380} height={260}>
        <Pie
          data={data}
          dataKey="total"
          nameKey="name"
          cx="50%"
          cy="50%"
          outerRadius={90}
          label
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
            />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </div>
  );
}

export default CategoryPieChart;
