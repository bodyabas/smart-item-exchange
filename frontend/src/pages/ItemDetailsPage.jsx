import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { ConfirmModal } from "../components/ConfirmModal.jsx";
import { CreateExchangeRequestModal } from "../components/CreateExchangeRequestModal.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { ITEM_CATEGORIES, ITEM_CATEGORY_OPTIONS } from "../constants/itemCategories.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  buildImageFormData,
  createPreviewUrl,
  MAX_ITEM_IMAGES,
  validateImageFile,
} from "../utils/imageUpload.js";
import { categoryLabel, conditionLabel, statusLabel } from "../utils/labels.js";

const editableFields = [
  "title",
  "description",
  "category",
  "condition",
  "city",
  "desired_exchange",
];

export function ItemDetailsPage() {
  const { itemId } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user, loadUser } = useAuth();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [error, setError] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const loadItem = async () => {
    const response = await api.get(`/items/${itemId}`);
    setItem(response.data.item);
    return response.data.item;
  };

  useEffect(() => {
    async function load() {
      try {
        if (isAuthenticated) {
          await loadUser();
        }
        await loadItem();
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [itemId, isAuthenticated]);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [item?.id, item?.images?.length]);

  const startEditing = () => {
    if (item.status !== "available") return;
    setError("");
    setImageFile(null);
    setImagePreview("");
    setEditForm(
      Object.fromEntries(editableFields.map((field) => [field, item[field] || ""]))
    );
    setEditing(true);
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditForm(null);
    setImageFile(null);
    setImagePreview("");
    setError("");
  };

  const deleteItem = async () => {
    setDeleting(true);
    setError("");
    try {
      await api.delete(`/items/${item.id}`);
      toast.success("Річ видалено.");
      navigate("/items");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
      setDeleteConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  const selectItemImage = (event) => {
    const file = event.target.files?.[0];
    if ((item.images?.length || 0) >= MAX_ITEM_IMAGES) {
      setError("Максимум 5 фото для однієї речі");
      toast.error("Максимум 5 фото для однієї речі");
      event.target.value = "";
      return;
    }
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      event.target.value = "";
      return;
    }
    setError("");
    setImageFile(file);
    setImagePreview(createPreviewUrl(file));
  };

  const saveChanges = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put(`/items/${item.id}`, editForm);

      if (imageFile) {
        try {
          await api.post(
            `/uploads/items/${item.id}`,
            buildImageFormData(imageFile)
          );
        } catch (uploadError) {
          setError(
            `Деталі речі збережено, але фото не завантажилося: ${getErrorMessage(
              uploadError
            )}`
          );
          toast.error(`Не вдалося завантажити фото: ${getErrorMessage(uploadError)}`);
          await loadItem();
          return;
        }
      }

      const refreshedItem = await loadItem();
      setEditing(false);
      setEditForm(null);
      setImageFile(null);
      setImagePreview("");
      if (imageFile && refreshedItem?.images?.[0]?.image_url) {
        toast.success("Річ оновлено.");
        toast.success("Фото завантажено.");
      } else {
        toast.success("Річ оновлено.");
      }
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState label="Завантаження речі..." />;
  if (!item) return <EmptyState message="Річ не знайдено." />;

  const isOwner = user?.id === item.user_id;
  const isAvailable = item.status === "available";
  const images = item.images || [];

  return (
    <div className="space-y-6">
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)]">
        <ItemImageGallery
          images={images}
          title={item.title}
          selectedIndex={selectedImageIndex}
          onSelect={setSelectedImageIndex}
        />

        <div className="space-y-4">
          <ErrorState message={error} />

          {editing ? (
            <EditItemForm
              form={editForm}
              imagePreview={imagePreview}
              imageFile={imageFile}
              saving={saving}
              existingImageCount={images.length}
              onChange={setEditForm}
              onSelectImage={selectItemImage}
              onCancel={cancelEditing}
              onSubmit={saveChanges}
            />
          ) : (
            <ItemDetailsView
              item={item}
              isOwner={isOwner}
              isAuthenticated={isAuthenticated}
              isAvailable={isAvailable}
              onEdit={startEditing}
              onDelete={() => setDeleteConfirmOpen(true)}
              onCreateRequest={() => setRequestModalOpen(true)}
              onLogin={() => navigate("/login")}
            />
          )}
        </div>
      </div>

      <CreateExchangeRequestModal
        open={requestModalOpen}
        requestedItem={item}
        onClose={() => setRequestModalOpen(false)}
        onSuccess={() => {}}
      />
      <ConfirmModal
        open={deleteConfirmOpen}
        title="Видалити річ"
        message={`Видалити "${item.title}"? Цю дію неможливо скасувати.`}
        confirmLabel="Видалити річ"
        loading={deleting}
        onCancel={() => setDeleteConfirmOpen(false)}
        onConfirm={deleteItem}
      />
    </div>
  );
}

