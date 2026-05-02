import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/Button.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { getErrorMessage } from "../api/client.js";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    captcha_token: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const startGoogleLogin = () => {
    setError("Google login coming soon.");
    // TODO: Replace this placeholder with a real Google OAuth redirect/widget.
    // window.location.href = `${import.meta.env.VITE_API_BASE_URL}/auth/google/login`;
  };

  return (
    <form onSubmit={submit} className="space-y-4 rounded-lg border border-line bg-white p-6 shadow-soft">
      <div>
        <h1 className="text-xl font-semibold">Create account</h1>
        <p className="text-sm text-muted">Start listing and exchanging items.</p>
      </div>
      <ErrorState message={error} />
      <div>
        <label>Name</label>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </div>
      <div>
        <label>Email</label>
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      </div>
      <div>
        <label>Password</label>
        <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
      </div>
      {/* TODO: Integrate real CAPTCHA widget and set captcha_token here. */}
      <input type="hidden" value={form.captcha_token} readOnly />
      <Button type="submit" className="w-full" disabled={loading}>{loading ? "Creating..." : "Create account"}</Button>
      <Button type="button" variant="secondary" className="w-full" onClick={startGoogleLogin}>
        Continue with Google
      </Button>
      <p className="text-center text-sm text-muted">
        Already registered? <Link to="/login" className="font-medium text-brand">Log in</Link>
      </p>
    </form>
  );
}
