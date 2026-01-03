import { Routes, Route } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DashboardAdmin from "./pages/DashboardAdmin";
import DashboardAjoint from "./pages/DashboardAjoint";
import DashboardSecretaire from "./pages/DashboardSecretaire";
import PrivateRoute from "./components/PrivateRoute";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route
        path="/admin"
        element={
          <PrivateRoute allowedRoles={["admin"]}>
            <DashboardAdmin />
          </PrivateRoute>
        }
      />

      <Route
        path="/ajoint"
        element={
          <PrivateRoute allowedRoles={["admin", "ajoint"]}>
            <DashboardAjoint />
          </PrivateRoute>
        }
      />

      <Route
        path="/secretaire"
        element={
          <PrivateRoute allowedRoles={["admin", "ajoint", "secretaire"]}>
            <DashboardSecretaire />
          </PrivateRoute>
        }
      />
    </Routes>
  );
}

export default App;
