export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_ITEM_IMAGES = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export function validateImageFile(file) {
  if (!file) return "";
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return "Only JPG, PNG and WEBP images are allowed.";
  }
  if (file.size >= MAX_IMAGE_SIZE_BYTES) {
    return "Image size must be less than 5MB.";
  }
  return "";
}

export function validateImageFiles(files, existingCount = 0) {
  if (existingCount + files.length > MAX_ITEM_IMAGES) {
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
