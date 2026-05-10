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
      const message = "Паролі не збігаються";
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const { confirm_password, ...payload } = form;
      await register(payload);
      toast.success("Акаунт створено.");
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
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-soft">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Створити акаунт</h1>
        <p className="text-sm text-muted">Додавайте речі та обмінюйтеся ними.</p>
      </div>
      <ErrorState message={error} />
      <div>
        <label>Ім'я</label>
        <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
      </div>
      <div>
        <label>Електронна пошта</label>
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      </div>
      <PasswordField
        label="Пароль"
        value={form.password}
        autoComplete="new-password"
        onChange={(event) => setForm({ ...form, password: event.target.value })}
      />
      <PasswordStrengthIndicator strength={passwordStrength} />
      <p className="text-sm text-muted">
        Пароль має містити щонайменше 8 символів, літери та цифри.
        Надійний пароль має щонайменше 10 символів, великі й малі літери,
        цифру та спеціальний символ.
      </p>
      <PasswordField
        label="Підтвердіть пароль"
        value={form.confirm_password}
        autoComplete="new-password"
        onChange={(event) =>
          setForm({ ...form, confirm_password: event.target.value })
        }
      />
      {passwordsDoNotMatch ? (
        <p className="text-sm font-medium text-red-600">Паролі не збігаються</p>
      ) : null}
      <TurnstileWidget
        key={captchaResetKey}
        onToken={(token) => setForm((currentForm) => ({ ...currentForm, captcha_token: token }))}
        onExpire={() => setForm((currentForm) => ({ ...currentForm, captcha_token: "" }))}
        onError={() => {
          setError("CAPTCHA не завантажилася. Спробуйте ще раз.");
          toast.error("CAPTCHA не завантажилася. Спробуйте ще раз.");
        }}
      />
      <Button
        type="submit"
        className="w-full"
        disabled={loading || (turnstileSiteKey && !form.captcha_token)}
      >
        {loading ? "Створення..." : "Створити акаунт"}
      </Button>
      <Button type="button" variant="secondary" className="w-full" onClick={startGoogleLogin}>
        Продовжити з Google
      </Button>
      <p className="text-center text-sm text-muted">
        Уже зареєстровані? <Link to="/login" className="font-medium text-brand">Увійти</Link>
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
    return "Надійний";
  }

  if (hasMinLength && hasLetter && hasNumber) {
    return "Середній";
  }

  return "Слабкий";
}

function PasswordStrengthIndicator({ strength }) {
  const styles = {
    Слабкий: "bg-red-50 text-red-700 border-red-200",
    Середній: "bg-yellow-50 text-yellow-700 border-yellow-200",
    Надійний: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className={`rounded-xl border p-3 text-sm font-medium ${styles[strength]}`}>
      Надійність пароля: {strength}
    </div>
  );
}
