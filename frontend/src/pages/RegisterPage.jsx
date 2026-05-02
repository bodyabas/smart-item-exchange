import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/Button.jsx";
import { PasswordField } from "../components/PasswordField.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
import { TurnstileWidget } from "../components/TurnstileWidget.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { API_BASE_URL, getErrorMessage } from "../api/client.js";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirm_password: "",
    captcha_token: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirm_password) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...payload } = form;
      await register(payload);
      navigate("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
      setForm((currentForm) => ({ ...currentForm, captcha_token: "" }));
      setCaptchaResetKey((currentKey) => currentKey + 1);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
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
      <PasswordField
        label="Password"
        value={form.password}
        autoComplete="new-password"
        onChange={(event) => setForm({ ...form, password: event.target.value })}
      />
      <PasswordField
        label="Confirm password"
        value={form.confirm_password}
        autoComplete="new-password"
        onChange={(event) =>
          setForm({ ...form, confirm_password: event.target.value })
        }
      />
      <TurnstileWidget
        key={captchaResetKey}
        onToken={(token) => setForm((currentForm) => ({ ...currentForm, captcha_token: token }))}
        onExpire={() => setForm((currentForm) => ({ ...currentForm, captcha_token: "" }))}
        onError={() => setError("CAPTCHA failed to load. Please try again.")}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={loading || (turnstileSiteKey && !form.captcha_token)}
      >
        {loading ? "Creating..." : "Create account"}
      </Button>
      <Button type="button" variant="secondary" className="w-full" onClick={startGoogleLogin}>
        Continue with Google
      </Button>
      <p className="text-center text-sm text-muted">
        Already registered? <Link to="/login" className="font-medium text-brand">Log in</Link>
      </p>
    </form>
  );
}
