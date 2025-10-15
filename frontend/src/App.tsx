import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";
import OperatorDashboard from "./pages/OperatorDashboard";
import RegistrationPage from "./pages/Registration";
import HomePage from "./pages/Home";
import { Protected } from "./pages/ProtectedPage";
import JobsPage from "./pages/Jobs"
import TelemetryAnalysis from "./pages/TelemetryAnalysis";

function App() {
  return (
    <Routes>
      {/* Unprotected Routes. Users can access these pages without needing to be authenticated */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />

      {/* Protected Routes. Users can access these pages aftering being authenticated */}
      <Route
        path="/"
        element={
          <Protected>
            <HomePage />
          </Protected>
        }
      />
      <Route
        path="/operator"
        element={
          <Protected>
            <OperatorDashboard />
          </Protected>
        }
      />
      <Route
        path="/jobs"
        element={
          <Protected>
            <JobsPage />
          </Protected>
        }
      />
      <Route
        path="/telemetry"
        element={
          <Protected>
            <TelemetryAnalysis />
          </Protected>
        }
      />
      <Route
        path="/tokens"
        element={
          <Protected>
            <div>Tokens Page</div>
          </Protected>
        }
      />
      <Route
        path="/marketplace"
        element={
          <Protected>
            <div>Marketplace Page</div>
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;
