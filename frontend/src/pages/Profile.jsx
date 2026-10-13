import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Profile() {
  const { user } = useAuth();

  if (!user) {
    return <p className="page-message">Loading your profile...</p>;
  }

  return (
    <section className="content-page profile-page">
      <h1>My Profile</h1>
      <p>Welcome to your Company Management account.</p>

      <div className="profile-details">
        <div>
          <span>Full name</span>
          <strong>{user.name}</strong>
        </div>

        <div>
          <span>Email address</span>
          <strong>{user.email}</strong>
        </div>

        <div>
          <span>Account role</span>
          <strong>{user.role}</strong>
        </div>

        <div>
          <span>User ID</span>
          <strong>{user.id}</strong>
        </div>
      </div>

      <p className="profile-note">
        Your account information is retrieved from the backend.
      </p>

      <Link to="/services" className="primary-button">
        Explore services
      </Link>
    </section>
  );
}
