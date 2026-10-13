import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  useNavigate,
} from "react-router-dom";

import "./App.css";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Services from "./pages/Services.jsx";
import Contact from "./pages/Contact.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Profile from "./pages/Profile.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import AdminRoute from "./components/AdminRoute.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Employees from "./pages/Employees.jsx";
import Customers from "./pages/Customers.jsx";
import ServiceManagement from "./pages/ServiceManagement.jsx";
import ServiceRequests from "./pages/ServiceRequests.jsx";
import Messages from "./pages/Messages.jsx";

// below is another way to import the useAuth hook, but we are already importing it in the AppLayout component, so we can remove this import statement.
import { useAuth } from "./context/AuthContext.jsx";

function AppLayout() {
  const { user, loading, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/", { replace: true });
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <NavLink to="/" className="site-brand">
            <span className="brand-mark">CM</span>
            <span className="brand-text">
              <strong>Company Management</strong>
              <small>Management Portal</small>
            </span>
          </NavLink>

          <nav className="site-nav" aria-label="Main navigation">
            <NavLink to="/" end>
              Home
            </NavLink>
            <NavLink to="/about">About</NavLink>
            <NavLink to="/services">Services</NavLink>
            <NavLink to="/contact">Contact</NavLink>
          </nav>

          <div className="header-account">
            {loading ? (
              <span className="nav-status">Checking session...</span>
            ) : user ? (
              <>
                {user.role === "admin" && (
                  <NavLink to="/dashboard">Dashboard</NavLink>
                )}
                <NavLink to="/profile" className="account-summary">
                  <span className="account-avatar">
                    {(user.name || "U").trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="account-text">
                    <strong>{user.name}</strong>
                    <small>{user.role}</small>
                  </span>
                </NavLink>

                <button
                  type="button"
                  className="nav-logout"
                  onClick={handleLogout}
                >
                  Log out
                </button>
              </>
            ) : (
              <>
                <NavLink to="/login" className="login-link">
                  Log in
                </NavLink>
                <NavLink to="/register" className="nav-register">
                  Register
                </NavLink>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<About />} />
          <Route path="/services" element={<Services />} />
          <Route path="/contact" element={<Contact />} />

          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<Profile />} />
          </Route>
          {/* here */}
          <Route element={<AdminRoute />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/employees" element={<Employees />} />
            <Route path="/customers" element={<Customers />} />
            <Route
              path="/services-management"
              element={<ServiceManagement />}
            />
            <Route path="/service-requests" element={<ServiceRequests />} />
            <Route path="/messages" element={<Messages />} />
          </Route>

          {/* end */}
          <Route
            path="*"
            element={
              <section className="content-page">
                <h1>Page not found</h1>
                <p>The page you requested does not exist.</p>
                <NavLink to="/">Return home</NavLink>
              </section>
            }
          />
        </Routes>
      </main>

      <footer className="site-footer">
        <p>© {new Date().getFullYear()} Company Management System</p>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}
