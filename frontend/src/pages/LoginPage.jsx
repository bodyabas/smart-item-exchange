import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Button } from "../components/Button.jsx";
import { PasswordField } from "../components/PasswordField.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
import { TurnstileWidget } from "../components/TurnstileWidget.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { API_BASE_URL, getErrorMessage } from "../api/client.js";

export function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({
    email: "",
    password: "",
    captcha_token: "",
  });
  const [error, setError] = useState(
    searchParams.get("error") === "google_auth_failed"
      ? "Не вдалося увійти через Google. Спробуйте ще раз."
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const turnstileSiteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(form);
      toast.success("Вхід виконано.");
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

  return (
    <form onSubmit={submit} className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-soft">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Увійти</h1>
        <p className="text-sm text-muted">Отримайте доступ до панелі обміну.</p>
      </div>
      <ErrorState message={error} />
      <div>
        <label>Електронна пошта</label>
        <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
      </div>
      <PasswordField
        label="Пароль"
        value={form.password}
        autoComplete="current-password"
        onChange={(event) => setForm({ ...form, password: event.target.value })}
      />
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
        {loading ? "Вхід..." : "Увійти"}
      </Button>
      <Button type="button" variant="secondary" className="w-full" onClick={startGoogleLogin}>
        Продовжити з Google
      </Button>
      <p className="text-center text-sm text-muted">
        Вперше тут? <Link to="/register" className="font-medium text-brand">Створити акаунт</Link>
      </p>
    </form>
  );
}
