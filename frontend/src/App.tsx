import { Routes, Route } from "react-router-dom";
import LoginPage from "./pages/Login";
import OperatorDashboard from "./pages/OperatorDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import VerifierDashboard from "./pages/VerifierDashboard";
import VerifierEvidenceReview from "./pages/VerifierEvidenceReview";
import RegistrationPage from "./pages/Registration";
import HomePage from "./pages/Home";
import { Protected } from "./pages/ProtectedPage";
import { RoleProtected } from "./components/RoleProtected";
import TelemetryAnalysis from "./pages/TelemetryAnalysis";
import NavBar from "./components/NavBar";
import JobsPage from "./pages/Jobs";
import CreditPortfolioPage from "./pages/CreditPortfolio";
import MarketplacePage from "./pages/Marketplace";
import BuyerPortfolioPage from "./pages/BuyerPortfolio";

function App() {
  return (
    <Routes>
      {/* Unprotected Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegistrationPage />} />

      {/* Protected Routes */}
      <Route
        path="/"
        element={
          <Protected>
            <RoleProtected allowedRoles={["operator", "slb admin"]}>
              <NavBar />
              <OperatorDashboard />
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/operator"
        element={
          <Protected>
            <RoleProtected allowedRoles={["operator", "slb admin"]}>
              <NavBar />
              <OperatorDashboard />
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/admin"
        element={
          <Protected>
            <NavBar />
            <AdminDashboard />
          </Protected>
        }
      />
      <Route
        path="/jobs"
        element={
          <Protected>
            <RoleProtected allowedRoles={["operator", "slb admin"]}>
              <NavBar />
              <JobsPage />
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/creditportfolio"
        element={
          <Protected>
            <NavBar />
            <CreditPortfolioPage />
          </Protected>
        }
      />
      <Route
        path="/verifier"
        element={
          <Protected>
            <VerifierDashboard />
          </Protected>
        }
      />
      <Route
        path="/verifier/request/:requestId"
        element={
          <Protected>
            <VerifierEvidenceReview />
          </Protected>
        }
      />
      <Route
        path="/telemetry"
        element={
          <Protected>
            <RoleProtected allowedRoles={["operator", "slb admin"]}>
              <NavBar />
              <TelemetryAnalysis />
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/telemetry/:jobId"
        element={
          <Protected>
            <RoleProtected allowedRoles={["operator", "slb admin"]}>
              <NavBar />
              <TelemetryAnalysis />
            </RoleProtected>
          </Protected>
        }
      />
      <Route
        path="/tokens"
        element={
          <Protected>
            <NavBar />
            <CreditPortfolioPage />
          </Protected>
        }
      />
      <Route
        path="/buyerportfolio"
        element={
          <Protected>
            <NavBar />
            <BuyerPortfolioPage />
          </Protected>
        }
      />
      <Route
        path="/marketplace"
        element={
          <Protected>
            <NavBar />
            <MarketplacePage />
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;
