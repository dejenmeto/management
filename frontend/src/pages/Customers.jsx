import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  address: "",
  status: "active",
};

export default function Customers() {
  const { token } = useAuth();

  const [customers, setCustomers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Include the administrator's JWT with every protected API request.
  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/customers", {
        headers: authHeaders,
      });

      setCustomers(result.data || []);
    } catch (err) {
      setError(err.message || "Could not load customers.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(customer) {
    setForm({
      full_name: customer.full_name || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      status: customer.status || "active",
    });

    setEditingId(customer.id);
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
      const endpoint = editingId ? `/customers/${editingId}` : "/customers";

      const result = await apiRequest(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: authHeaders,
        body: JSON.stringify({
          ...form,
          email: form.email.trim() || null,
          phone: form.phone.trim() || null,
          address: form.address.trim() || null,
        }),
      });

      setNotice(
        result.message ||
          (editingId ? "Customer updated." : "Customer created."),
      );

      resetForm();
      await loadCustomers();
    } catch (err) {
      setError(err.message || "Could not save the customer.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveCustomer(customer) {
    if (!window.confirm(`Archive ${customer.full_name}?`)) {
      return;
    }

    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/customers/${customer.id}`, {
        method: "DELETE",
        headers: authHeaders,
      });

      setNotice(result.message || "Customer archived.");

      if (editingId === customer.id) {
        resetForm();
      }

      await loadCustomers();
    } catch (err) {
      setError(err.message || "Could not archive the customer.");
    }
  }

  return (
    <main className="management-page">
      <div className="management-heading">
        <div>
          <h1>Customer Management</h1>
          <p>Maintain customer details and account status.</p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadCustomers}
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
        <h2>{editingId ? "Edit customer" : "Add customer"}</h2>

        <form className="management-form" onSubmit={handleSubmit}>
          <label>
            Full name *
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              required
              maxLength={150}
            />
          </label>

          <label>
            Email
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              maxLength={255}
            />
          </label>

          <label>
            Phone
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              maxLength={40}
            />
          </label>

          <label>
            Status
            <select name="status" value={form.status} onChange={handleChange}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>

          <label className="full-width-field">
            Address
            <textarea
              name="address"
              value={form.address}
              onChange={handleChange}
              maxLength={500}
              rows={3}
            />
          </label>

          <div className="form-actions">
            <button type="submit" disabled={saving}>
              {saving
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create customer"}
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
          <h2>Customers</h2>
          <span>{customers.length} records</span>
        </div>

        {loading ? (
          <p>Loading customers...</p>
        ) : customers.length === 0 ? (
          <p>No customers found. Add your first customer above.</p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Address</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {customers.map((customer) => (
                  <tr key={customer.id}>
                    <td>{customer.full_name}</td>
                    <td>{customer.email || "—"}</td>
                    <td>{customer.phone || "—"}</td>
                    <td>{customer.address || "—"}</td>
                    <td>
                      <span className={`status-label ${customer.status}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditing(customer)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => archiveCustomer(customer)}
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
