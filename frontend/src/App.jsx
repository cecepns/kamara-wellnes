import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from '@/components/Layout';
import Login from '@/pages/Login';
import Dashboard from '@/pages/Dashboard';
import Reports from '@/pages/Reports';
import ResourcePage from '@/pages/ResourcePage';

const Private = ({ children }) => (localStorage.getItem('token') ? children : <Navigate to="/login" replace />);
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Private><Layout /></Private>}>
        <Route index element={<Dashboard />} />
        <Route path="laporan" element={<Reports />} />
        <Route path=":name" element={<ResourcePage />} />
      </Route>
    </Routes>
  );
}
