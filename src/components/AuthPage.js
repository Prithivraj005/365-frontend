import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import "../App.css";
 import API_BASE_URL from "./api";

function AuthPage({ onLoginSuccess }) {
  const { isDark, toggleTheme, themeStyles } = useTheme();
  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  // Make sure body and root always have same background
  useEffect(() => {
    document.body.style.backgroundColor = isDark ? "#1e1e1e" : "#f4f4f4";
    document.getElementById("root").style.backgroundColor = isDark ? "#1e1e1e" : "#f4f4f4";
  }, [isDark]);



const handleSignup = async () => {
 

  setError("");

  if (!username || !password || !confirm) {
    setError("All fields required");
    return;
  }
  if (password !== confirm) {
    setError("Passwords do not match");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Signup failed");
      return;
    }

    // Save token + user
    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.user.username);

    onLoginSuccess(data.user.username);
  } catch (err) {
    setError("Server error");
  }
};

const handleLogin = async () => {
  setError("");

  if (!username || !password) {
    setError("All fields required");
    return;
  }

  try {
    const res = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("username", data.user.username);

    onLoginSuccess(data.user.username);
  } catch (err) {
    setError("Server error");
  }
};


  return (
    <div
      style={{
        ...themeStyles,
        width: "100vw",
        height: "100vh",
        minHeight: "100vh",
        position: "fixed",
        top: 0,
        left: 0,
        textAlign: "center",
        backgroundColor: isDark ? "#1e1e1e" : "#f4f4f4", // full solid background
        overflow: "hidden",
      }}
    >
      {/* 🌙 / 🌞 fixed top-left */}
      <div
        style={{
          position: "fixed",
          top: "18px",
          left: "18px",
          fontSize: "36px",
          cursor: "pointer",
          zIndex: 1000,
          userSelect: "none",
        }}
        onClick={toggleTheme}
      >
        {isDark ? "🌙" : "🌞"}
      </div>

      {/* Login / Signup form */}
      <div style={{ marginTop: "140px" }}>
        <h2>{isSignup ? "Sign Up" : "Login"}</h2>

        <input
          type="text"
          placeholder="Enter Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <br /><br />

        <input
          type="password"
          placeholder="Enter Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <br /><br />

        {isSignup && (
          <>
            <input
              type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <br /><br />
          </>
        )}

        <button onClick={isSignup ? handleSignup : handleLogin}>
          {isSignup ? "Sign Up" : "Login"}
        </button>
        <br /><br />

        <p style={{ color: "red" }}>{error}</p>

        <p>
          {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
          <span
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
            style={{ color: "blue", cursor: "pointer" }}
          >
            {isSignup ? "Login here" : "Sign up here"}
          </span>
        </p>
      </div>
    </div>
  );
}

export default AuthPage;
