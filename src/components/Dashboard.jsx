// src/components/Dashboard.jsx
import { useEffect, useMemo, useState } from "react";
import CategoryPieChart from "./CategoryPieChart.jsx";

import {
  collection,
  addDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  serverTimestamp,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import ExpenseChart from "./ExpenseChart.jsx";
import CategoryManager from "./CategoryManager.jsx";

function Dashboard({ user }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loadingTx, setLoadingTx] = useState(true);

  // Formulario de movimientos (gastos/ingresos)
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("gasto");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingTxId, setEditingTxId] = useState(null);

  // ========= CATEGORÍAS =========
  useEffect(() => {
    const q = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("type"),
      orderBy("name")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setCategories(list);
    });

    return () => unsub();
  }, [user.uid]);

  const handleCreateCategory = async ({ name, type }) => {
    await addDoc(collection(db, "categories"), {
      userId: user.uid,
      name,
      type, // "gasto" | "ingreso"
      createdAt: serverTimestamp(),
    });
  };

  const handleUpdateCategory = async (id, { name, type }) => {
    await updateDoc(doc(db, "categories", id), {
      name,
      type,
    });
  };

  const handleDeleteCategory = async (id) => {
    if (!window.confirm("¿Eliminar esta categoría?")) return;
    await deleteDoc(doc(db, "categories", id));
  };

  // ========= MOVIMIENTOS =========
  useEffect(() => {
    const q = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setTransactions(list);
      setLoadingTx(false);
    });

    return () => unsub();
  }, [user.uid]);

  const resetTxForm = () => {
    setDescription("");
    setAmount("");
    setType("gasto");
    setCategoryId("");
    setDate(new Date().toISOString().slice(0, 10));
    setEditingTxId(null);
  };

  const handleSubmitTx = async (e) => {
    e.preventDefault();
    if (!description.trim() || !amount || !date) return;

    const cat = categories.find((c) => c.id === categoryId) || null;

    const payload = {
      userId: user.uid,
      description: description.trim(),
      type, // gasto | ingreso
      categoryId: cat ? cat.id : null,
      categoryName: cat ? cat.name : null,
      amount: Number(amount),
      date,
      createdAt: serverTimestamp(),
    };

    try {
      if (editingTxId) {
        await updateDoc(doc(db, "transactions", editingTxId), payload);
      } else {
        await addDoc(collection(db, "transactions"), payload);
      }
      resetTxForm();
    } catch (error) {
      console.error(error);
      alert("Error al guardar el movimiento");
    }
  };

  const handleEditTx = (tx) => {
    setEditingTxId(tx.id);
    setDescription(tx.description || "");
    setAmount(tx.amount?.toString() || "");
    setType(tx.type || "gasto");
    setCategoryId(tx.categoryId || "");
    setDate(tx.date || new Date().toISOString().slice(0, 10));
  };

  const handleDeleteTx = async (id) => {
    if (!window.confirm("¿Eliminar este movimiento?")) return;
    await deleteDoc(doc(db, "transactions", id));
  };

  // ========= ESTADÍSTICAS =========

  const totalGastos = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "gasto")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    [transactions]
  );

  const totalIngresos = useMemo(
    () =>
      transactions
        .filter((t) => t.type === "ingreso")
        .reduce((sum, t) => sum + (t.amount || 0), 0),
    [transactions]
  );

  const balance = totalIngresos - totalGastos;

  // gastos del mes actual para el gráfico
  const currentMonth = new Date().toISOString().slice(0, 7); // "YYYY-MM"
  const expensesThisMonth = useMemo(
    () =>
      transactions.filter(
        (t) => t.type === "gasto" && (t.date || "").slice(0, 7) === currentMonth
      ),
    [transactions, currentMonth]
  );

  const availableCategoriesForType = categories.filter(
    (c) => c.type === type
  );

  return (
    <div className="dashboard">
      {/* Columna izquierda: categorías + formulario */}
      <div className="dashboard-left">
        <CategoryManager
          categories={categories}
          onCreate={handleCreateCategory}
          onUpdate={handleUpdateCategory}
          onDelete={handleDeleteCategory}
        />

        <section className="card">
          <h2>Registrar movimiento</h2>
          <form className="expense-form" onSubmit={handleSubmitTx}>
            <input
              type="text"
              placeholder="Descripción (ej: Supermercado, Sueldo)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Monto"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <select value={type} onChange={(e) => setType(e.target.value)}>
              <option value="gasto">Gasto</option>
              <option value="ingreso">Ingreso</option>
            </select>

            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
            >
              <option value="">Sin categoría</option>
              {availableCategoriesForType.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />

            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button type="submit">
                {editingTxId ? "Actualizar movimiento" : "Guardar movimiento"}
              </button>
              {editingTxId && (
                <button type="button" onClick={resetTxForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      {/* Columna derecha: resumen + gráficos + listado */}
      <div className="dashboard-right">
        <section className="card">
          <h2>Resumen</h2>
          <p>
            Total ingresos: <strong>${totalIngresos.toFixed(2)}</strong>
          </p>
          <p>
            Total gastos: <strong>${totalGastos.toFixed(2)}</strong>
          </p>
          <p>
            Balance:{" "}
            <strong style={{ color: balance >= 0 ? "#4ade80" : "#f87171" }}>
              ${balance.toFixed(2)}
            </strong>
          </p>
        </section>

        <section className="card">
          <h2>Gastos del mes por categoría</h2>
          <ExpenseChart expenses={expensesThisMonth} />
        </section>

        <section className="card">
          <h2>Listado de movimientos</h2>
          {loadingTx ? (
            <p>Cargando...</p>
          ) : transactions.length === 0 ? (
            <p>Sin movimientos aún.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Categoría</th>
                  <th>Descripción</th>
                  <th>Monto</th>
                  <th style={{ textAlign: "right" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{t.date}</td>
                    <td>{t.type === "gasto" ? "Gasto" : "Ingreso"}</td>
                    <td>{t.categoryName || "-"}</td>
                    <td>{t.description}</td>
                    <td>
                      {t.type === "gasto" ? "-" : "+"}${" "}
                      {t.amount?.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <button onClick={() => handleEditTx(t)}>Editar</button>
                      <button
                        style={{ marginLeft: "0.5rem" }}
                        onClick={() => handleDeleteTx(t.id)}
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
      </div>
    </div>
  );
}

export default Dashboard;
