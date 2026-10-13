import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  full_name: "",
  email: "",
  phone: "",
  position: "",
  salary: "",
  hire_date: "",
  status: "active",
};

export default function Employees() {
  const { token } = useAuth();

  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  // Every employee endpoint requires an administrator token.
  const requestOptions = {
    headers: { Authorization: `Bearer ${token}` },
  };

  const loadEmployees = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/employees", requestOptions);
      setEmployees(result.data || []);
    } catch (err) {
      setError(err.message || "Could not load employees.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  }

  function resetForm() {
    setForm(emptyForm);
    setEditingId(null);
  }

  function startEditing(employee) {
    setEditingId(employee.id);
    setForm({
      full_name: employee.full_name || "",
      email: employee.email || "",
      phone: employee.phone || "",
      position: employee.position || "",
      salary: employee.salary ?? "",
      hire_date: employee.hire_date
        ? String(employee.hire_date).slice(0, 10)
        : "",
      status: employee.status || "active",
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

    const payload = {
      ...form,
      salary: form.salary === "" ? null : Number(form.salary),
      hire_date: form.hire_date || null,
    };

    try {
      const endpoint = editingId ? `/employees/${editingId}` : "/employees";

      await apiRequest(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      setNotice(editingId ? "Employee updated." : "Employee created.");
      resetForm();
      await loadEmployees();
    } catch (err) {
      setError(err.message || "Could not save employee.");
    } finally {
      setSaving(false);
    }
  }

  async function archiveEmployee(employee) {
    // Ask before making a permanent-looking change in the interface.
    if (!window.confirm(`Archive ${employee.full_name}?`)) return;

    setError("");
    setNotice("");

    try {
      await apiRequest(`/employees/${employee.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      setNotice("Employee archived.");
      if (editingId === employee.id) resetForm();
      await loadEmployees();
    } catch (err) {
      setError(err.message || "Could not archive employee.");
    }
  }

  return (
    <main className="management-page">
      <div className="management-heading">
        <div>
          <h1>Employee Management</h1>
          <p>Create and maintain employee records.</p>
        </div>
        <button
          type="button"
          className="secondary-button"
          onClick={loadEmployees}
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
        <h2>{editingId ? "Edit employee" : "Add employee"}</h2>

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
            Email *
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              required
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
            Position *
            <input
              name="position"
              value={form.position}
              onChange={handleChange}
              required
              maxLength={120}
            />
          </label>

          <label>
            Salary
            <input
              type="number"
              name="salary"
              value={form.salary}
              onChange={handleChange}
              min="0"
              step="0.01"
            />
          </label>

          <label>
            Hire date
            <input
              type="date"
              name="hire_date"
              value={form.hire_date}
              onChange={handleChange}
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
                  : "Create employee"}
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
          <h2>Employees</h2>
          <span>{employees.length} records</span>
        </div>

        {loading ? (
          <p>Loading employees...</p>
        ) : employees.length === 0 ? (
          <p>No employees found. Add your first employee above.</p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Position</th>
                  <th>Salary</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id}>
                    <td>{employee.full_name}</td>
                    <td>{employee.email}</td>
                    <td>{employee.position}</td>
                    <td>
                      {employee.salary == null
                        ? "—"
                        : Number(employee.salary).toLocaleString()}
                    </td>
                    <td>
                      <span className={`status-label ${employee.status}`}>
                        {employee.status}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <button
                          type="button"
                          className="secondary-button"
                          onClick={() => startEditing(employee)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="danger-button"
                          onClick={() => archiveEmployee(employee)}
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
