import { useState } from "react";

import { resolveMediaUrl } from "../api/client.js";
import { categoryLabel, conditionLabel, statusLabel } from "../utils/labels.js";
import { Button } from "./Button.jsx";

const scoreComponents = [
  ["desired_exchange_similarity", "Бажаний обмін"],
  ["item_similarity", "Схожість речей"],
  ["category_relevance", "Відповідність категорії"],
  ["city_match", "Місто"],
  ["condition_score", "Стан"],
  ["freshness_score", "Дата додавання"],
];

export function RecommendationCard({ recommendation, onCreateRequest }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const source = recommendation.source_item;
  const item = recommendation.recommended_item || recommendation.item;
  const finalScore = Number(recommendation.final_score || 0);
  const components = withDisplayFallbacks(
    recommendation.components || {},
    source,
    item
  );
  const reasons = buildReasons(components, item);

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="border-b border-line p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">AI-рекомендація</p>
            <h3 className="mt-1 text-lg font-semibold text-gray-900">{item?.title || "Запропонована річ"}</h3>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
              {toPercent(finalScore)} збіг
            </span>
            <p className="mt-1 text-xs font-semibold text-muted">
              {qualityLabel(finalScore)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <ItemMatchPanel label="Ваша річ" item={source} />
        <ItemMatchPanel label="Запропонований збіг" item={item} />
      </div>

      <div className="space-y-4 px-5 pb-5">
        <section className="rounded-2xl bg-surface p-4">
          <h4 className="text-sm font-semibold">Чому рекомендовано?</h4>
          {reasons.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink shadow-sm"
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              Ця річ частково відповідає вашим побажанням до обміну.
            </p>
          )}
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm font-semibold">Деталі оцінки</p>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="text-sm font-semibold text-brand hover:text-teal-800"
          >
            {detailsOpen ? "Приховати деталі" : "Показати деталі"}
          </button>
        </div>

        {detailsOpen ? (
          <section>
            <h4 className="mb-2 text-sm font-semibold">Складові оцінки</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {scoreComponents.map(([key, label]) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={Number(components[key] || 0)}
                  emptyLabel={
                    key === "category_relevance" ? "Низька відповідність категорії" : null
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        <Button className="w-full" onClick={() => onCreateRequest?.(source, item)}>
          Створити запит на обмін
        </Button>
      </div>
    </article>
  );
}

function ItemMatchPanel({ label, item }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <section className="rounded-2xl border border-line bg-white p-4">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <div className="mt-3 flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
          {image ? (
            <img src={image} alt={item?.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
              Без фото
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-semibold text-gray-900">{item?.title || "Річ"}</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{statusLabel(item?.status || "available")}</Badge>
            <Badge>{categoryLabel(item?.category)}</Badge>
            <Badge>{item?.city || "місто"}</Badge>
            <Badge>{conditionLabel(item?.condition)}</Badge>
          </div>
          {item?.desired_exchange ? (
            <p className="mt-2 line-clamp-2 text-xs text-muted">
              Хоче {item.desired_exchange}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-brand">
      {children}
    </span>
  );
}

function ScoreBar({ label, value, emptyLabel }) {
  const width = Math.max(0, Math.min(100, Math.round(value * 100)));

  return (
    <div className="rounded-2xl bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-muted">{label}</span>
        <span className="font-semibold">
          {emptyLabel && width === 0 ? emptyLabel : `${width}%`}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div className="h-full rounded-full bg-brand" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function buildReasons(components, item) {
  const reasons = [];
  if (Number(components.desired_exchange_similarity || 0) > 0.5) {
    reasons.push("Відповідає бажаній речі");
  }
  if (Number(components.category_relevance || 0) > 0.5) {
    reasons.push(`Та сама категорія (${categoryLabel(item?.category)})`);
  }
  if (Number(components.city_match || 0) === 1) {
    reasons.push(`Те саме місто (${item?.city || "місто"})`);
  }
  if (Number(components.condition_score || 0) > 0.5) {
    reasons.push(`Схожий стан (${conditionLabel(item?.condition)})`);
  }
  if (Number(components.freshness_score || 0) > 0.7) {
    reasons.push("Нещодавно додано");
  }
  return reasons;
}

function withDisplayFallbacks(components, source, item) {
  const nextComponents = { ...components };
  const sameCategory =
    source?.category &&
    item?.category &&
    source.category.trim().toLowerCase() === item.category.trim().toLowerCase();

  if (sameCategory) {
    nextComponents.category_relevance = Math.max(
      Number(nextComponents.category_relevance || 0),
      0.8
    );
  }

  return nextComponents;
}

function qualityLabel(score) {
  if (score >= 0.75) return "Відмінний збіг";
  if (score >= 0.55) return "Хороший збіг";
  if (score >= 0.35) return "Можливий збіг";
  return "Низька релевантність";
}

function toPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}
