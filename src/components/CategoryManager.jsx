
// src/components/CategoryManager.jsx
import { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

function CategoryManager({ user }) {
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [type, setType] = useState("Gasto");
  const [loading, setLoading] = useState(false);
  const [showCategories, setShowCategories] = useState(true);

  // Cargar categorías desde Firestore
  const loadCategories = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const snap = await getDocs(collection(db, "categories"));
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      // filtramos por usuario
      setCategories(data.filter((c) => c.userId === user.uid));
    } catch (e) {
      console.error("Error cargando categorías:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [user]);

  const addCategory = async () => {
    if (!newCategory.trim()) {
      alert("Ingresá un nombre de categoría");
      return;
    }
    if (!user) return;

    try {
      await addDoc(collection(db, "categories"), {
        name: newCategory.trim(),
        type: type.toLowerCase(), // "gasto" / "ingreso"
        userId: user.uid,
      });
      setNewCategory("");
      await loadCategories();
    } catch (e) {
      console.error("Error al agregar categoría:", e);
    }
  };

  const deleteCategory = async (id) => {
    if (!window.confirm("¿Eliminar esta categoría?")) return;
    try {
      await deleteDoc(doc(db, "categories", id));
      await loadCategories();
    } catch (e) {
      console.error("Error eliminando categoría:", e);
    }
  };

  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        marginTop: "1.5rem",
        backgroundColor: "#020617",
        borderRadius: "1rem",
        padding: "1.5rem",
        boxShadow: "0 10px 25px -15px rgba(56,189,248,0.4)",
        color: "#e2e8f0",
      }}
    >
      {/* TÍTULO + BOTÓN OCULTAR */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <h2
          style={{
            margin: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
          }}
        >
          📁 Categorías
        </h2>

        <button
          type="button"
          onClick={() => setShowCategories((prev) => !prev)}
          style={{
            background: showCategories
              ? "linear-gradient(135deg, #334155, #1e293b)"
              : "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "white",
            border: "none",
            borderRadius: "999px",
            padding: "0.35rem 0.9rem",
            fontWeight: 500,
            fontSize: "0.85rem",
            cursor: "pointer",
            transition: "0.2s",
          }}
        >
          {showCategories ? "Ocultar lista" : "Mostrar lista"}
        </button>
      </div>

      {/* FORMULARIO ALTA CATEGORÍA */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        <input
          type="text"
          placeholder="Nombre de categoría (ej: Sueldo, Supermercado)"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{
            flex: "1 1 250px",
            padding: "0.45rem 0.6rem",
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#f1f5f9",
          }}
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value)}
          style={{
            borderRadius: "8px",
            border: "1px solid #334155",
            background: "#0f172a",
            color: "#f1f5f9",
            padding: "0.45rem",
          }}
        >
          <option value="Gasto">Gasto</option>
          <option value="Ingreso">Ingreso</option>
        </select>
        <button
          onClick={addCategory}
          style={{
            background: "linear-gradient(135deg, #22c55e, #16a34a)",
            color: "white",
            border: "none",
            borderRadius: "8px",
            padding: "0.45rem 1rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "0.2s",
          }}
          onMouseOver={(e) =>
            (e.target.style.background =
              "linear-gradient(135deg, #16a34a, #15803d)")
          }
          onMouseOut={(e) =>
            (e.target.style.background =
              "linear-gradient(135deg, #22c55e, #16a34a)")
          }
        >
          ➕ Agregar categoría
        </button>
      </div>

      {/* LISTA / TABLA */}
      {loading ? (
        <p>Cargando categorías...</p>
      ) : showCategories ? (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              minWidth: "500px",
            }}
          >
            <thead>
              <tr style={{ textAlign: "left", color: "#94a3b8" }}>
                <th style={{ paddingBottom: "0.5rem" }}>Nombre</th>
                <th style={{ paddingBottom: "0.5rem" }}>Tipo</th>
                <th style={{ paddingBottom: "0.5rem" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ padding: "0.6rem 0" }}>
                    No hay categorías registradas.
                  </td>
                </tr>
              ) : (
                categories.map((cat) => (
                  <tr
                    key={cat.id}
                    style={{
                      borderBottom:
                        "1px solid rgba(255,255,255,0.05)",
                      transition: "background 0.2s ease",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "#0f172a")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor =
                        "transparent")
                    }
                  >
                    <td style={{ padding: "0.4rem 0" }}>{cat.name}</td>
                    <td
                      style={{
                        padding: "0.4rem 0",
                        color:
                          cat.type === "ingreso"
                            ? "#4ade80"
                            : "#f87171",
                        fontWeight: 600,
                        textTransform: "capitalize",
                      }}
                    >
                      {cat.type}
                    </td>
                    <td style={{ padding: "0.4rem 0" }}>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        style={{
                          background:
                            "linear-gradient(135deg, #ef4444, #dc2626)",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          padding: "0.35rem 0.8rem",
                          cursor: "pointer",
                          fontWeight: 500,
                          transition: "0.2s",
                        }}
                        onMouseOver={(e) =>
                          (e.target.style.background =
                            "linear-gradient(135deg, #dc2626, #b91c1c)")
                        }
                        onMouseOut={(e) =>
                          (e.target.style.background =
                            "linear-gradient(135deg, #ef4444, #dc2626)")
                        }
                      >
                        🗑️ Eliminar
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ opacity: 0.7, fontSize: "0.9rem", marginTop: "0.5rem" }}>
          📁 Lista de categorías oculta.
        </p>
      )}
    </div>
  );
}

export default CategoryManager;
