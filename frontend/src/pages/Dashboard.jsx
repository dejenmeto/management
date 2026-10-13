import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext.jsx";

const cards = [
  {
    key: "active_users",
    title: "Active Users",
    description: "Accounts enabled",
    link: "/profile",
  },
  {
    key: "active_employees",
    title: "Active Employees",
    description: "Current employees",
    link: "/employees",
  },
  {
    key: "active_customers",
    title: "Active Customers",
    description: "Current customers",
    link: "/customers",
  },
  {
    key: "active_services",
    title: "Active Services",
    description: "Available services",
    link: "/services-management",
  },
  {
    key: "pending_requests",
    title: "Pending Requests",
    description: "Awaiting action",
    link: "/service-requests",
  },
  {
    key: "new_messages",
    title: "New Messages",
    description: "Contact messages to review",
    link: "/messages",
  },
];

export default function Dashboard() {
  const { token, user } = useAuth();

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setLoading(true);
      setError("");

      try {
        const result = await apiRequest("/dashboard/stats", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!cancelled) {
          setStats(result.data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load dashboard.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    if (token) {
      loadStats();
    } else {
      setLoading(false);
      setError("Please log in to view the dashboard.");
    }

    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <p className="dashboard-eyebrow">ADMINISTRATION</p>
          <h1>Dashboard</h1>
          <p>
            Welcome, {user?.name}. Here is the current overview of your company.
          </p>
        </div>

        <span className="admin-role">Administrator</span>
      </div>

      {error && (
        <div className="dashboard-error" role="alert">
          <strong>Dashboard unavailable</strong>
          <p>{error}</p>
          <p>
            Confirm that you are logged in with an administrator account and
            that your token is valid.
          </p>
        </div>
      )}

      {loading ? (
        <p className="page-message">Loading company statistics...</p>
      ) : stats ? (
        <>
          <div className="stats-grid">
            {cards.map((card) => (
              <article className="stat-card" key={card.key}>
                <p className="stat-label">{card.title}</p>
                <strong className="stat-number">
                  {Number(stats[card.key] ?? 0).toLocaleString()}
                </strong>
                <p className="stat-description">{card.description}</p>

                <Link to={card.link} className="stat-link">
                  View details <span aria-hidden="true">→</span>
                </Link>
              </article>
            ))}
          </div>

          <section className="dashboard-section">
            <h2>Management areas</h2>
            <p>
              Manage your company records from one place. We will connect these
              links to their management pages next.
            </p>

            <div className="management-links">
              <Link to="/employees">Employee management</Link>
              <Link to="/customers">Customer management</Link>
              <Link to="/services">Services</Link>
              <Link to="/messages">Contact messages</Link>
            </div>
          </section>
        </>
      ) : null}
    </section>
  );
}
