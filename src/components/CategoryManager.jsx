// src/components/CategoryManager.jsx
import { useState } from "react";

function CategoryManager({ categories, onCreate, onUpdate, onDelete }) {
  const [name, setName] = useState("");
  const [type, setType] = useState("gasto");
  const [editingId, setEditingId] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingId) {
      await onUpdate(editingId, { name: name.trim(), type });
      setEditingId(null);
    } else {
      await onCreate({ name: name.trim(), type });
    }

    setName("");
    setType("gasto");
  };

  const handleEdit = (cat) => {
    setEditingId(cat.id);
    setName(cat.name);
    setType(cat.type);
  };

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setType("gasto");
  };

  return (
    <section className="card">
      <h2>Categorías</h2>

      <form className="expense-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Nombre de categoría (ej: Sueldo, Supermercado)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />

        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="gasto">Gasto</option>
          <option value="ingreso">Ingreso</option>
        </select>

        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button type="submit">
            {editingId ? "Actualizar categoría" : "Agregar categoría"}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm}>
              Cancelar
            </button>
          )}
        </div>
      </form>

      {categories.length === 0 ? (
        <p style={{ marginTop: "0.75rem" }}>No hay categorías aún.</p>
      ) : (
        <table className="table" style={{ marginTop: "0.75rem" }}>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th style={{ textAlign: "right" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((cat) => (
              <tr key={cat.id}>
                <td>{cat.name}</td>
                <td>{cat.type === "gasto" ? "Gasto" : "Ingreso"}</td>
                <td style={{ textAlign: "right" }}>
                  <button onClick={() => handleEdit(cat)}>Editar</button>
                  <button
                    style={{ marginLeft: "0.5rem" }}
                    onClick={() => onDelete(cat.id)}
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
  );
}

export default CategoryManager;
