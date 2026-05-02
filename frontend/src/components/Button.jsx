export function Button({ children, variant = "primary", className = "", ...props }) {
  const variants = {
    primary: "bg-brand text-white hover:bg-teal-800",
    secondary: "border border-line bg-white text-ink hover:bg-surface",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };

  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
