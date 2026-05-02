import { Link } from "react-router-dom";

import { resolveMediaUrl } from "../api/client.js";

export function ItemCard({ item }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);
  const photosCount = item?.images?.length || 0;

  return (
    <Link
      to={`/items/${item.id}`}
      className="block overflow-hidden rounded-lg border border-line bg-white shadow-soft hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No image
          </div>
        )}
        {photosCount > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2 py-1 text-xs font-semibold text-white">
            {photosCount} photos
          </span>
        ) : null}
      </div>
      <div className="space-y-2 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold">{item.title}</h3>
          <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">
            {item.status}
          </span>
        </div>
        <p className="line-clamp-2 text-sm text-muted">{item.description}</p>
        <div className="flex flex-wrap gap-2 text-xs text-muted">
          <span>{item.category}</span>
          <span>{item.condition}</span>
          <span>{item.city}</span>
        </div>
        {item.desired_exchange ? (
          <p className="text-sm">
            Wants <span className="font-medium">{item.desired_exchange}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
