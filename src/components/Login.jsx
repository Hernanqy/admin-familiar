// src/components/Login.jsx
import { useState } from "react";
import { auth } from "../firebaseConfig";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isRegister) {
        await createUserWithEmailAndPassword(auth, email, password);
        alert("Cuenta creada 🎉");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        alert("Sesión iniciada ✅");
      }
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  };

  return (
    <div className="auth-container">
      <h2>{isRegister ? "Crear cuenta" : "Iniciar sesión"}</h2>
      <form onSubmit={handleSubmit} className="auth-form">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit">
          {isRegister ? "Registrarme" : "Entrar"}
        </button>
      </form>

      <button
        className="link-btn"
        type="button"
        onClick={() => setIsRegister(!isRegister)}
      >
        {isRegister
          ? "¿Ya tienes cuenta? Inicia sesión"
          : "¿No tienes cuenta? Registrarse"}
      </button>
    </div>
  );
}

export default Login;
