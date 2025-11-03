// src/components/BudgetSection.jsx
import { useEffect, useState } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const getCurrentMonth = () => {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};

// Estilo base botón principal
const saveButtonBaseStyle = {
  marginTop: "0.75rem",
  padding: "0.7rem 1.4rem",
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

// Botón secundario (mostrar/ocultar)
const secondaryButtonStyle = {
  padding: "0.5rem 1rem",
  borderRadius: "999px",
  border: "1px solid #4b5563",
  background: "transparent",
  color: "#e5e7eb",
  fontSize: "0.85rem",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
};

// Card de resumen
const summaryCardStyle = {
  padding: "0.9rem 1rem",
  borderRadius: "0.9rem",
  border: "1px solid #1f2937",
  background:
    "radial-gradient(circle at top left, rgba(52,211,153,0.12), transparent 55%), #020617",
  boxShadow: "0 10px 25px -15px rgba(15,118,110,0.7)",
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
      type: normalizedType,
      amount:
        existing.amount === 0 || existing.amount
          ? String(existing.amount)
          : "",
      paid: existing.paid || false,
    };
  });
};

// Calcula totales a partir de una lista de ítems
const calcSummary = (items) => {
  const gastos = items.filter(
    (i) => String(i.type).toLowerCase() === "gasto"
  );

  const sueldos = items.filter(
    (i) =>
      String(i.type).toLowerCase() === "ingreso" &&
      i.categoryName.toLowerCase().includes("sueldo")
  );

  
  
  const totalPagado = gastos
    .filter((i) => i.paid)
    .reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const totalSueldos = sueldos.reduce(
    (s, i) => s + (Number(i.amount) || 0),
    0
  );

  const disponible = totalSueldos - totalPagado;

  const pendientes = gastos.filter((i) => !i.paid);
  const totalPendiente = pendientes.reduce(
    (s, i) => s + (Number(i.amount) || 0),
    0
  );

  return {
    totalPagado,
    disponible,
    pendientes,
    totalPendiente,
  };
};

const formatMoney = (v) =>
  new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    minimumFractionDigits: 2,
  }).format(v || 0);

