import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/Button.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../api/client.js";

export function LoginPage() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-soft">
      <div>
        <h1 className="text-xl font-semibold">Log in</h1>
        <p className="text-sm text-muted">Access your exchange dashboard.</p>
      </div>
      <ErrorState message={error} />
      <div>
        <label>Email</label>
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      </div>
      <div>
        <label>Password</label>
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
      </div>
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Logging in..." : "Log in"}</Button>
      <p className="text-center text-sm text-muted">
        New here? <Link to="/register" className="font-medium text-brand">Create an account</Link>
      </p>
    </form>
  );
}
