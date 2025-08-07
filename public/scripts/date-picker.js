document.addEventListener("DOMContentLoaded", function () {
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
  }
});
