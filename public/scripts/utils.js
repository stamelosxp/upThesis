export function formatDate(dateString) {
  if (!dateString) {
    return "";
  }
  const dateObj = new Date(dateString);
  if (isNaN(dateObj.getTime())) return "";
  const day = String(dateObj.getDate()).padStart(2, "0");
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const year = dateObj.getFullYear();
  return `${day}/${month}/${year}`;
}

// Debounce utility
export function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

export function alertPopUP(message, type, duration = null) {
  const notificationPopUp = document.createElement("div");
  notificationPopUp.classList.add("popup-notification-message-container", type);
  notificationPopUp.innerHTML = ""; // Clear previous content if any

  const messageP = document.createElement("p");
  messageP.className = "popup-notification-message";
  messageP.textContent = message;

  const closePopUp = document.createElement("button");
  closePopUp.id = "popup-close";
  closePopUp.classList.add("close-modal", "popup");
  closePopUp.innerHTML = "&times;";

  closePopUp.addEventListener("click", () => {
    notificationPopUp.classList.remove("show");
    messageP.textContent = "";
  });

  notificationPopUp.appendChild(messageP);
  notificationPopUp.appendChild(closePopUp);
  document.body.appendChild(notificationPopUp);

  // Show the popup
  setTimeout(() => {
    notificationPopUp.classList.add("show");
  }, 100); // Slight delay to allow for CSS transition

  if (duration !== Infinity) {
    setTimeout(() => {
      notificationPopUp.classList.remove("show");
      messageP.textContent = "";
      setTimeout(() => {
        document.body.removeChild(notificationPopUp);
      }, 300);
    }, duration || 3000);
  }
}

export function toggleExpandCollapseView(
  collapsedContent,
  collapseButton,
  expandedContent,
  expandButton,
  checkEditMode = false
) {
  if (collapsedContent && expandedContent && expandButton && collapseButton) {
    expandButton.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      collapsedContent.classList.add("hidden");
      expandedContent.classList.remove("hidden");
    };

    collapseButton.onclick = function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (checkEditMode) {
        if (collapseButton.classList.contains("edit-mode")) {
          alert(
            "Δεν έχετε ολοκληρώσει την επεξεργασία του θέματος. Παρακαλώ αποθηκεύστε ή ακυρώστε την επεξεργασία πριν προσπαθήσετε να κλείσετε το θέμα."
          );
          return;
        }
      }
      collapsedContent.classList.remove("hidden");
      expandedContent.classList.add("hidden");
    };
  }
}

export function isValidDateInput(value) {
  // Match dd/mm/yyyy
  const regex = /^(0[1-9]|[12][0-9]|3[01])\/(0[1-9]|1[0-2])\/\d{4}$/;
  return regex.test(value);
}

export function validateInput(
  inputElement,
  labelElement,
  minLength,
  maxLength,
  required,
  specificMessage = null
) {
  if (!inputElement || !labelElement) return;
  const spanWarning = labelElement.querySelector("span");
  const inputValue = inputElement.value.trim();

  console.log(
    `Validating input: "${inputValue}", minLength: ${minLength}, maxLength: ${maxLength}, required: ${required}`
  );

  if (!spanWarning) return;

  spanWarning.textContent = "";
  spanWarning.classList.remove("red", "green", "yellow");
  inputElement.classList.remove("valid");
  if (!required && inputValue.length === 0) {
    spanWarning.textContent = "Έγκυρο πεδιο";
    spanWarning.classList.add("green");
    inputElement.classList.add("valid");
    return;
  }

  if (inputValue.length === 0 && required) {
    spanWarning.textContent = "Απαιτείται";
    spanWarning.classList.add("yellow");
    inputElement.classList.remove("valid");
  } else if (maxLength && inputValue.length > maxLength) {
    spanWarning.textContent = `Μέγιστο μήκος ${maxLength} χαρακτήρες`;
    spanWarning.classList.add("red");
    inputElement.classList.remove("valid");
  } else if (minLength && inputValue.length < minLength) {
    spanWarning.textContent = `Ελάχιστο μήκος ${minLength} χαρακτήρες`;
    spanWarning.classList.add("red");
    inputElement.classList.remove("valid");
  } else {
    spanWarning.textContent = `Έγκυρο πεδιο`;
    spanWarning.classList.add("green");
    inputElement.classList.add("valid");
  }
}

export function formatStatus(status) {
  switch (status) {
    case "pending":
      return "Εκκρεμής";
    case "accepted":
      return "Αποδεκτή";
    case "rejected":
      return "Απορριφθείσα";
  }
}

export function normalizeUrl(url) {
  if (!/^https?:\/\//i.test(url)) {
    return "https://" + url; // default to https
  }
  return url;
}

export function hasSpace(inputText) {
  return /\s/.test(inputText);
}

export function hasSpecialChar(inputText) {
  return /[^a-zA-Z0-9_]/.test(inputText);
}

export function clearSpanWarning(labelElement) {
  const spanWarning = labelElement.querySelector("span");
  spanWarning.classList.remove("red", "green", "yellow");
  spanWarning.textContent = "";
}

export function formatTime(rawDate) {
  const d = new Date(rawDate);
  if (isNaN(d.getTime())) return rawDate || "";
  const time =
    String(d.getHours()).padStart(2, "0") +
    ":" +
    String(d.getMinutes()).padStart(2, "0");
  return time;
}

// Render single link item
export function renderLink(link) {
  const aItem = document.createElement("a");
  aItem.href = normalizeUrl(link.trim());
  aItem.target = "_blank";
  aItem.className = "attachment-link";
  aItem.title = link.trim();

  const iconSpan = document.createElement("span");
  iconSpan.className = "attachment-icon";
  iconSpan.textContent = "📎";
  iconSpan.title = "Link";

  const nameSpan = document.createElement("span");
  nameSpan.className = "name-content";
  nameSpan.textContent = link
    .trim()
    .split("?")[0]
    .split("#")[0]
    .split("/")
    .filter(Boolean)
    .pop();

  const typeSpan = document.createElement("span");
  typeSpan.className = "attachment-type";
  typeSpan.textContent = "LINK";

  aItem.appendChild(iconSpan);
  aItem.appendChild(nameSpan);
  aItem.appendChild(typeSpan);
  return aItem;
}

export function ensureScheme(raw) {
  let v = (raw || "").trim();
  if (!v) return null;
  if (!/^https?:\/\//i.test(v)) {
    v = "https://" + v;
  }
  try {
    const url = new URL(v);
    if (!url.hostname || !url.hostname.includes(".")) {
      return null;
    }

    return url.href;
  } catch {
    return null;
  }
}
