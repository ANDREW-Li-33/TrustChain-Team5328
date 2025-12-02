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
import TokenHistoryPage from "./pages/TokenHistory";
import AdminActions from "./pages/AdminActions";
import UserHistoryPage from "./pages/UserHistory";

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
            <NavBar />
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
        path="/marketplace"
        element={
          <Protected>
            <NavBar />
            <MarketplacePage />
          </Protected>
        }
      />
      {/* Token History Routes */}
      <Route
        path="/token-history/:jobId"
        element={
          <Protected>
            <NavBar />
            <TokenHistoryPage />
          </Protected>
        }
      />
      <Route
        path="/token-history"
        element={
          <Protected>
            <NavBar />
            <TokenHistoryPage />
          </Protected>
        }
      />
      <Route
        path="/adminaction"
        element={
          <Protected>
            <NavBar />
            <AdminActions />
          </Protected>
        }
      />
      <Route
        path="/userhistory"
        element={
          <Protected>
            <NavBar />
            <UserHistoryPage />
          </Protected>
        }
      />
    </Routes>
  );
}

export default App;