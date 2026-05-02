import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { api, getErrorMessage } from "../api/client.js";
import { ItemForm } from "../components/ItemForm.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { ErrorState } from "../components/StateMessage.jsx";
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
      setError(`You can upload up to ${MAX_ITEM_IMAGES} images.`);
      setImageFiles(nextFiles);
      setImagePreviews(nextFiles.map((file) => createPreviewUrl(file)));
      event.target.value = "";
      return;
    }

    const nextValidationError = validateImageFiles(nextFiles);
    if (nextValidationError) {
      setError(nextValidationError);
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
      setError("Please select at least one item image.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/items", item);
      const createdItemId = response.data.item.id;
      for (const file of imageFiles) {
        await api.post(`/uploads/items/${createdItemId}`, buildImageFormData(file));
      }
      setImageFiles([]);
      setImagePreviews([]);
      navigate(`/items/${createdItemId}`);
    } catch (err) {
      setError(`Item was not fully created: ${getErrorMessage(err)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Add item" subtitle="Create a listing and describe what you want in return." />
      <ErrorState message={error} />
      <section className="mb-5 rounded-lg border border-line bg-white p-5 shadow-soft">
        <label>Item images</label>
        <p className="mt-1 text-sm text-muted">
          Upload up to {MAX_ITEM_IMAGES} images. JPG, PNG or WEBP. Max 5MB each.
          The first image will be used as the main photo.
        </p>
        <p className="mt-1 text-sm font-medium text-brand">
          {imageFiles.length} / {MAX_ITEM_IMAGES} images selected
        </p>
        <div className="mt-3 space-y-4">
          {imagePreviews.length ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {imagePreviews.map((preview, index) => (
                <div
                  key={`${preview}-${index}`}
                  className="relative overflow-hidden rounded-md border border-line bg-white p-2"
                >
                  <div className="h-32 w-full overflow-hidden rounded bg-slate-100">
                    <img
                      src={preview}
                      alt={`Selected item ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    disabled={loading}
                    className="absolute right-3 top-3 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-ink shadow-soft hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Remove
                  </button>
                  <p className="mt-2 truncate text-xs text-muted">
                    {index + 1}. {imageFiles[index]?.name}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex aspect-[4/1] min-h-28 items-center justify-center rounded-md bg-slate-100 text-sm text-muted">
              No images selected
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
            <p className="text-sm text-muted">Image limit reached.</p>
          ) : null}
        </div>
      </section>
      <ItemForm value={item} onChange={setItem} onSubmit={submit} loading={loading} />
    </div>
  );
}
