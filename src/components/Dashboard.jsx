// src/components/Dashboard.jsx
import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import BudgetSection from "./BudgetSection";

function Dashboard({ user, onLogout }) {
  const [categories, setCategories] = useState([]);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState("Gasto");
  const [budgetSummary, setBudgetSummary] = useState(null);

  // Cargar categorías
  useEffect(() => {
    const colRef = collection(db, "categories");
    const q = query(colRef, orderBy("name"));
    const unsub = onSnapshot(q, (snap) => {
      setCategories(
        snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }))
      );
    });

    return () => unsub();
  }, []);

  const handleAddCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    try {
      await addDoc(collection(db, "categories"), {
        name,
        type: newCategoryType,
        userId: user?.uid || null,
      });
      setNewCategoryName("");
    } catch (e) {
      console.error("Error agregando categoría:", e);
      alert("Error al agregar categoría");
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
    } catch (e) {
      console.error("Error eliminando categoría:", e);
      alert("Error al eliminar categoría");
    }
  };

  const formatMoney = (v) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
      minimumFractionDigits: 2,
    }).format(v || 0);

  return (
    <div className="dashboard">
      {/* HEADER */}
      <header className="dashboard-header">
        <div>
          
        </div>
        <div className="header-right">
          <span style={{ marginRight: "0.75rem" }}>{user.email}</span>
          <button onClick={onLogout}>sesión</button>
        </div>
      </header>

      <main className="dashboard-grid">
        {/* CATEGORÍAS */}
        <section className="card">
          <h2>Categorías</h2>

          <div
            style={{
              display: "flex",
              gap: "0.5rem",
              marginBottom: "0.75rem",
              flexWrap: "wrap",
            }}
          >
            <input
              type="text"
              placeholder="Nombre de categoría (ej: Sueldo, Supermercado)"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              style={{ flex: 1, minWidth: "220px" }}
            />
            <select
              value={newCategoryType}
              onChange={(e) => setNewCategoryType(e.target.value)}
            >
              <option value="Gasto">Gasto</option>
              <option value="Ingreso">Ingreso</option>
            </select>
            <button onClick={handleAddCategory}>Agregar categoría</button>
          </div>

          {categories.length === 0 ? (
            <p>No hay categorías aún.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat) => (
                  <tr key={cat.id}>
                    <td>{cat.name}</td>
                    <td>{cat.type || "Gasto"}</td>
                    <td>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* PRESUPUESTO MENSUAL */}
        <section className="card">
          <BudgetSection
            user={user}
            categories={categories}
            onSummaryChange={setBudgetSummary}
          />
        </section>

        {/* RESUMEN DEL MES BASADO EN PRESUPUESTO */}
        <section className="card">
          <h2>Resumen del mes (presupuesto)</h2>

          {!budgetSummary ? (
            <p>Cargá montos en el presupuesto para ver el resumen.</p>
          ) : (
            <>
              <p>
                Gastos totales presupuestados:{" "}
                <strong>
                  {formatMoney(budgetSummary.totalGastos)}
                </strong>
              </p>
              <p>
                Pago total (categorías marcadas como pagadas):{" "}
                <strong>
                  {formatMoney(budgetSummary.totalPagado)}
                </strong>
              </p>
              <p>
                Ingresos por sueldos (presupuesto):{" "}
                <strong>
                  {formatMoney(budgetSummary.totalSueldos)}
                </strong>
              </p>
              <p>
                Disponible (sueldos − pagado):{" "}
                <strong>
                  {formatMoney(budgetSummary.disponible)}
                </strong>
              </p>

              <h3 style={{ marginTop: "0.75rem" }}>
                Categorías pendientes de pago
              </h3>
              {budgetSummary.pendientes.length === 0 ? (
                <p>Todo está pagado 👌</p>
              ) : (
                <>
                  <ul>
                    {budgetSummary.pendientes.map((p) => (
                      <li key={p.categoryId}>
                        {p.categoryName}:{" "}
                        {formatMoney(p.amount)}
                      </li>
                    ))}
                  </ul>
                  <p>
                    Total pendiente:{" "}
                    <strong>
                      {formatMoney(budgetSummary.totalPendiente)}
                    </strong>
                  </p>
                </>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default Dashboard;
