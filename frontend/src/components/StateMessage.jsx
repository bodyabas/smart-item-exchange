export function LoadingState({ label = "Завантаження..." }) {
  return <div className="rounded-2xl border border-line bg-white p-5 text-sm text-muted shadow-soft">{label}</div>;
}

export function ErrorState({ message }) {
  if (!message) return null;
  return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700 shadow-soft">{message}</div>;
}

export function EmptyState({ message }) {
  return <div className="rounded-2xl border border-line bg-white p-6 text-sm text-muted shadow-soft">{message}</div>;
}
