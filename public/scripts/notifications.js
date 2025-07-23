// Notification expand/collapse functionality
function toggleNotification(card) {
  const content = card.querySelector(".notification-content");
  const indicator = card.querySelector(".expand-indicator");

  if (content.classList.contains("collapsed")) {
    // Expand the notification
    content.classList.remove("collapsed");
    content.classList.add("expanded");
    card.classList.add("expanded");
  } else {
    // Collapse the notification
    content.classList.remove("expanded");
    content.classList.add("collapsed");
    card.classList.remove("expanded");
  }
}
