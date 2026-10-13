import { useState } from "react";
import { apiRequest } from "../services/api";

function Contact() {
  // Store the visitor's form values.
  const [form, setForm] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
  });

  // Track submission progress and feedback.
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Update the field that the visitor changes.
  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));
  }

  // Send the form data to the Express API.
  async function handleSubmit(event) {
    event.preventDefault();

    setLoading(true);
    setSuccess("");
    setError("");

    try {
      const result = await apiRequest("/contact", {
        method: "POST",
        body: JSON.stringify(form),
      });

      setSuccess(result.message);

      // Clear the form after successful submission.
      setForm({
        name: "",
        email: "",
        subject: "",
        message: "",
      });
    } catch (err) {
      setError(err.message || "Unable to submit your message.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="content-page">
      <p className="eyebrow">GET IN TOUCH</p>
      <h1>Contact Us</h1>

      <p className="page-lead">
        Have a question about our services? Send us a message.
      </p>

      <form className="contact-form" onSubmit={handleSubmit}>
        <label htmlFor="name">Full name</label>
        <input
          id="name"
          name="name"
          type="text"
          autoComplete="name"
          maxLength={150}
          value={form.name}
          onChange={handleChange}
          required
        />

        <label htmlFor="email">Email address</label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={255}
          value={form.email}
          onChange={handleChange}
          required
        />

        <label htmlFor="subject">Subject</label>
        <input
          id="subject"
          name="subject"
          type="text"
          maxLength={200}
          value={form.subject}
          onChange={handleChange}
          required
        />

        <label htmlFor="message">Your message</label>
        <textarea
          id="message"
          name="message"
          rows={6}
          maxLength={5000}
          value={form.message}
          onChange={handleChange}
          required
        />

        {/* Show feedback from the backend. */}
        {success && (
          <p className="success-message" role="status">
            {success}
          </p>
        )}

        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Sending..." : "Send Message"}
        </button>
      </form>
    </main>
  );
}

export default Contact;
