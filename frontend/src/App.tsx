import { Routes, Route } from 'react-router-dom';
import LoginPage from './pages/Login';
import OperatorDashboard from './pages/OperatorDashboard';

function App() {
  return (
    <Routes>
      <Route path="/" element={<LoginPage />} />
      <Route path="/operator" element={<OperatorDashboard />} />
      <Route path="/jobs" element={<div>Jobs Page</div>} />
      <Route path="/telemetry" element={<div>Telemetry Page</div>} />
      <Route path="/tokens" element={<div>Tokens Page</div>} />
      <Route path="/marketplace" element={<div>Marketplace Page</div>} />
    </Routes>
  );
}

export default App;