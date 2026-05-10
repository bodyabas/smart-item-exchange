export const categoryLabels = {
  Electronics: "Електроніка",
  "Clothing & Accessories": "Одяг та аксесуари",
  "Home & Furniture": "Дім та меблі",
  "Books & Education": "Книги та освіта",
  "Sports & Outdoor": "Спорт і активний відпочинок",
  "Hobbies & Entertainment": "Хобі та розваги",
  Collectibles: "Колекційні речі",
  "Kids & Toys": "Діти та іграшки",
  "Beauty & Health": "Краса та здоров'я",
  "Tools & DIY": "Інструменти та DIY",
  "Car & Auto": "Авто",
  Pets: "Тварини",
  Other: "Інше",
};

export const conditionLabels = {
  new: "Нова",
  like_new: "Як нова",
  used: "Вживана",
  refurbished: "Відновлена",
  broken: "Пошкоджена",
};

export const statusLabels = {
  available: "Доступна",
  exchanged: "Обміняна",
  pending: "Очікує",
  countered: "Зустрічна пропозиція",
  accepted: "Прийнято",
  rejected: "Відхилено",
  cancelled: "Скасовано",
};

export const roleLabels = {
  user: "Користувач",
  admin: "Адмін",
};

export function categoryLabel(value) {
  return categoryLabels[value] || value || "Категорія";
}

export function conditionLabel(value) {
  return conditionLabels[value] || value || "Стан";
}

export function statusLabel(value) {
  return statusLabels[value] || value || "Статус";
}

export function roleLabel(value) {
  return roleLabels[value] || value || "Роль";
}
