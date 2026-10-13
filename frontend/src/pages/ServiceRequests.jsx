import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  customer_id: "",
  service_id: "",
  request_date: "",
  notes: "",
};

const statuses = [
  "pending",
  "approved",
  "in_progress",
  "completed",
  "cancelled",
];

export default function ServiceRequests() {
  const { token } = useAuth();

  const [requests, setRequests] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [services, setServices] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [requestResult, customerResult, serviceResult] = await Promise.all([
        apiRequest("/service-requests", { headers }),
        apiRequest("/customers", { headers }),
        apiRequest("/services/admin/all", { headers }),
      ]);

      setRequests(requestResult.data || []);

      // Only active, non-archived customers and services can be selected.
      setCustomers(
        (customerResult.data || []).filter(
          (customer) => customer.status === "active",
        ),
      );

      setServices(
        (serviceResult.data || []).filter(
          (service) => service.status === "active",
        ),
      );
    } catch (err) {
      setError(err.message || "Could not load service request data.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await apiRequest("/service-requests", {
        method: "POST",
        headers,
        body: JSON.stringify({
          ...form,
          customer_id: Number(form.customer_id),
          service_id: Number(form.service_id),
          request_date: form.request_date || null,
        }),
      });

      setNotice(result.message || "Service request created.");
      setForm(emptyForm);
      await loadData();
    } catch (err) {
      setError(err.message || "Could not create service request.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(request, status) {
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/service-requests/${request.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status,
          notes: request.notes || "",
        }),
      });

      setNotice(result.message || "Request status updated.");
      await loadData();
    } catch (err) {
      setError(err.message || "Could not update request status.");
    }
  }

  return (
    <main className="management-page">
      <div className="management-heading">
        <div>
          <h1>Service Requests</h1>
          <p>Create customer requests and track their progress.</p>
        </div>
        <button type="button" className="secondary-button" onClick={loadData}>
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
        <h2>Create a request</h2>

        <form className="management-form" onSubmit={handleCreate}>
          <label>
            Customer *
            <select
              name="customer_id"
              value={form.customer_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.full_name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Service *
            <select
              name="service_id"
              value={form.service_id}
              onChange={handleChange}
              required
            >
              <option value="">Select a service</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} — {Number(service.price).toLocaleString()}
                </option>
              ))}
            </select>
          </label>

          <label>
            Request date
            <input
              type="date"
              name="request_date"
              value={form.request_date}
              onChange={handleChange}
            />
          </label>

          <label className="full-width-field">
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              maxLength={2000}
              rows={3}
            />
          </label>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create request"}
            </button>
          </div>

          {customers.length === 0 && (
            <p>No active customers are available. Add a customer first.</p>
          )}

          {services.length === 0 && (
            <p>No active services are available. Add a service first.</p>
          )}
        </form>
      </section>

      <section className="management-panel">
        <div className="section-heading">
          <h2>All requests</h2>
          <span>{requests.length} records</span>
        </div>

        {loading ? (
          <p>Loading requests...</p>
        ) : requests.length === 0 ? (
          <p>No service requests have been created yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Customer</th>
                  <th>Service</th>
                  <th>Price at request</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id}>
                    <td>{request.id}</td>
                    <td>{request.customer_name}</td>
                    <td>{request.service_name}</td>
                    <td>{Number(request.price_at_request).toLocaleString()}</td>
                    <td>
                      {request.request_date
                        ? String(request.request_date).slice(0, 10)
                        : "—"}
                    </td>
                    <td>
                      <select
                        aria-label={`Status for request ${request.id}`}
                        value={request.status}
                        onChange={(event) =>
                          updateStatus(request, event.target.value)
                        }
                      >
                        {statuses.map((status) => (
                          <option key={status} value={status}>
                            {status.replace("_", " ")}
                          </option>
                        ))}
                      </select>
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
