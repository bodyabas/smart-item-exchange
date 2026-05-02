export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_ITEM_IMAGES = 5;

export function validateImageFile(file) {
  if (!file) return "";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Please choose a JPG, PNG, or WebP image.";
  }
  return "";
}

export function validateImageFiles(files) {
  if (files.length > MAX_ITEM_IMAGES) {
    return `You can upload up to ${MAX_ITEM_IMAGES} images.`;
  }
  for (const file of files) {
    const error = validateImageFile(file);
    if (error) return error;
  }
  return "";
}

export function createPreviewUrl(file) {
  return file ? URL.createObjectURL(file) : "";
}

export function buildImageFormData(file) {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
}
