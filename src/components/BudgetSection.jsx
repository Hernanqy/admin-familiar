// src/components/BudgetSection.jsx
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const getCurrentMonth = () => {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${month}`; // formato 2025-11
};

// Une categorías que vienen de Firestore con lo que haya guardado en el presupuesto
const mergeCategoriesWithBudget = (categories, budgetItems) => {
  const byCategoryId = {};
  budgetItems.forEach((item) => {
    byCategoryId[item.categoryId] = item;
  });

  return categories.map((cat) => {
    const existing = byCategoryId[cat.id] || {};
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      type: cat.type, // "Gasto" o "Ingreso"
      amount: existing.amount || 0,
      paid: existing.paid || false,
    };
  });
};

function BudgetSection({ user, categories }) {
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const budgetDocId = `${user.uid}_${selectedMonth}`; // un doc por usuario+mes

  // Cargar presupuesto al cambiar mes o categorías
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "monthlyBudgets", budgetDocId);
        const snap = await getDoc(ref);

        if (snap.exists()) {
          const data = snap.data();
          setItems(mergeCategoriesWithBudget(categories, data.items || []));
        } else {
          setItems(mergeCategoriesWithBudget(categories, []));
        }
      } catch (err) {
        console.error("Error cargando presupuesto:", err);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, selectedMonth, JSON.stringify(categories)]);

  const handleAmountChange = (categoryId, value) => {
    const amount = Number(value) || 0;
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === categoryId ? { ...item, amount } : item
      )
    );
  };

  const handlePaidChange = (categoryId, checked) => {
    setItems((prev) =>
      prev.map((item) =>
        item.categoryId === categoryId ? { ...item, paid: checked } : item
      )
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "monthlyBudgets", budgetDocId);
      await setDoc(ref, {
        userId: user.uid,
        month: selectedMonth,
        items,
      });
      alert("Presupuesto guardado ✅");
    } catch (err) {
      console.error(err);
      alert("Error al guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  };

  // ====== Cálculos de resumen ======
  const summary = useMemo(() => {
    const gastos = items.filter((i) => i.type === "Gasto");
    const ingresosSueldos = items.filter(
      (i) =>
        i.type === "Ingreso" &&
        i.categoryName.toLowerCase().includes("sueldo")
    );

    const totalGastosPresup = gastos.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );

    const totalPagado = gastos
      .filter((i) => i.paid)
      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

    const totalSueldos = ingresosSueldos.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );

    const disponible = totalSueldos - totalPagado;

    const pendientes = gastos.filter(
      (i) => !i.paid && Number(i.amount) > 0
    );

    const totalPendiente = pendientes.reduce(
      (sum, i) => sum + (Number(i.amount) || 0),
      0
    );

    return {
      totalGastosPresup,
      totalPagado,
      totalSueldos,
      disponible,
      pendientes,
      totalPendiente,
    };
  }, [items]);

  const formatMoney = (v) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(v || 0);

  return (
    <div className="card">
      <h2>Presupuesto mensual</h2>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.9rem" }}>
          Mes:&nbsp;
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            style={{
              background: "#020617",
              borderRadius: "8px",
              border: "1px solid #4b5563",
              color: "#e5e7eb",
              padding: "0.2rem 0.4rem",
            }}
          />
        </label>
      </div>

      {loading ? (
        <p>Cargando presupuesto…</p>
      ) : (
        <>
          <table className="table" style={{ marginBottom: "0.75rem" }}>
            <thead>
              <tr>
                <th>Categoría</th>
                <th>Tipo</th>
                <th>Monto</th>
                <th>Pagado</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.categoryId}>
                  <td>{item.categoryName}</td>
                  <td>{item.type}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={item.amount}
                      onChange={(e) =>
                        handleAmountChange(item.categoryId, e.target.value)
                      }
                      style={{
                        width: "100%",
                        background: "#020617",
                        borderRadius: "8px",
                        border: "1px solid #4b5563",
                        color: "#e5e7eb",
                        padding: "0.25rem 0.4rem",
                      }}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={item.paid}
                      onChange={(e) =>
                        handlePaidChange(item.categoryId, e.target.checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar presupuesto"}
          </button>

          {/* Resumen del presupuesto */}
          <div style={{ marginTop: "1rem" }}>
            <h3>Resumen del mes</h3>
            <p>
              Total gastos presupuestados:{" "}
              <strong>{formatMoney(summary.totalGastosPresup)}</strong>
            </p>
            <p>
              Total pagado:{" "}
              <strong>{formatMoney(summary.totalPagado)}</strong>
            </p>
            <p>
              Ingresos por sueldos (presupuesto):{" "}
              <strong>{formatMoney(summary.totalSueldos)}</strong>
            </p>
            <p>
              Disponible (sueldos − pagado):{" "}
              <strong>{formatMoney(summary.disponible)}</strong>
            </p>

            <h4 style={{ marginTop: "0.75rem" }}>
              Categorías pendientes de pago
            </h4>
            {summary.pendientes.length === 0 ? (
              <p>Todo está pagado 👌</p>
            ) : (
              <>
                <ul>
                  {summary.pendientes.map((p) => (
                    <li key={p.categoryId}>
                      {p.categoryName}: {formatMoney(p.amount)}
                    </li>
                  ))}
                </ul>
                <p>
                  Total pendiente:{" "}
                  <strong>{formatMoney(summary.totalPendiente)}</strong>
                </p>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default BudgetSection;
