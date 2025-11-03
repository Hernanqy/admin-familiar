// src/components/BudgetSection.jsx
import { useEffect, useMemo, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const getCurrentMonth = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

const saveButtonBaseStyle = {
  marginTop: "0.75rem",
  padding: "0.6rem 1.3rem",
  borderRadius: "999px",
  border: "none",
  background: "linear-gradient(135deg, #16a34a, #22c55e)",
  color: "#f9fafb",
  fontWeight: 600,
  fontSize: "0.95rem",
  display: "inline-flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: "0.15rem",
  boxShadow: "0 10px 15px -3px rgba(34, 197, 94, 0.4)",
  cursor: "pointer",
  transition: "transform 0.1s ease, box-shadow 0.1s ease, opacity 0.1s ease",
};

const mergeCategoriesWithBudget = (categories, budgetItems) => {
  const map = {};
  budgetItems.forEach((it) => {
    map[it.categoryId] = it;
  });

  return categories.map((cat) => {
    const existing = map[cat.id] || {};

    // Normalizamos el tipo a "gasto" / "ingreso"
    const rawType = cat.type || existing.type || "Gasto";
    const t = String(rawType).toLowerCase();
    const normalizedType = t === "ingreso" ? "ingreso" : "gasto";

    return {
      categoryId: cat.id,
      categoryName: cat.name,
      type: normalizedType, // <- ahora siempre "gasto" o "ingreso" en minúscula
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

  const docId = user ? `${user.uid}_${month}` : "";

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      setLoading(true);
      try {
        const ref = doc(db, "monthlyBudgets", docId);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const data = snap.data();
          setItems(mergeCategoriesWithBudget(categories, data.items || []));
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
  }, [user?.uid, month, JSON.stringify(categories)]);

  const handleAmountChange = (categoryId, value) => {
    setItems((prev) =>
      prev.map((it) =>
        it.categoryId === categoryId ? { ...it, amount: value } : it
      )
    );
  };

  const handlePaidChange = (categoryId, checked) => {
    setItems((prev) =>
      prev.map((it) =>
        it.categoryId === categoryId ? { ...it, paid: checked } : it
      )
    );
  };

  const handleSave = async () => {
    if (!user) {
      alert("No hay usuario autenticado. Iniciá sesión para guardar el presupuesto.");
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, "monthlyBudgets", docId);

      const itemsToSave = items.map((it) => ({
        ...it,
        amount: Number(it.amount) || 0,
      }));

      await setDoc(ref, {
        userId: user.uid,
        month,
        items: itemsToSave,
      });

      alert("Presupuesto guardado en la base de datos ✅");
    } catch (e) {
      console.error("Error al guardar el presupuesto:", e);
      alert("Error al guardar el presupuesto. Revisá la consola para más detalles.");
    } finally {
      setSaving(false);
    }
  };

  // 🔥 ACÁ ESTÁ EL CAMBIO IMPORTANTE
  const summary = useMemo(() => {
    // Usamos type en minúscula siempre
    const gastos = items.filter(
      (i) => String(i.type).toLowerCase() === "gasto"
    );

    const sueldos = items.filter(
      (i) =>
        String(i.type).toLowerCase() === "ingreso" &&
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

    const disponiblePresupuestado = totalSueldos - totalGastos;
    const disponibleReal = totalSueldos - totalPagado;

    const pendientes = gastos.filter((i) => !i.paid);

    const totalPendiente = pendientes.reduce(
      (s, i) => s + (Number(i.amount) || 0),
      0
    );

    return {
      totalGastos,
      totalPagado,
      totalSueldos,
      disponiblePresupuestado,
      disponibleReal,
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

  const isSaveDisabled = saving || loading || !items.length;

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
                        handleAmountChange(it.categoryId, e.target.value)
                      }
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={it.paid}
                      onChange={(e) =>
                        handlePaidChange(it.categoryId, e.target.checked)
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            style={{
              ...saveButtonBaseStyle,
              opacity: isSaveDisabled ? 0.6 : 1,
              cursor: isSaveDisabled ? "not-allowed" : "pointer",
            }}
          >
            <span>
              {saving ? "Guardando presupuesto..." : "💾 Guardar presupuesto"}
            </span>
            {!saving && (
              <span style={{ fontSize: "0.75rem", opacity: 0.9 }}>
                Se almacenará en la base de datos y actualizará tus registros
              </span>
            )}
          </button>

          <div style={{ marginTop: "1rem" }}>
            <h3>Resumen del mes</h3>
            <p>
              Gastos totales presupuestados:{" "}
              <strong>{formatMoney(summary.totalGastos)}</strong>
            </p>
            <p>
              Pago total:{" "}
              <strong>{formatMoney(summary.totalPagado)}</strong>
            </p>
            <p>
              Ingresos por sueldos (presupuesto):{" "}
              <strong>{formatMoney(summary.totalSueldos)}</strong>
            </p>
            <p>
              Disponible presupuestado (sueldos − gastos):{" "}
              <strong>{formatMoney(summary.disponiblePresupuestado)}</strong>
            </p>
            <p>
              Disponible real (sueldos − pagado):{" "}
              <strong>{formatMoney(summary.disponibleReal)}</strong>
            </p>

            <h4 style={{ marginTop: "0.75rem" }}>
              Categorías pendientes de pago
            </h4>
            {summary.pendientes.length === 0 ? (
              <p>No hay categorías de gastos pendientes de pago 👌</p>
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
