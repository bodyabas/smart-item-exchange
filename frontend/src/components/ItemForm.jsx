import { Button } from "./Button.jsx";
import { ITEM_CATEGORY_OPTIONS } from "../constants/itemCategories.js";
import { conditionLabel } from "../utils/labels.js";

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
    <form onSubmit={onSubmit} className="grid gap-5 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label>Назва</label>
          <input value={value.title} onChange={(event) => update("title", event.target.value)} required />
        </div>
        <div>
          <label>Категорія</label>
          <select value={value.category} onChange={(event) => update("category", event.target.value)} required>
            <option value="">Оберіть категорію</option>
            {ITEM_CATEGORY_OPTIONS.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div>
        <label>Опис</label>
        <textarea rows="4" value={value.description} onChange={(event) => update("description", event.target.value)} required />
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label>Стан</label>
          <select value={value.condition} onChange={(event) => update("condition", event.target.value)}>
            <option value="new">{conditionLabel("new")}</option>
            <option value="like_new">{conditionLabel("like_new")}</option>
            <option value="used">{conditionLabel("used")}</option>
            <option value="refurbished">{conditionLabel("refurbished")}</option>
            <option value="broken">{conditionLabel("broken")}</option>
          </select>
        </div>
        <div>
          <label>Місто</label>
          <input value={value.city} onChange={(event) => update("city", event.target.value)} required />
        </div>
        <div>
          <label>Бажаний обмін</label>
          <input value={value.desired_exchange || ""} onChange={(event) => update("desired_exchange", event.target.value)} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" disabled={loading}>{loading ? "Збереження..." : "Зберегти річ"}</Button>
      </div>
    </form>
  );
}
