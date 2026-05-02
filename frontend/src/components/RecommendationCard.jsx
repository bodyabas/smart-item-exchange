import { useState } from "react";

import { resolveMediaUrl } from "../api/client.js";
import { Button } from "./Button.jsx";

const scoreComponents = [
  ["desired_exchange_similarity", "Desired match"],
  ["item_similarity", "Item similarity"],
  ["category_relevance", "Category relevance"],
  ["city_match", "City"],
  ["condition_score", "Condition"],
  ["freshness_score", "Freshness"],
];

export function RecommendationCard({ recommendation, onCreateRequest }) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const source = recommendation.source_item;
  const item = recommendation.recommended_item || recommendation.item;
  const finalScore = Number(recommendation.final_score || 0);
  const components = recommendation.components || {};
  const reasons = buildReasons(components, item);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="border-b border-line p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-muted">AI suggested match</p>
            <h3 className="mt-1 text-lg font-semibold">{item?.title || "Suggested item"}</h3>
          </div>
          <div className="text-right">
            <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
              {toPercent(finalScore)} match
            </span>
            <p className="mt-1 text-xs font-semibold text-muted">
              {qualityLabel(finalScore)}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-4 lg:grid-cols-2">
        <ItemMatchPanel label="Your item" item={source} />
        <ItemMatchPanel label="Suggested match" item={item} />
      </div>

      <div className="space-y-4 px-4 pb-4">
        <section className="rounded-md bg-surface p-3">
          <h4 className="text-sm font-semibold">Why recommended?</h4>
          {reasons.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {reasons.map((reason) => (
                <span
                  key={reason}
                  className="rounded-full bg-white px-3 py-1 text-xs font-medium text-ink"
                >
                  {reason}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">
              This item has some similarity to your exchange preferences.
            </p>
          )}
        </section>

        <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
          <p className="text-sm font-semibold">Score details</p>
          <button
            type="button"
            onClick={() => setDetailsOpen((open) => !open)}
            className="text-sm font-semibold text-brand hover:text-teal-800"
          >
            {detailsOpen ? "Hide details" : "Show details"}
          </button>
        </div>

        {detailsOpen ? (
          <section>
            <h4 className="mb-2 text-sm font-semibold">Score breakdown</h4>
            <div className="grid gap-2 sm:grid-cols-2">
              {scoreComponents.map(([key, label]) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={Number(components[key] || 0)}
                  emptyLabel={
                    key === "category_relevance" ? "Low category match" : null
                  }
                />
              ))}
            </div>
          </section>
        ) : null}

        <Button className="w-full" onClick={() => onCreateRequest?.(source, item)}>
          Create exchange request
        </Button>
      </div>
    </article>
  );
}

function ItemMatchPanel({ label, item }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <section className="rounded-md border border-line bg-white p-3">
      <p className="text-xs font-semibold uppercase text-muted">{label}</p>
      <div className="mt-3 flex gap-3">
        <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
          {image ? (
            <img src={image} alt={item?.title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
              No image
            </div>
          )}
        </div>
        <div className="min-w-0">
          <h4 className="truncate font-semibold">{item?.title || "Item"}</h4>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge>{item?.status || "available"}</Badge>
            <Badge>{item?.category || "category"}</Badge>
            <Badge>{item?.city || "city"}</Badge>
            <Badge>{item?.condition || "condition"}</Badge>
          </div>
          {item?.desired_exchange ? (
            <p className="mt-2 line-clamp-2 text-xs text-muted">
              Wants {item.desired_exchange}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Badge({ children }) {
  return (
    <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-medium text-brand">
      {children}
    </span>
  );
}

function ScoreBar({ label, value, emptyLabel }) {
  const width = Math.max(0, Math.min(100, Math.round(value * 100)));

  return (
    <div className="rounded-md bg-surface p-3">
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
    reasons.push("Matches your desired item");
  }
  if (Number(components.category_relevance || 0) > 0.5) {
    reasons.push(`Same category (${item?.category || "category"})`);
  }
  if (Number(components.city_match || 0) === 1) {
    reasons.push(`Same city (${item?.city || "city"})`);
  }
  if (Number(components.condition_score || 0) > 0.5) {
    reasons.push(`Similar condition (${item?.condition || "condition"})`);
  }
  if (Number(components.freshness_score || 0) > 0.7) {
    reasons.push("Recently added");
  }
  return reasons;
}

function qualityLabel(score) {
  if (score >= 0.75) return "Excellent match";
  if (score >= 0.55) return "Good match";
  if (score >= 0.35) return "Possible match";
  return "Low relevance";
}

function toPercent(value) {
  return `${Math.round(Number(value || 0) * 100)}%`;
}
