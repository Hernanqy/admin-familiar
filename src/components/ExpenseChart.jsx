// src/components/ExpenseChart.jsx
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function ExpenseChart({ expenses }) {
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
    <div className="chart-container">
      <BarChart width={400} height={250} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        {/* sin color personalizado por las reglas del entorno */}
        <Bar dataKey="total" />
      </BarChart>
    </div>
  );
}

export default ExpenseChart;
