import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";

export default function RegisterPage({ isAuthenticated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "student"
  });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    setError("");
    try {
      await api.post("/auth/register", form);
      setMessage("Registration successful. You can now login.");
      setTimeout(() => navigate("/login"), 800);
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed.");
    }
  };

  return (
    <div className="auth-layout container">
      <section className="auth-brand card">
        <p className="kicker">Smart Campus Suite</p>
        <h1>Create your account</h1>
        <p className="muted">
          Join the Smart Campus Service Portal to raise and track service requests with transparency.
        </p>
        <div className="auth-highlights">
          <span>Student self-service</span>
          <span>Staff escalation</span>
          <span>Admin visibility</span>
        </div>
      </section>

      <section className="auth-card card">
        <h2>Register</h2>
        <p className="muted">Set up your profile to access the portal.</p>
        <form onSubmit={handleSubmit}>
          <label className="field-label">
            Full Name
            <input
              type="text"
              placeholder="Your full name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
          <label className="field-label">
            Email Address
            <input
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </label>
          <label className="field-label">
            Password
            <input
              type="password"
              placeholder="Create a strong password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
          </label>
          <label className="field-label">
            Select Role
            <select
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              <option value="student">Student</option>
              <option value="staff">Staff</option>
              <option value="admin">Admin</option>
            </select>
          </label>
          <button type="submit" className="btn-primary">Create Account</button>
        </form>
        {message && <p className="success">{message}</p>}
        {error && <p className="error">{error}</p>}
        <p className="muted">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </section>
    </div>
  );
}
