import './styles/App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import OperatorDashboard from './components/OperatorDashboard';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/operator" element={<OperatorDashboard />} />
        {/* placeholder routes for operator dashboard links */}
        <Route path="/savingspipeline" element={<div>Savings Pipeline Page</div>} />
        <Route path="/toolmanagement" element={<div>Tool Management Page</div>} />
        <Route path="/revenuetransactions" element={<div>Revenue / Transactions</div>} />
        <Route path="/creditportfolio" element={<div>Credit Portfolio</div>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;