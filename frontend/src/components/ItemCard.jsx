import { Link } from "react-router-dom";

import { resolveMediaUrl } from "../api/client.js";
import { categoryLabel, conditionLabel, statusLabel } from "../utils/labels.js";

export function ItemCard({ item }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);
  const photosCount = item?.images?.length || 0;

  return (
    <Link
      to={`/items/${item.id}`}
      className="block overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-md"
    >
      <div className="relative aspect-[4/3] bg-slate-100">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            Без фото
          </div>
        )}
        {photosCount > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-full bg-ink/80 px-2 py-1 text-xs font-semibold text-white">
            {photosCount} фото
          </span>
        ) : null}
      </div>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-lg font-semibold text-gray-900">{item.title}</h3>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-brand">
            {statusLabel(item.status)}
          </span>
        </div>
        <p className="line-clamp-2 text-sm leading-6 text-gray-600">{item.description}</p>
        <div className="flex flex-wrap gap-2 text-xs font-medium text-gray-600">
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{categoryLabel(item.category)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{conditionLabel(item.condition)}</span>
          <span className="rounded-full bg-slate-100 px-2.5 py-1">{item.city}</span>
        </div>
        {item.desired_exchange ? (
          <p className="text-sm text-gray-700">
            Хоче <span className="font-medium">{item.desired_exchange}</span>
          </p>
        ) : null}
      </div>
    </Link>
  );
}