function ItemImageGallery({ images, title, selectedIndex, onSelect }) {
  const imageUrls = images.map((image) => resolveMediaUrl(image.image_url)).filter(Boolean);
  const hasImages = imageUrls.length > 0;
  const hasMultipleImages = imageUrls.length > 1;
  const activeIndex = Math.min(selectedIndex, Math.max(imageUrls.length - 1, 0));
  const activeImage = imageUrls[activeIndex];

  const showPrevious = () => {
    onSelect(activeIndex === 0 ? imageUrls.length - 1 : activeIndex - 1);
  };

  const showNext = () => {
    onSelect(activeIndex === imageUrls.length - 1 ? 0 : activeIndex + 1);
  };

  if (!hasMultipleImages) {
    return (
      <section className="self-start overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
        <div className="relative aspect-[4/3] bg-slate-100">
          {hasImages ? (
            <img src={activeImage} alt={title} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted">
              Фото відсутнє
            </div>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="self-start overflow-hidden rounded-2xl border border-line bg-white shadow-soft">
      <div className="relative aspect-[4/3] bg-slate-100">
        <img src={activeImage} alt={title} className="h-full w-full object-cover" />

        <div className="absolute inset-x-4 top-1/2 flex -translate-y-1/2 justify-between">
          <button
            type="button"
            onClick={showPrevious}
            className="rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-white"
          >
            Назад
          </button>
          <button
            type="button"
            onClick={showNext}
            className="rounded-full bg-white/90 px-3 py-2 text-sm font-semibold text-ink shadow-soft hover:bg-white"
          >
            Далі
          </button>
        </div>
      </div>

      <div className="flex gap-3 overflow-x-auto border-t border-line p-3">
        {imageUrls.map((url, index) => (
          <button
            key={`${url}-${index}`}
            type="button"
            onClick={() => onSelect(index)}
            className={`h-20 w-24 shrink-0 overflow-hidden rounded-xl border bg-slate-100 ${
              activeIndex === index ? "border-brand ring-2 ring-brand/20" : "border-line"
            }`}
            aria-label={`Показати фото речі ${index + 1}`}
          >
            <img src={url} alt={`${title} ${index + 1}`} className="h-full w-full object-cover" />
          </button>
        ))}
      </div>
    </section>
  );
}

function ItemDetailsView({
  item,
  isOwner,
  isAuthenticated,
  isAvailable,
  onEdit,
  onDelete,
  onCreateRequest,
  onLogin,
}) {
  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{item.title}</h1>
            <p className="mt-1 text-sm text-muted">Місто: {item.city}</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-brand">
            {statusLabel(item.status)}
          </span>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <InfoTile label="Категорія" value={categoryLabel(item.category)} />
          <InfoTile label="Стан" value={conditionLabel(item.condition)} />
          <InfoTile label="Місто" value={item.city} />
        </div>
      </section>

      <InfoCard title="Опис">
        <p className="whitespace-pre-wrap text-sm leading-6 text-ink">
          {item.description || "Опис не вказано."}
        </p>
      </InfoCard>

      <InfoCard title="Бажаний обмін">
        <p className="text-sm leading-6 text-ink">
          {item.desired_exchange || "Відкрито до пропозицій"}
        </p>
      </InfoCard>

      <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
        <h2 className="text-base font-semibold">Дії обміну</h2>
        <p className="mt-1 text-sm text-muted">
          {item.status === "exchanged"
            ? "Цю річ уже обміняно, тому її більше не можна редагувати."
            : isOwner
              ? "Керуйте оголошенням або додавайте нові фото в режимі редагування."
              : isAuthenticated
                ? "Створіть запит, запропонувавши одну зі своїх доступних речей."
                : "Увійдіть, щоб створити запит на обмін для цієї речі."}
        </p>
        {isAvailable ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {isOwner ? (
              <>
                <Button variant="secondary" onClick={onEdit}>
                  Редагувати
                </Button>
                <Button variant="danger" onClick={onDelete}>
                  Видалити
                </Button>
              </>
            ) : isAuthenticated ? (
              <Button onClick={onCreateRequest}>Створити запит на обмін</Button>
            ) : (
              <Button type="button" variant="secondary" onClick={onLogin}>
                Увійти, щоб створити запит
              </Button>
            )}
          </div>
        ) : item.status === "exchanged" ? (
          <div className="mt-4 rounded-2xl bg-surface p-3 text-sm text-muted">
            Цю річ уже обміняно, тому її більше не можна редагувати.
          </div>
        ) : isOwner ? (
          <div className="mt-4 rounded-2xl bg-surface p-3 text-sm text-muted">
            Ця річ недоступна для редагування або дій обміну.
          </div>
        ) : (
          <div className="mt-4 rounded-2xl bg-surface p-3 text-sm text-muted">
            Ця річ недоступна для запитів на обмін.
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-teal-100 bg-teal-50/60 p-4 text-sm text-teal-900">
        AI-рекомендації базуються на бажаному обміні, категорії, стані та місті.
      </section>
    </div>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value || "Не вказано"}</p>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft">
      <h2 className="text-base font-semibold">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function EditItemForm({
  form,
  imagePreview,
  imageFile,
  saving,
  existingImageCount,
  onChange,
  onSelectImage,
  onCancel,
  onSubmit,
}) {
  const update = (field, value) => onChange({ ...form, [field]: value });

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-line bg-white p-5 shadow-soft">
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label>Назва</label>
          <input value={form.title} onChange={(event) => update("title", event.target.value)} />
        </div>
        <div>
          <label>Категорія</label>
          <select value={form.category} onChange={(event) => update("category", event.target.value)}>
            {!ITEM_CATEGORIES.includes(form.category) ? (
              <option value={form.category}>{categoryLabel(form.category) || "Оберіть категорію"}</option>
            ) : null}
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
        <textarea rows="4" value={form.description} onChange={(event) => update("description", event.target.value)} />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label>Стан</label>
          <select value={form.condition} onChange={(event) => update("condition", event.target.value)}>
            <option value="new">{conditionLabel("new")}</option>
            <option value="like_new">{conditionLabel("like_new")}</option>
            <option value="used">{conditionLabel("used")}</option>
            <option value="refurbished">{conditionLabel("refurbished")}</option>
            <option value="broken">{conditionLabel("broken")}</option>
          </select>
        </div>
        <div>
          <label>Місто</label>
          <input value={form.city} onChange={(event) => update("city", event.target.value)} />
        </div>
        <div>
          <label>Бажаний обмін</label>
          <input value={form.desired_exchange} onChange={(event) => update("desired_exchange", event.target.value)} />
        </div>
      </div>

      <section className="rounded-2xl bg-surface p-4">
        <label>Додаткове фото речі</label>
        <p className="mt-1 text-sm text-muted">
          Завантажте до {MAX_ITEM_IMAGES} фото. JPG, PNG або WEBP. Максимум 5MB для кожного.
        </p>
        <p className="mt-1 text-sm font-medium text-brand">
          {existingImageCount} / {MAX_ITEM_IMAGES} фото завантажено
        </p>
        <div className="mt-3 grid gap-4 md:grid-cols-[160px_1fr] md:items-center">
          <div className="aspect-[4/3] overflow-hidden rounded-xl bg-slate-100">
            {imagePreview ? (
              <img src={imagePreview} alt="Вибрана річ" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted">
                Фото не вибрано
              </div>
            )}
          </div>
          <div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={onSelectImage}
              disabled={saving || existingImageCount >= MAX_ITEM_IMAGES}
            />
            {imageFile ? <p className="mt-2 text-sm text-muted">Вибрано: {imageFile.name}</p> : null}
            {existingImageCount >= MAX_ITEM_IMAGES ? (
              <p className="mt-2 text-sm text-muted">Досягнуто ліміт фото.</p>
            ) : null}
          </div>
        </div>
      </section>

      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? "Збереження..." : "Зберегти зміни"}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={saving}>
          Скасувати
        </Button>
      </div>
    </form>
  );
}
