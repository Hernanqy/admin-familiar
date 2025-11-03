// src/components/Dashboard.jsx
import { useEffect, useState } from "react";
import { auth, db } from "../firebaseConfig";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import ExpenseChart from "./ExpenseChart";
import BudgetSection from "./BudgetSection";

function Dashboard({ user }) {
  const [categories, setCategories] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryType, setCategoryType] = useState("Gasto");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [loading, setLoading] = useState(true);

  // ================== CARGAR DATOS ===================
  useEffect(() => {
    if (!user) return;

    // Escuchar categorías
    const q1 = query(
      collection(db, "categories"),
      where("userId", "==", user.uid),
      orderBy("name")
    );
    const unsub1 = onSnapshot(q1, (snap) => {
      setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    // Escuchar movimientos
    const q2 = query(
      collection(db, "transactions"),
      where("userId", "==", user.uid),
      orderBy("date", "desc")
    );
    const unsub2 = onSnapshot(q2, (snap) => {
      setTransactions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      setLoading(false);
    });

    return () => {
      unsub1();
      unsub2();
    };
  }, [user]);

  // ================== AGREGAR CATEGORÍA ===================
  const addCategory = async (e) => {
    e.preventDefault();
    if (!categoryName) return;
    await addDoc(collection(db, "categories"), {
      name: categoryName,
      type: categoryType,
      userId: user.uid,
    });
    setCategoryName("");
  };

  // ================== AGREGAR MOVIMIENTO ===================
  const addTransaction = async (e) => {
    e.preventDefault();
    if (!amount || !categoryId) return;
    const cat = categories.find((c) => c.id === categoryId);
    await addDoc(collection(db, "transactions"), {
      userId: user.uid,
      categoryId,
      categoryName: cat.name,
      type: cat.type,
      amount: Number(amount),
      description,
      date: new Date().toISOString(),
    });
    setAmount("");
    setDescription("");
    setCategoryId("");
  };

  // ================== ELIMINAR MOVIMIENTO ===================
  const deleteTransaction = async (id) => {
    if (confirm("¿Eliminar este movimiento?")) {
      await deleteDoc(doc(db, "transactions", id));
    }
  };

  // ================== CALCULOS RESUMEN ===================
  const totalGastos = transactions
    .filter((t) => t.type === "Gasto")
    .reduce((sum, t) => sum + t.amount, 0);
  const totalIngresos = transactions
    .filter((t) => t.type === "Ingreso")
    .reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIngresos - totalGastos;

  const formatMoney = (v) =>
    new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: "ARS",
    }).format(v || 0);

  const logout = async () => {
    await signOut(auth);
  };

  // ================== RENDER ===================
  return (
    <div className="dashboard app">
      <header className="header">
        <h1>Admin Familia</h1>
        <div className="user-info">
          <span>{user.email}</span>
          <button onClick={logout}>Salir</button>
        </div>
      </header>

      <div className="dashboard-left">
        {/* ==== CATEGORÍAS ==== */}
        <section className="card">
          <h2>Categorías</h2>
          <form onSubmit={addCategory} className="expense-form">
            <input
              type="text"
              placeholder="Nombre de categoría"
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              required
            />
            <select
              value={categoryType}
              onChange={(e) => setCategoryType(e.target.value)}
            >
              <option value="Gasto">Gasto</option>
              <option value="Ingreso">Ingreso</option>
            </select>
            <button type="submit">Agregar categoría</button>
          </form>
          <ul style={{ marginTop: "1rem" }}>
            {categories.map((cat) => (
              <li key={cat.id}>
                {cat.name} ({cat.type})
              </li>
            ))}
          </ul>
        </section>

        {/* ==== MOVIMIENTOS ==== */}
        <section className="card">
          <h2>Registrar movimiento</h2>
          <form onSubmit={addTransaction} className="expense-form">
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.type})
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Importe"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Descripción (opcional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <button type="submit">Agregar movimiento</button>
          </form>
        </section>
      </div>

      <div className="dashboard-right">
        {/* ==== RESUMEN ==== */}
        <section className="card">
          <h2>Resumen actual</h2>
          <p>Total ingresos: {formatMoney(totalIngresos)}</p>
          <p>Total gastos: {formatMoney(totalGastos)}</p>
          <p>
            Balance:{" "}
            <strong
              style={{ color: balance >= 0 ? "#22c55e" : "#ef4444" }}
            >
              {formatMoney(balance)}
            </strong>
          </p>
        </section>

        {/* ==== GRÁFICO ==== */}
        <section className="card">
          <h2>Gastos por categoría</h2>
          <ExpenseChart
            expenses={transactions.filter((t) => t.type === "Gasto")}
          />
        </section>

        {/* ==== LISTADO DE MOVIMIENTOS ==== */}
        <section className="card">
          <h2>Listado de movimientos</h2>
          {loading ? (
            <p>Cargando...</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Categoría</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                  <th>Descripción</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((t) => (
                  <tr key={t.id}>
                    <td>{new Date(t.date).toLocaleDateString()}</td>
                    <td>{t.categoryName}</td>
                    <td>{t.type}</td>
                    <td>{formatMoney(t.amount)}</td>
                    <td>{t.description}</td>
                    <td>
                      <button onClick={() => deleteTransaction(t.id)}>
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        {/* ==== NUEVA SECCIÓN: PRESUPUESTO MENSUAL ==== */}
        <BudgetSection user={user} categories={categories} />
      </div>
    </div>
  );
}

export default Dashboard;
