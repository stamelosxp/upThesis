import { alertPopUP, clearSpanWarning } from "./utils.js";

// 1. Check login form validity
function checkLoginForm() {
  let usernameValid = false;
  let passwordValid = false;
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const usernameLabel = document.querySelector(
    `label[for="${usernameInput.id}"]`
  );
  const passwordLabel = document.querySelector(
    `label[for="${passwordInput.id}"]`
  );
  clearSpanWarning(usernameLabel);
  clearSpanWarning(passwordLabel);

  if (usernameInput.value.trim().length === 0) {
    usernameLabel.querySelector("span").textContent = "Απαιτείται";
    usernameLabel.querySelector("span").classList.add("yellow");
    usernameValid = false;
  } else {
    clearSpanWarning(usernameLabel);
    usernameValid = true;
  }

  if (passwordInput.value.length === 0) {
    passwordLabel.querySelector("span").textContent = "Απαιτείται";
    passwordLabel.querySelector("span").classList.add("yellow");
    passwordValid = false;
  } else {
    clearSpanWarning(passwordLabel);
    passwordValid = true;
  }

  return usernameValid && passwordValid;
}

// 2. Login function
function login(username, password, rememberMe) {
  const loginData = {
    username: username,
    password: password,
    rememberMe: rememberMe,
  };
  loginRequest(loginData).then((response) => {
    if (response?.success) {
      const message = "Επιτυχής σύνδεση! Ανακατεύθυνση...";
      alertPopUP(message, "green");
      setTimeout(() => {
        window.location.href = "/home";
      }, 1500);
    } else if (response.type === "invalid_credentials") {
      const usernameLabel = document.querySelector(`label[for="username"]`);
      const passwordLabel = document.querySelector(`label[for="password"]`);

      clearSpanWarning(usernameLabel);
      clearSpanWarning(passwordLabel);

      usernameLabel.querySelector("span").textContent = "Μη έγκυρα στοιχεία";
      usernameLabel.querySelector("span").classList.add("red");

      passwordLabel.querySelector("span").textContent = "Μη έγκυρα στοιχεία";
      passwordLabel.querySelector("span").classList.add("red");
    } else {
      const message = "Σφάλμα σύνδεσης. Προσπαθήστε ξανά αργότερα.";
      alertPopUP(message, "red");
    }
  });
}

async function loginRequest(loginData) {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(loginData),
    });

    return await response.json();
  } catch (err) {
    alertPopUP("Σφάλμα σύνδεσης. Προσπαθήστε ξανά αργότερα.", "red");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  // Password visibility toggle
  const passwordVisibilityToggles = document.querySelectorAll(
    ".toggle-password-visibility"
  );

  if (passwordVisibilityToggles.length > 0) {
    passwordVisibilityToggles.forEach(function (btn) {
      btn.addEventListener("click", function () {
        const targetId = btn.getAttribute("data-target");
        const input = document.getElementById(targetId);
        if (!input) return;
        if (input.type === "password") {
          input.type = "text";
          btn.querySelector("img").style.opacity = "0.5";
        } else {
          input.type = "password";
          btn.querySelector("img").style.opacity = "1";
        }
      });
    });
  }

  const inputFields = document.querySelectorAll(
    ".form-group input[type = text], .form-group input[type = password]"
  );

  if (inputFields.length > 0) {
    inputFields[0].focus();
    checkLoginForm();
    inputFields.forEach((input) => {
      input.addEventListener("input", () => {
        checkLoginForm();
      });
    });
  }

  const loginButton = document.getElementById("login-button");
  loginButton.addEventListener("click", (event) => {
    event.preventDefault();
    if (checkLoginForm()) {
      const username = document.getElementById("username").value.trim();
      const password = document.getElementById("password").value;
      const rememberMe = document.getElementById("remember-me").checked;
      login(username, password, rememberMe);
    }
  });

  // Clear URL hash on page load
  window.addEventListener("load", () => {
    if (window.location.hash) {
      history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search
      );
    }
  });
});
