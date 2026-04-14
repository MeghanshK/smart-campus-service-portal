import { useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import api from "../api";

export default function LoginPage({ setUser, isAuthenticated }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const res = await api.post("/auth/login", form);
      localStorage.setItem("token", res.data.token);
      setUser(res.data.user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed.");
    }
  };

  return (
    <div className="login-screen">
      <div className="login-overlay" />
      <div className="login-content container">
        <p className="kicker login-kicker">Smart Campus Suite</p>
        <h1 className="login-title">Campus Service Portal</h1>
        <p className="login-subtitle">
          Unified platform for maintenance, IT support, hostel and library services.
        </p>

        <section className="auth-card card login-card">
          <h2>Welcome back</h2>
          <p className="muted">Login to continue to your service dashboard.</p>
          <form onSubmit={handleSubmit}>
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
                placeholder="Enter your password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </label>
            <button type="submit" className="btn-primary">Sign In</button>
          </form>
          {error && <p className="error">{error}</p>}
          <p className="muted">
            New user? <Link to="/register">Create an account</Link>
          </p>
        </section>
      </div>
    </div>
  );
}
