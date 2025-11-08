import { useState } from "react";
import { ThemeProvider } from "./context/ThemeContext";
import AuthPage from "./components/AuthPage";
import MainPage from "./components/MainPage";

function App() {
  const [loggedInUser, setLoggedInUser] = useState(localStorage.getItem("username") || "");

  const handleLoginSuccess = (username) => {
    localStorage.setItem("username", username);
    setLoggedInUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem("username");
    localStorage.removeItem("token");
    setLoggedInUser("");
  };

  return (
    <ThemeProvider>
      {loggedInUser ? (
        <MainPage username={loggedInUser} onLogout={handleLogout} />
      ) : (
        <AuthPage onLoginSuccess={handleLoginSuccess} />
      )}
    </ThemeProvider>
  );
}

export default App;
