import { Routes, Route } from "react-router-dom";
import RegistrationPage from "./pages/Registration";
import LoginPage from "./pages/Login";
import { Link } from "react-router-dom";

function App() {
  return (
    <div>
      <Link to="/register">Register Page</Link>
      <Link to="/login">Login Page</Link>

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegistrationPage />} />
      </Routes>
    </div>
  );
}

export default App;
