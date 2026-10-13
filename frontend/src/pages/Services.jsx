import { useEffect, useState } from "react";
import { apiRequest } from "../services/api";

// This page loads and displays active services from Neon.
function Services() {
  // Store the services returned by our Express API.
  const [services, setServices] = useState([]);

  // Track whether the API request is still running.
  const [loading, setLoading] = useState(true);

  // Store an error message if the request fails.
  const [error, setError] = useState("");

  useEffect(() => {
    // Load services when the component first appears.
    async function loadServices() {
      try {
        setLoading(true);
        setError("");

        // Call GET http://localhost:3000/api/services
        const result = await apiRequest("/services");

        // The API returns service records inside result.data.
        setServices(result.data);
      } catch (err) {
        setError(err.message || "Unable to load services.");
      } finally {
        // Stop showing the loading state on success or failure.
        setLoading(false);
      }
    }

    loadServices();
  }, []);

  return (
    <main className="services-page">
      <section className="services-heading">
        <p className="eyebrow">WHAT WE OFFER</p>
        <h1>Our Services</h1>
        <p>Explore the services available from our company.</p>
      </section>

      {/* Display a message while the API request is running. */}
      {loading && <p className="status-message">Loading services...</p>}

      {/* Display the error if the backend request fails. */}
      {!loading && error && <p className="error-message">{error}</p>}

      {/* Display a helpful message if no services are available. */}
      {!loading && !error && services.length === 0 && (
        <p className="status-message">No active services are available yet.</p>
      )}

      {/* Render one card for each service returned by PostgreSQL. */}
      {!loading && !error && services.length > 0 && (
        <section className="services-grid">
          {services.map((service) => (
            <article className="service-card" key={service.id}>
              <span className="service-label">AVAILABLE SERVICE</span>

              <h2>{service.name}</h2>

              <p className="service-description">
                {service.description || "Contact us for more details."}
              </p>

              <p className="service-price">
                {Number(service.price).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}

export default Services;
