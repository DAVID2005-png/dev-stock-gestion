import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PrivateRoute({ children, allowedRoles }) {
  const { user, role } = useAuth();

  if (!user) {
    return <Navigate to="/" />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/unauthorized" />;
  }

  return children;
}
