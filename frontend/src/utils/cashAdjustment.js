export function getCashDirectionOptions(currentUserId, senderId, receiverId) {
  return [
    { value: "none", label: "None" },
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
  if (direction === "none") return "None";
  const currentUserPays =
    (direction === "sender_pays" && currentUserId === senderId) ||
    (direction === "receiver_pays" && currentUserId === receiverId);
  return currentUserPays ? "I pay" : "Other user pays";
}

export function validateCashAdjustment(amount, direction) {
  const numericAmount = Number(amount || 0);
  if (numericAmount > 0 && (!direction || direction === "none")) {
    return "Please choose who pays the cash adjustment.";
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
    return "No cash adjustment";
  }

  const payer = direction === "sender_pays" ? "Sender" : "Receiver";
  return `${payer} pays ${amount}`;
}
