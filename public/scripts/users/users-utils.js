import { alertPopUP, hasSpace, hasSpecialChar } from "../utils.js";

let usernameAbortController = null;
let emailAbortController = null;


// ################ PHONE and EMAIL functions ################
// 1. Validate phone number
export function validatePhone(input, label, type) {
  const inputPhone = input.value.trim();
  const labelWarning = label.querySelector("span");
  if (!labelWarning) return;
  labelWarning.textContent = "";
  labelWarning.classList.remove("red", "green", "yellow");
  input.classList.remove("valid");

  if (inputPhone.length === 0 && type === "mobile") {
    labelWarning.textContent = "Απαιτείται";
    labelWarning.classList.add("yellow");
    input.classList.remove("valid");
    return;
  } else if (inputPhone.length === 0 && type === "phone") {
    labelWarning.textContent = "";
    labelWarning.classList.remove("red", "green", "yellow");
    input.classList.add("valid");
    return;
  }

  if (inputPhone.length !== 10) {
    labelWarning.textContent = "Μη έγκυρο τηλέφωνο";
    labelWarning.classList.add("red");
    input.classList.remove("valid");
    return;
  }

  if (/\D/.test(inputPhone)) {
    labelWarning.textContent = "Μη έγκυρο τηλέφωνο";
    labelWarning.classList.add("red");
    input.classList.remove("valid");
    return;
  }

  if (!inputPhone.startsWith("69") && type === "mobile") {
    labelWarning.textContent = "Μη έγκυρο τηλέφωνο";
    labelWarning.classList.add("red");
    input.classList.remove("valid");
    return;
  } else if (!inputPhone.startsWith("2") && type === "phone") {
    labelWarning.textContent = "Μη έγκυρο τηλέφωνο";
    labelWarning.classList.add("red");
    input.classList.remove("valid");
    return;
  }
  labelWarning.textContent = "Έγκυρο τηλέφωνο";
  labelWarning.classList.add("green");
  input.classList.add("valid");
}

// 2. Validate email
export function validateEmail(input, label, onComplete) {
  const valuedEmail = input.value.trim();

  const labelWarning = label.querySelector("span");
  if (!labelWarning) return;
  labelWarning.textContent = "";
  labelWarning.classList.remove("red", "green", "yellow");
  input.classList.remove("valid");

  if (valuedEmail.length === 0) {
    labelWarning.textContent = "Απαιτείται";
    labelWarning.classList.add("yellow");
    input.classList.remove("valid");
    if (typeof onComplete === "function") onComplete();
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(valuedEmail)) {
    input.classList.remove("valid");
    labelWarning.textContent = "Μη έγκυρο email";
    labelWarning.classList.add("red");
    if (typeof onComplete === "function") onComplete();
    return;
  }

  if (emailAbortController) {
    emailAbortController.abort();
  }
  emailAbortController = new AbortController();

  fetchEmailAvailability(valuedEmail, emailAbortController.signal)
    .then((response) => {
      if (response && response.success) {
        if (response.available) {
          input.classList.add("valid");
          labelWarning.textContent = "Έγκυρο email";
          labelWarning.classList.add("green");
        } else {
          input.classList.remove("valid");
          labelWarning.textContent = "Το email χρησιμοποιείται ήδη";
          labelWarning.classList.add("red");
        }
      }
    })
    .finally(() => {
      if (typeof onComplete === "function") onComplete();
    });
}

// 2. Fetch email availability from server
async function fetchEmailAvailability(email, signal) {
  try {
    const response = await fetch(
      `/api/users/available/email/${encodeURI(email)}`,
      {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        signal,
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    return await response.json();
  } catch (error) {
    alertPopUP("Πρόβλημά ελέγχου email.", "red");
    return null;
  }
}

// ################ USERNAME functions ################
// 1. Validate username
export function validateUsername(input, onComplete) {
  const inputUsername = input.value.trim();
  const label = document.querySelector(`label[for="${input.id}"]`);
  const spanLabel = label.querySelector("span");
  spanLabel.textContent = "";
  spanLabel.classList.remove("red", "green", "yellow");

  input.classList.remove("valid");

  if (inputUsername.length === 0) {
    spanLabel.classList.add("yellow");
    spanLabel.textContent = "Απαιτείται";
    input.classList.remove("valid");
    if (typeof onComplete === "function") onComplete();

    return;
  }

  if (hasSpace(inputUsername)) {
    spanLabel.classList.add("red");
    spanLabel.textContent = "Μη έγκυρο όνομα χρήστη";
    input.classList.remove("valid");
    if (typeof onComplete === "function") onComplete();

    return;
  }
  if (hasSpecialChar(inputUsername)) {
    spanLabel.classList.add("red");
    spanLabel.textContent = "Μη έγκυρο όνομα χρήστη";
    input.classList.remove("valid");
    if (typeof onComplete === "function") onComplete();
    return;
  }
  if (inputUsername.length < 3 || inputUsername.length > 15) {
    spanLabel.classList.add("red");
    spanLabel.textContent = "3-15 χαρακτήρες";
    input.classList.remove("valid");
    if (typeof onComplete === "function") onComplete();

    return;
  }

    // 🔹 Abort previous request before making a new one
  if (usernameAbortController) {
    usernameAbortController.abort();
  }
  usernameAbortController = new AbortController();

  const trimmedUsername = inputUsername.trim();
  checkUsernameAvailability(trimmedUsername, usernameAbortController.signal)
    .then((response) => {
      if (response && response.success) {
        if (response.available) {
          input.classList.add("valid");
          spanLabel.textContent = "Διαθέσιμο όνομα χρήστη";
          spanLabel.classList.add("green");
        } else {
          input.classList.remove("valid");
          spanLabel.textContent = "Το όνομα χρήστη χρησιμοποιείται ήδη";
          spanLabel.classList.add("red");
        }
      }
    })
    .finally(() => {
      if (typeof onComplete === "function") onComplete();
    });
}

// 2. Fetch username availability from server
async function checkUsernameAvailability(trimmedUsername, abortSignal) {
  try {
    const response = await fetch(
      `/api/users/available/username/${encodeURIComponent(trimmedUsername)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: abortSignal,
      }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (e) {
    console.error("Error checking username availability:", e);
    if (typeof onComplete === "function") onComplete("error");
  }
}
