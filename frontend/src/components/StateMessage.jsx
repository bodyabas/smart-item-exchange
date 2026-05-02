export function LoadingState({ label = "Loading..." }) {
  return <div className="rounded-md border border-line bg-white p-5 text-sm text-muted">{label}</div>;
}

export function ErrorState({ message }) {
  if (!message) return null;
  return <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</div>;
}

export function EmptyState({ message }) {
  return <div className="rounded-md border border-line bg-white p-5 text-sm text-muted">{message}</div>;
}
