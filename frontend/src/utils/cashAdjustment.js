export function getCashDirectionOptions(currentUserId, senderId, receiverId) {
  return [
    { value: "none", label: "Немає" },
    {
      value: "sender_pays",
      label: cashDirectionLabel("sender_pays", currentUserId, senderId, receiverId),
    },
    {
      value: "receiver_pays",
      label: cashDirectionLabel("receiver_pays", currentUserId, senderId, receiverId),
    },
  ];
}

export function cashDirectionLabel(direction, currentUserId, senderId, receiverId) {
  if (direction === "none") return "Немає";
  const currentUserPays =
    (direction === "sender_pays" && currentUserId === senderId) ||
    (direction === "receiver_pays" && currentUserId === receiverId);
  return currentUserPays ? "Я доплачую" : "Інший користувач доплачує";
}

export function validateCashAdjustment(amount, direction) {
  const numericAmount = Number(amount || 0);
  if (numericAmount > 0 && (!direction || direction === "none")) {
    return "Будь ласка, виберіть, хто доплачує різницю.";
  }
  return "";
}

export function normalizeCashDirection(amount, direction) {
  return Number(amount || 0) === 0 ? "none" : direction;
}

export function formatCashAdjustment(requestOrOffer) {
  const amount = Number(requestOrOffer?.cash_adjustment_amount || 0);
  const direction = requestOrOffer?.cash_adjustment_direction || "none";

  if (!amount || direction === "none") {
    return "Без доплати";
  }

  const payer = direction === "sender_pays" ? "Відправник" : "Отримувач";
  return `${payer} доплачує ${amount}`;
}
