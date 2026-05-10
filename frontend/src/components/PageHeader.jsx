export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-gray-600">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}
