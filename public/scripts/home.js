import { alertPopUP } from "./utils.js";

// 1. Initialize date picker for events
function initDatePicker() {
  const datePicker = document.querySelector(".events-date-picker");
  if (datePicker) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    const todayStr = `${yyyy}-${mm}-${dd}`;
    // Set value and min attribute
    datePicker.value = todayStr;
    datePicker.setAttribute("min", todayStr);
    const eventsList = document.getElementById("events-list");
    const noEventsData = eventsList.querySelector(".no-data");
    if (noEventsData) {
      const spanDate = noEventsData.querySelector("#chosen-date");
      if (spanDate) {
        //will be removed when events are added
        spanDate.textContent = `${dd}/${mm}/${yyyy}`;
      }
    }

    datePicker.onchange = function () {
      const selectedDate = new Date(this.value);
      const yyyy = selectedDate.getFullYear();
      const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
      const dd = String(selectedDate.getDate()).padStart(2, "0");
      // Fetch and display events for the selected date
      // For now, just update the no events message
      if (noEventsData) {
        const spanDate = noEventsData.querySelector("#chosen-date");
        if (!spanDate) return;
        //will be removed when events are added
        spanDate.textContent = `${dd}/${mm}/${yyyy}`;
      }
    };
  }
}

// 2. Toggle notification item view (expand/collapse)
function toggleNotificationsView() {
  const notificationItems = document.querySelectorAll(".notification-item");
  notificationItems.forEach(function (notificationItem) {
    notificationItem.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      const content = notificationItem.querySelector(".notification-content");
      if (!content) return;
      if (content.classList.contains("collapsed")) {
        content.classList.remove("collapsed");
        content.classList.add("expanded");
      } else {
        content.classList.remove("expanded");
        content.classList.add("collapsed");
      }
    };
  });
}

// 3. Clear all notifications
function clearNotifications() {
  const notificationList = document.getElementById("notification-list");
  const hasNoData = !!notificationList.querySelector(".no-data");

  if (hasNoData) {
    return;
  }
  if (notificationList && notificationList.children.length > 0) {
    notificationList.innerHTML = "";
  }

  const noData = document.createElement("p");
  noData.textContent = "Δεν υπάρχουν ειδοποιήσεις";
  noData.className = "no-data";
  notificationList.appendChild(noData);

  const message = "Όλες οι ειδοποιήσεις διαγράφηκαν";
  popUpAlert(message, "green");

  //send request to server to clear notifications
}

document.addEventListener("DOMContentLoaded", function () {
  const message = document.querySelector('main').dataset.flashMessage;
  console.log("Flash message element:", message);
  if (message) {
    const msgText = message.trim();
    if (msgText.length > 0) {
      alertPopUP(msgText, "green", 5000);
    }
  }
  initDatePicker();
  toggleNotificationsView();

  const clearNotificationsBtn = document.getElementById("clear-notifications");
  if (clearNotificationsBtn) {
    clearNotificationsBtn.addEventListener("click", clearNotifications);
  }
});
