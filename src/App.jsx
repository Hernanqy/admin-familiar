// src/App.jsx
import { useEffect, useState } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  if (loading) return <div className="center">Cargando...</div>;

  if (!user) return <Login />;

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Admin Familia 👪</h1>
        <div className="user-info">
          <span>{user.email}</span>
          <button onClick={handleLogout}>Cerrar sesión</button>
        </div>
      </header>

      <Dashboard user={user} />
    </div>
  );
}

export default App;
