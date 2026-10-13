import { useCallback, useEffect, useState } from "react";
import { apiRequest } from "../services/api";
import { useAuth } from "../context/AuthContext";

const messageStatuses = ["new", "read", "resolved"];

export default function Messages() {
  const { token } = useAuth();

  const [messages, setMessages] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const headers = { Authorization: `Bearer ${token}` };

  const loadMessages = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await apiRequest("/messages", { headers });
      setMessages(result.data || []);

      // Refresh the selected message from the latest server data.
      setSelected((previous) => {
        if (!previous) return null;

        return (
          (result.data || []).find((message) => message.id === previous.id) ||
          null
        );
      });
    } catch (err) {
      setError(err.message || "Could not load messages.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  async function changeStatus(message, status) {
    setError("");
    setNotice("");

    try {
      const result = await apiRequest(`/messages/${message.id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status }),
      });

      setNotice(result.message || "Message status updated.");
      setSelected(result.data);
      await loadMessages();
    } catch (err) {
      setError(err.message || "Could not update message.");
    }
  }

  return (
    <main className="management-page">
      <div className="management-heading">
        <div>
          <h1>Contact Messages</h1>
          <p>Review contact form submissions and manage their status.</p>
        </div>

        <button
          type="button"
          className="secondary-button"
          onClick={loadMessages}
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
        <div className="section-heading">
          <h2>Inbox</h2>
          <span>
            {messages.filter((message) => message.status === "new").length}
            {" new"}
          </span>
        </div>

        {loading ? (
          <p>Loading messages...</p>
        ) : messages.length === 0 ? (
          <p>No contact messages have been received yet.</p>
        ) : (
          <div className="table-scroll">
            <table className="management-table">
              <thead>
                <tr>
                  <th>Sender</th>
                  <th>Subject</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {messages.map((message) => (
                  <tr key={message.id}>
                    <td>
                      <strong>{message.name}</strong>
                      <br />
                      {message.email}
                    </td>
                    <td>{message.subject}</td>
                    <td>
                      {message.created_at
                        ? new Date(message.created_at).toLocaleString()
                        : "—"}
                    </td>
                    <td>
                      <span className={`status-label ${message.status}`}>
                        {message.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setSelected(message)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selected && (
        <section className="management-panel">
          <div className="section-heading">
            <h2>Message details</h2>
            <button
              type="button"
              className="secondary-button"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>

          <p>
            <strong>From:</strong> {selected.name}
          </p>
          <p>
            <strong>Email:</strong> {selected.email}
          </p>
          <p>
            <strong>Subject:</strong> {selected.subject}
          </p>

          <div className="message-content">{selected.message}</div>

          <label className="message-status-control">
            Update status
            <select
              value={selected.status}
              onChange={(event) => changeStatus(selected, event.target.value)}
            >
              {messageStatuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>
        </section>
      )}
    </main>
  );
}
