import { Button } from "./Button.jsx";
import { ITEM_CATEGORIES } from "../constants/itemCategories.js";

const defaultValues = {
  title: "",
  description: "",
  category: "",
  condition: "used",
  city: "",
  desired_exchange: "",
};

export function ItemForm({ value = defaultValues, onChange, onSubmit, loading }) {
  const update = (field, nextValue) => onChange({ ...value, [field]: nextValue });

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-lg border border-line bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label>Title</label>
          <input value={value.title} onChange={(event) => update("title", event.target.value)} required />
        </div>
        <div>
          <label>Category</label>
          <select value={value.category} onChange={(event) => update("category", event.target.value)} required>
            <option value="">Select category</option>
            {ITEM_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label>Description</label>
        <textarea rows="4" value={value.description} onChange={(event) => update("description", event.target.value)} required />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label>Condition</label>
          <select value={value.condition} onChange={(event) => update("condition", event.target.value)}>
            <option value="new">New</option>
            <option value="like_new">Like new</option>
            <option value="used">Used</option>
            <option value="refurbished">Refurbished</option>
            <option value="broken">Broken</option>
          </select>
        </div>
        <div>
          <label>City</label>
          <input value={value.city} onChange={(event) => update("city", event.target.value)} required />
        </div>
        <div>
          <label>Desired exchange</label>
          <input value={value.desired_exchange || ""} onChange={(event) => update("desired_exchange", event.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? "Saving..." : "Save item"}</Button>
      </div>
    </form>
  );
}
