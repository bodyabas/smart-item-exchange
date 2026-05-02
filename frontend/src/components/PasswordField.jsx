import { useState } from "react";

export function PasswordField({ label, value, onChange, autoComplete }) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label>{label}</label>
      <div className="flex rounded-md border border-line bg-white focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required
          className="border-0 focus:ring-0"
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="shrink-0 px-3 text-sm font-medium text-muted hover:text-ink"
        >
          {visible ? "Hide" : "Show"}
        </button>
      </div>
    </div>
  );
}
