// src/components/BudgetSection.jsx
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const getCurrentMonth = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`; // 2025-11
};

// Une categorías existentes con lo que haya guardado en Firestore
const mergeCategoriesWithBudget = (categories, budgetItems) => {
  const map = {};
  budgetItems.forEach((it) => {
    map[it.categoryId] = it;
  });

  return categories.map((cat) => {
    const existing = map[cat.id] || {};
    return {
      categoryId: cat.id,
      categoryName: cat.name,
      type: cat.type || "Gasto",
      // string vacío mientras no haya valor
      amount:
        existing.amount === 0 || existing.amount
          ? String(existing.amount)
          : "",
      paid: existing.paid || false,
    };
  });
};

function BudgetSection({ user, categories }) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const docId = `${user.uid}_${month}`;

  // Cargar presupuesto cuando cambian mes o categorías
  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "monthlyBudgets", docId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setItems(
            mergeCategoriesWithBudget(categories, data.items || [])
          );
        } else {
          setItems(mergeCategoriesWithBudget(categories, []));
        }
      } catch (e) {
        console.error("Error cargando presupuesto:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.uid, month, JSON.stringify(categories)]);

  // Cambiar monto de una categoría
  const handleAmountChange = (categoryId, value) => {
    // Permitimos string vacío para que no aparezca "0"
    setItems((prev) =>
      prev.map((it) =>
        it.categoryId === categoryId ? { ...it, amount: value } : it
      )
    );
  };

  // Cambiar "pagado" de una categoría
  const handlePaidChange = (categoryId, checked) => {
    setItems((prev) =>
      prev.map((it) =>
        it.categoryId === categoryId ? { ...it, paid: checked } : it
      )
    );
  };

  // Guardar en Firestore
  const handleSave = async () => {
    setSaving(true);
    try {
      const ref = doc(db, "monthlyBudgets", docId);

      // Convertimos amount a número al guardar
      const itemsToSave = items.map((it) => ({
        ...it,
        amount: Number(it.amount) || 0,
      }));

      await setDoc(ref, {
        userId: user.uid,
        month,
        items: itemsToSave,
      });
      alert("Presupuesto guardado ✅");
    } catch (e) {
      console.error(e);
      alert("Error al guardar el presupuesto");
    } finally {
      setSaving(false);
    }
  };

  // Cálculos del resumen
  const summary = useMemo(() => {
    const gastos = items.filter((i) => i.type === "Gasto");

    // ingresos por sueldos (categorías tipo Ingreso con "sueldo" en el nombre)
    const sueldos = items.filter(
      (i) =>
        i.type === "Ingreso" &&
        i.categoryName.toLowerCase().includes("sueldo")
    );

    const totalGastos = gastos.reduce(
      (s, i) => s + (Number(i.amount) || 0),
      0
    );
    const totalPagado = gastos
      .filter((i) => i.paid)
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const totalSueldos = sueldos.reduce(
      (s, i) => s + (Number(i.amount) || 0),
      0
    );

    const disponible = totalSueldos - totalPagado;

    const pendientes = gastos.filter(
      (i) => !i.paid && Number(i.amount) > 0
    );
    const totalPendiente = pendientes.reduce(
      (s, i) => s + (Number(i.amount) || 0),
      0
    );

    return {
      totalGastos,
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
    <div>
      <h2>Presupuesto mensual</h2>

      <div style={{ marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.9rem" }}>
          Mes:&nbsp;
          <input
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value)}
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
              {items.map((it) => (
                <tr
                  key={it.categoryId}
                  style={
                    it.paid
                      ? {
                          backgroundColor: "#022c22",
                          color: "#bbf7d0",
                        }
                      : {}
                  }
                >
                  <td>{it.categoryName}</td>
                  <td>{it.type}</td>
                  <td>
                    <input
                      type="number"
                      min="0"
                      value={it.amount}
                      onChange={(e) =>
                        handleAmountChange(
                          it.categoryId,
                          e.target.value
                        )
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={it.paid}
                      onChange={(e) =>
                        handlePaidChange(
                          it.categoryId,
                          e.target.checked
                        )
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

          <div style={{ marginTop: "1rem" }}>
            <h3>Resumen del mes</h3>
            <p>
              Total gastos presupuestados:{" "}
              <strong>{formatMoney(summary.totalGastos)}</strong>
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
