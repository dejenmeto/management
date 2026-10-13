import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  name: "",
  description: "",
  price: "",
  status: "active",
};

export default function ServiceManagement() {
  const { token } = useAuth();

  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const authHeaders = { Authorization: `Bearer ${token}` };

  const loadServices = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      // The public GET endpoint returns active, non-archived services.
      const result = await apiRequest("/services/admin/all", {
        headers: authHeaders,
      });
      setServices(result.data || []);
    } catch (err) {
      setError(err.message || "Could not load services.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(service) {
    setEditingId(service.id);
    setForm({
      name: service.name || "",
      description: service.description || "",
      price: service.price ?? "",
      status: service.status || "active",
    });
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const endpoint = editingId ? `/services/${editingId}` : "/services";

      const result = await apiRequest(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          price: Number(form.price),
        }),
      });

      setNotice(result.message || "Service saved successfully.");
      resetForm();
      await loadServices();
    } catch (err) {
      setError(err.message || "Could not save service.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveService(service) {
    if (!window.confirm(`Archive "${service.name}"?`)) return;

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/services/${service.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      setNotice(result.message || "Service archived.");

      if (editingId === service.id) resetForm();
      await loadServices();
    } catch (err) {
      setError(err.message || "Could not archive service.");
    }
  }

  return (
    <main className="management-page">
      <div className="management-heading">
        <div>
          <h1>Service Management</h1>
          <p>Create services and manage descriptions, prices, and status.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={loadServices}
        >
          Refresh
        </button>
      </div>

      {error && (
        <p className="alert alert-error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="alert alert-success" role="status">
          {notice}
        </p>
      )}

      <section className="management-panel">
        <h2>{editingId ? "Edit service" : "Add service"}</h2>

        <form className="management-form" onSubmit={handleSubmit}>
          <label>
            Service name *
            <input
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              maxLength={150}
            />
          </label>

          <label>
            Price *
            <input
              type="number"
              name="price"
              value={form.price}
              onChange={handleChange}
              min="0"
              step="0.01"
              required
            />
          </label>

          <label className="full-width-field">
            Description
            <textarea
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={3}
            />
          </label>

          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create service"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-button"
                onClick={resetForm}
              >
                Cancel edit
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="management-panel">
        <div className="section-heading">
          <h2>Active services</h2>
          <span>{services.length} records</span>
        </div>

        {loading ? (
          <p>Loading services...</p>
        ) : services.length === 0 ? (
          <p>No active services are available.</p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Price</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.id}>
                    <td>{service.name}</td>
                    <td>{service.description || "—"}</td>
                    <td>{Number(service.price).toLocaleString()}</td>
                    <td>
                      <span className={`status-label ${service.status}`}>
                        {service.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditing(service)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => archiveService(service)}
                        >
                          Archive
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
