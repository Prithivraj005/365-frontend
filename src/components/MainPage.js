import { useState, useEffect } from "react";
import { useTheme } from "../context/ThemeContext";
import "../App.css";
import Dashboard from "./Dashboard";
import { useNavigate } from "react-router-dom";

function MainPage({ username, onLogout }) {
  const { isDark, toggleTheme, themeStyles } = useTheme();
  const navigate = useNavigate();
  const [profilePic, setProfilePic] = useState(localStorage.getItem("profilePic") || "");

  // ✅ Protect MainPage if user not logged in
  useEffect(() => {
    const token = localStorage.getItem("token");
    const user = localStorage.getItem("username");

    if (!token || !user) {
      onLogout();
      navigate("/");
    }
  }, [navigate, onLogout]);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setProfilePic(reader.result);
      localStorage.setItem("profilePic", reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ ...themeStyles, minHeight: "100vh", width: "100vw", position: "relative", overflowX: "hidden" }}>
      <div style={{
        position: "fixed",
        top: "12px",
        left: "12px",
        display: "flex",
        gap: "12px",
        alignItems: "center",
        zIndex: 2000
      }}>
        <span
          onClick={toggleTheme}
          style={{ cursor: "pointer", fontSize: "28px" }}
          title="Toggle Theme"
        >
          {isDark ? "☀️" : "🌙"}
        </span>

        <button
          onClick={onLogout}
          style={{
            padding: "6px 12px",
            background: "#1976d2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            fontWeight: "600"
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ textAlign: "center", marginTop: "60px" }}>
        <img
          src={profilePic || "https://via.placeholder.com/120"}
          alt="Profile"
          onClick={() => document.getElementById("uploadPic").click()}
          style={{
            width: "110px",
            height: "110px",
            borderRadius: "12px",
            objectFit: "cover",
            cursor: "pointer"
          }}
        />
        <input
          id="uploadPic"
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />
        <h3 style={{ marginTop: "8px" }}>{username}</h3>
      </div>

      <Dashboard />
    </div>
  );
}

export default MainPage;
