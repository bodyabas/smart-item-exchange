import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "../components/Button.jsx";
import { PasswordField } from "../components/PasswordField.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
import { TurnstileWidget } from "../components/TurnstileWidget.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { API_BASE_URL, getErrorMessage } from "../api/client.js";

export function RegisterPage() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();
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
      const message = "Passwords do not match";
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...payload } = form;
      await register(payload);
      toast.success("Account created successfully.");
      navigate("/dashboard");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
      setForm((currentForm) => ({ ...currentForm, captcha_token: "" }));
      setCaptchaResetKey((currentKey) => currentKey + 1);
    } finally {
      setLoading(false);
    }
  };

  const startGoogleLogin = () => {
    window.location.href = `${API_BASE_URL}/auth/google/login`;
  };

  const passwordStrength = getPasswordStrength(form.password);
  const passwordsDoNotMatch =
    form.confirm_password && form.password !== form.confirm_password;

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
      <PasswordStrengthIndicator strength={passwordStrength} />
      <p className="text-sm text-muted">
        Password must be at least 8 characters and include letters and numbers.
        Strong passwords use at least 10 characters with uppercase, lowercase,
        number, and special character.
      </p>
      <PasswordField
        label="Confirm password"
        value={form.confirm_password}
        autoComplete="new-password"
        onChange={(event) =>
          setForm({ ...form, confirm_password: event.target.value })
        }
      />
      {passwordsDoNotMatch ? (
        <p className="text-sm font-medium text-red-600">Passwords do not match</p>
      ) : null}
      <TurnstileWidget
        key={captchaResetKey}
        onToken={(token) => setForm((currentForm) => ({ ...currentForm, captcha_token: token }))}
        onExpire={() => setForm((currentForm) => ({ ...currentForm, captcha_token: "" }))}
        onError={() => {
          setError("CAPTCHA failed to load. Please try again.");
          toast.error("CAPTCHA failed to load. Please try again.");
        }}
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

function getPasswordStrength(password) {
  const hasMinLength = password.length >= 8;
  const hasLetter = /[A-Za-z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasSpecial = /[^A-Za-z0-9]/.test(password);

  if (
    password.length >= 10 &&
    hasUppercase &&
    hasLowercase &&
    hasNumber &&
    hasSpecial
  ) {
    return "Strong";
  }

  if (hasMinLength && hasLetter && hasNumber) {
    return "Medium";
  }

  return "Weak";
}

function PasswordStrengthIndicator({ strength }) {
  const styles = {
    Weak: "bg-red-50 text-red-700 border-red-200",
    Medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Strong: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className={`rounded-md border p-3 text-sm font-medium ${styles[strength]}`}>
      Password strength: {strength}
    </div>
  );
}
