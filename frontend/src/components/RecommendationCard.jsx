import { Button } from "./Button.jsx";

const componentLabels = {
  desired_exchange_similarity: "Desired exchange",
  item_similarity: "Item similarity",
  mutual_interest_score: "Mutual interest",
  category_relevance: "Category relevance",
  city_match: "City match",
  condition_score: "Condition",
  freshness_score: "Freshness",
};

export function RecommendationCard({ recommendation, onCreateRequest }) {
  const source = recommendation.source_item;
  const item = recommendation.recommended_item || recommendation.item;

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-start">
        <div>
          <p className="text-xs font-semibold uppercase text-muted">Your item</p>
          <h3 className="mt-1 font-semibold">{source?.title || "Source item"}</h3>
          <p className="text-sm text-muted">{source?.desired_exchange}</p>
        </div>
        <div>
          <p className="text-xs font-semibold uppercase text-muted">Recommended</p>
          <h3 className="mt-1 font-semibold">{item?.title}</h3>
          <p className="text-sm text-muted">{item?.category} - {item?.city}</p>
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <span className="rounded-full bg-brand px-3 py-1 text-sm font-semibold text-white">
            {Number(recommendation.final_score || 0).toFixed(2)}
          </span>
          <Button onClick={() => onCreateRequest?.(source, item)}>
            Create request
          </Button>
        </div>
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(recommendation.components || {}).map(([key, value]) => (
          <div key={key} className="rounded-md bg-surface px-3 py-2">
            <p className="text-xs text-muted">{componentLabels[key] || key}</p>
            <p className="text-sm font-semibold">{Number(value || 0).toFixed(2)}</p>
          </div>
        ))}
      </div>
    </article>
  );
}
