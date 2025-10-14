import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";
import OperatorDashboard from "./pages/OperatorDashboard";
import RegistrationPage from "./pages/Registration";
import HomePage from "./pages/Home";
import { Protected } from "./pages/ProtectedPage";
import NavBar from "./components/NavBar";

function App() {
  return (
    <Routes>
      {/* Unprotected Routes. Users can access these pages without needing to be authenticated */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />

      {/* Protected Routes. Users can access these pages only after being authenticated */}
      <Route
        path="/"
        element={
          <Protected>
            <NavBar />
            <HomePage />
          </Protected>
        }
      />
      <Route
        path="/operator"
        element={
          <Protected>
            <NavBar />
            <OperatorDashboard />
          </Protected>
        }
      />
      <Route
        path="/jobs"
        element={
          <Protected>
            <NavBar />
            <div>Jobs Page</div>
          </Protected>
        }
      />
      <Route
        path="/telemetry"
        element={
          <Protected>
            <NavBar />
            <div>Telemetry Page</div>
          </Protected>
        }
      />
      <Route
        path="/tokens"
        element={
          <Protected>
            <NavBar />
            <div>Tokens Page</div>
          </Protected>
        }
      />
      <Route
        path="/marketplace"
        element={
          <Protected>
            <NavBar />
            <div>Marketplace Page</div>
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;