const formatDate = (isoString) => {
  if (!isoString) return "sin guardar aún";
  const d = new Date(isoString);
  return d.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

function BudgetSection({ user, categories }) {
  const [month, setMonth] = useState(getCurrentMonth);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showCategories, setShowCategories] = useState(true);

  // Resumen basado en el ÚLTIMO guardado
  const [savedSummary, setSavedSummary] = useState(
    calcSummary([])
  );
  const [lastSavedAt, setLastSavedAt] = useState(null);

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
          const merged = mergeCategoriesWithBudget(
            categories,
            data.items || []
          );
          setItems(merged);

          // Resumen + fecha del documento
          setSavedSummary(calcSummary(merged));
          setLastSavedAt(data.updatedAt || null);
        } else {
          const merged = mergeCategoriesWithBudget(categories, []);
          setItems(merged);
          setSavedSummary(calcSummary(merged));
          setLastSavedAt(null);
        }
      } catch (e) {
        console.error("Error cargando presupuesto:", e);
      } finally {
        setLoading(false);
      }
    };

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      alert(
        "No hay usuario autenticado. Iniciá sesión para guardar el presupuesto."
      );
      return;
    }

    setSaving(true);
    try {
      const ref = doc(db, "monthlyBudgets", docId);

      const itemsToSave = items.map((it) => ({
        ...it,
        amount: Number(it.amount) || 0,
      }));

      const nowIso = new Date().toISOString();

      await setDoc(ref, {
        userId: user.uid,
        month,
        items: itemsToSave,
        updatedAt: nowIso,
      });

      // Actualizamos resumen y fecha SOLO cuando se guarda
      setSavedSummary(calcSummary(itemsToSave));
      setLastSavedAt(nowIso);

      alert("Presupuesto guardado en la base de datos ✅");
    } catch (e) {
      console.error("Error al guardar el presupuesto:", e);
      alert(
        "Error al guardar el presupuesto. Revisá la consola para más detalles."
      );
    } finally {
      setSaving(false);
    }
  };

  const isSaveDisabled = saving || loading || !items.length;
  const summary = savedSummary;

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "1rem",
      }}
    >
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.75rem",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.75rem",
        }}
      >
        <h2 style={{ margin: 0 }}>Presupuesto mensual</h2>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <label style={{ fontSize: "0.9rem" }}>
            Mes:&nbsp;
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </label>

          <button
            type="button"
            onClick={() =>
              setShowCategories((prev) => !prev)
            }
            style={secondaryButtonStyle}
          >
            {showCategories ? "Ocultar categorías" : "Ver categorías"}
          </button>
        </div>
      </div>

      {loading ? (
        <p>Cargando presupuesto…</p>
      ) : (
        <>
          {showCategories && (
            <div
              style={{
                width: "100%",
                overflowX: "auto",
                marginBottom: "0.75rem",
              }}
            >
              <table
                className="table"
                style={{
                  width: "100%",
                  minWidth: "600px",
                  borderCollapse: "collapse",
                }}
              >
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
                          style={{ width: "100%" }}
                        />
                      </td>
                      <td style={{ textAlign: "center" }}>
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
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={isSaveDisabled}
            style={{
              ...saveButtonBaseStyle,
              width: "100%",
              maxWidth: "320px",
              opacity: isSaveDisabled ? 0.6 : 1,
              cursor: isSaveDisabled ? "not-allowed" : "pointer",
            }}
          >
            <span>
              {saving
                ? "Guardando presupuesto..."
                : "💾 Guardar presupuesto"}
            </span>
            {!saving && (
              <span
                style={{ fontSize: "0.75rem", opacity: 0.9 }}
              >
                Se almacenará en la base de datos y actualizará
                tus registros
              </span>
            )}
          </button>

          {/* RESUMEN SIMPLE: 2 CARTELITOS */}
<div
  style={{
    marginTop: "1.25rem",
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))",
    gap: "1rem",
  }}
>
  {/* TOTAL PAGADO */}
  <div
    style={{
      ...summaryCardStyle,
      background:
        "linear-gradient(135deg, rgba(37,99,235,0.25), rgba(147,51,234,0.15))",
      border: "1px solid rgba(59,130,246,0.4)",
      boxShadow: "0 10px 25px -12px rgba(59,130,246,0.3)",
      color: "#e0e7ff",
    }}
  >
    <div
      style={{
        fontSize: "0.8rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        opacity: 0.85,
        marginBottom: "0.2rem",
      }}
    >
      💸 Total pagado hasta
    </div>
    <div
      style={{
        fontSize: "0.85rem",
        opacity: 0.8,
        marginBottom: "0.35rem",
      }}
    >
      {formatDate(lastSavedAt)}
    </div>
    <div
      style={{
        fontSize: "1.6rem",
        fontWeight: 700,
      }}
    >
      {formatMoney(summary.totalPagado)}
    </div>
  </div>

  {/* DINERO DISPONIBLE */}
  <div
    style={{
      ...summaryCardStyle,
      background:
        "linear-gradient(135deg, rgba(34,197,94,0.25), rgba(21,128,61,0.15))",
      border: "1px solid rgba(34,197,94,0.4)",
      boxShadow: "0 10px 25px -12px rgba(34,197,94,0.3)",
      color: "#dcfce7",
    }}
  >
    <div
      style={{
        fontSize: "0.8rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        opacity: 0.85,
        marginBottom: "0.2rem",
      }}
    >
      💰 Dinero disponible hasta
    </div>
    <div
      style={{
        fontSize: "0.85rem",
        opacity: 0.8,
        marginBottom: "0.35rem",
      }}
    >
      {formatDate(lastSavedAt)}
    </div>
    <div
      style={{
        fontSize: "1.6rem",
        fontWeight: 700,
      }}
    >
      {formatMoney(summary.disponible)}
    </div>
  </div>
</div>


          {/* CATEGORÍAS PENDIENTES (basado en último guardado) */}
          <div style={{ marginTop: "1.25rem" }}>
            <h4 style={{ marginBottom: "0.4rem" }}>
              Categorías pendientes de pago
            </h4>
            {summary.pendientes.length === 0 ? (
              <p>No hay categorías de gastos pendientes de pago 👌</p>
            ) : (
              <>
                <ul>
                  {summary.pendientes.map((p) => (
                    <li key={p.categoryId}>
                      {p.categoryName}:{" "}
                      {formatMoney(p.amount)}
                    </li>
                  ))}
                </ul>
                <p>
                  Total pendiente:{" "}
                  <strong>
                    {formatMoney(summary.totalPendiente)}
                  </strong>
                </p>
              </>
            )}
          </div>
        </>
      )}
      {/* FOOTER */}
      
<footer
  style={{
    marginTop: "2rem",
    padding: "1.5rem 0",
    borderTop: "1px solid rgba(255,255,255,0.08)",
    textAlign: "center",
    fontSize: "0.85rem",
    color: "#9ca3af",
    letterSpacing: "0.05em",
    background:
      "linear-gradient(180deg, rgba(2,6,23,0.6), rgba(0,0,0,0.7))",
  }}
>
  <p style={{ margin: 0 }}>
    <strong style={{ color: "#22c55e" }}>NexuraVR</strong> &nbsp;|&nbsp;
    División <span style={{ color: "#38bdf8" }}>AI</span>
  </p>
  <p style={{ margin: "0.25rem 0 0", opacity: 0.7 }}>
    © {new Date().getFullYear()} Todos los derechos reservados
  </p>
</footer>

    </div>
  );
}

export default BudgetSection;
