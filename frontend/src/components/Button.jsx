export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand text-white shadow-sm hover:bg-teal-800 hover:shadow-md",
    secondary: "border border-line bg-white text-ink shadow-sm hover:border-slate-300 hover:bg-surface hover:shadow-md",
    danger: "bg-red-600 text-white shadow-sm hover:bg-red-700 hover:shadow-md",
  };

  return (
    <button
      className={`rounded-xl px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
