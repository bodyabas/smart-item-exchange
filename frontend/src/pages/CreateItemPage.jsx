import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, getErrorMessage } from "../api/client.js";
import { ItemForm } from "../components/ItemForm.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  buildImageFormData,
  createPreviewUrl,
  MAX_ITEM_IMAGES,
  validateImageFiles,
} from "../utils/imageUpload.js";

const initialItem = {
  title: "",
  description: "",
  category: "",
  condition: "used",
  city: "",
  desired_exchange: "",
};

export function CreateItemPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(initialItem);
  const [imageFiles, setImageFiles] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectImages = (event) => {
    const newFiles = Array.from(event.target.files || []);
    const validationError = validateImageFiles(newFiles);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      event.target.value = "";
      return;
    }

    const nextFiles = [...imageFiles];
    let maxExceeded = false;
    for (const file of newFiles) {
      if (nextFiles.length >= MAX_ITEM_IMAGES) {
        maxExceeded = true;
        break;
      }

      const duplicate = nextFiles.some(
        (existingFile) =>
          existingFile.name === file.name && existingFile.size === file.size
      );
      if (!duplicate) {
        nextFiles.push(file);
      }
    }

    if (maxExceeded) {
      const message = `Можна завантажити до ${MAX_ITEM_IMAGES} фото.`;
      setError(message);
      toast.error(message);
      setImageFiles(nextFiles);
      setImagePreviews(nextFiles.map((file) => createPreviewUrl(file)));
      event.target.value = "";
      return;
    }

    const nextValidationError = validateImageFiles(nextFiles);
    if (nextValidationError) {
      setError(nextValidationError);
      toast.error(nextValidationError);
      event.target.value = "";
      return;
    }

    setError("");
    setImageFiles(nextFiles);
    setImagePreviews(nextFiles.map((file) => createPreviewUrl(file)));
    event.target.value = "";
  };

  const removeImage = (indexToRemove) => {
    const nextFiles = imageFiles.filter((_, index) => index !== indexToRemove);
    setImageFiles(nextFiles);
    setImagePreviews(nextFiles.map((file) => createPreviewUrl(file)));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!imageFiles.length) {
      const message = "Оберіть щонайменше одне фото речі.";
      setError(message);
      toast.error(message);
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/items", item);
      const createdItemId = response.data.item.id;
      for (const file of imageFiles) {
        await api.post(`/uploads/items/${createdItemId}`, buildImageFormData(file));
      }
      toast.success("Річ створено.");
      toast.success("Фото завантажено.");
      setImageFiles([]);
      setImagePreviews([]);
      navigate(`/items/${createdItemId}`);
    } catch (err) {
      const message = `Річ створено не повністю: ${getErrorMessage(err)}`;
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Додати річ" subtitle="Створіть оголошення та опишіть, що хочете отримати натомість." />
      <ErrorState message={error} />
      <section className="mb-6 rounded-2xl border border-line bg-white p-5 shadow-soft">
        <label>Фото речі</label>
        <p className="mt-1 text-sm text-muted">
          Завантажте до {MAX_ITEM_IMAGES} фото. JPG, PNG або WEBP. Максимум 5MB для кожного.
          Перше фото буде головним.
        </p>
        <p className="mt-1 text-sm font-medium text-brand">
          {imageFiles.length} / {MAX_ITEM_IMAGES} фото вибрано
        </p>
        <div className="mt-3 space-y-4">
          {imagePreviews.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {imagePreviews.map((preview, index) => (
                <div
                  key={`${preview}-${index}`}
                  className="relative overflow-hidden rounded-2xl border border-line bg-white p-2 shadow-sm"
                >
                  <div className="h-32 w-full overflow-hidden rounded-xl bg-slate-100">
                    <img
                      src={preview}
                      alt={`Вибрана річ ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={loading}
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-ink shadow-soft hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Видалити
                  </button>
                  <p className="mt-2 truncate text-xs text-muted">
                    {index + 1}. {imageFiles[index]?.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/1] min-h-28 items-center justify-center rounded-2xl bg-slate-100 text-sm text-muted">
              Фото не вибрано
            </div>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={selectImages}
            disabled={loading || imageFiles.length >= MAX_ITEM_IMAGES}
          />
          {imageFiles.length >= MAX_ITEM_IMAGES ? (
            <p className="text-sm text-muted">Досягнуто ліміт фото.</p>
          ) : null}
        </div>
      </section>
      <ItemForm value={item} onChange={setItem} onSubmit={submit} loading={loading} />
    </div>
  );
}
