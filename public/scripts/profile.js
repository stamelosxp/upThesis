import { alertPopUP, clearSpanWarning } from "./utils.js";

let validateEmail, validateUsername, validatePhone;

let constUserId = null;

// ############################## COMMUNICATION FUNCTIONS ##############################
// 1. Cancel communication editing and restore original values
function clearComData(communicationInfoGroup) {
  const commInputs = communicationInfoGroup.querySelectorAll("input");
  commInputs.forEach((input) => {
    input.value = input.dataset.originalValue;
    input.classList.remove("modified", "valid");
    const label = communicationInfoGroup.querySelector(
      `label[for="${input.id}"]`
    );
    if (label) {
      clearSpanWarning(label);
    }
  });

  const groupButtons = document.querySelector(
    ".form-button-group.communication"
  );
  if (groupButtons) {
    groupButtons.classList.add("hidden");
  }
  const submitButton = document.getElementById("update-com-data");
  if (submitButton) {
    submitButton.classList.add("disabled");
  }
}

// 2. Function to check communication group validity
function checkCommunicationValid() {
  const communicationInfoGroup = document.querySelector(
    ".form-group.communication"
  );
  if (!communicationInfoGroup) {
    return;
  }

  const commInputs = communicationInfoGroup.querySelectorAll("input.modified");

  const groupButtons = document.querySelector(
    ".form-button-group.communication"
  );
  const submitCommButton = groupButtons
    ? groupButtons.querySelector(".accept-button")
    : null;

  if (groupButtons) {
    if (commInputs.length > 0) groupButtons.classList.remove("hidden");
    else groupButtons.classList.add("hidden");
  }
  if (submitCommButton) {
    const allValid = Array.from(commInputs).every((input) =>
      input.classList.contains("valid")
    );
    submitCommButton.classList.toggle("disabled", !allValid);
  }
}

// 3. Function to create a communication object
function createdCommObject(emailValue, mobileValue, phoneValue) {
  return {
    email: emailValue,
    mobile: mobileValue,
    phone: phoneValue || null,
  };
}

// 4. Render communication data to the form
function renderCommunicationData(data) {
  if (!data) return;
  const communicationInfoGroup = document.querySelector(
    ".form-group.communication"
  );
  if (communicationInfoGroup) {
    const emailInput = communicationInfoGroup.querySelector("#email");
    const mobileInput = communicationInfoGroup.querySelector("#mobile");
    const phoneInput = communicationInfoGroup.querySelector("#phone");

    if (emailInput) emailInput.dataset.originalValue = data.email || "";
    if (mobileInput) mobileInput.dataset.originalValue = data.mobile || "";
    if (phoneInput) phoneInput.dataset.originalValue = data.phone || "";
    clearComData(communicationInfoGroup);
  }
}

// 5. Update communication data
function updateCommunicationData(data) {
  updateCommunicationDataRequest(data).then((res) => {
    if (res && res.success) {
      renderCommunicationData(data);
      const message = "Τα στοιχεία αποθηκεύτηκαν με επιτυχία.";
      alertPopUP(message, "green");
    } else {
      const message = "Σφάλμα κατά την αποθήκευση.";
      alertPopUP(message, "red");
    }
  });
}

async function updateCommunicationDataRequest(comData) {
  try {
    const response = await fetch(`/api/profile/update/communication/${encodeURIComponent(constUserId)}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(comData),
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    return await response.json();
  } catch (err) {
    const message = "Σφάλμα κατά την αποθήκευση.";
    alertPopUP(message, "red");
  }
}

// ############################## ACCOUNT FUNCTIONS ##############################
// 1. Function to check account group validity
function checkAccountValid() {
  const accountInfoGroup = document.querySelector(".form-group.account");
  if (!accountInfoGroup) {
    return;
  }
  const accInputs = accountInfoGroup.querySelectorAll("input.modified");

  // Show or hide the account button group based on modified inputs

  const passwordFields = ["old_password", "new_password", "confirm_password"];

  let anyModified = false;
  let allModifiedValid = true;

  for (const fieldId of passwordFields) {
    const field = document.getElementById(fieldId);
    if (!field) continue;

    if (field.classList.contains("modified")) {
      anyModified = true;
    }
  }
  if (anyModified) {
    for (const fieldId of passwordFields) {
      const field = document.getElementById(fieldId);
      if (!field) continue;

      if (!field.classList.contains("valid")) {
        allModifiedValid = false;
        break;
      }
    }
  }
  const checkAllPasswords = allModifiedValid;

  const groupButtons = document.querySelector(".form-button-group.account");
  const submitAccButton = groupButtons
    ? groupButtons.querySelector(".accept-button")
    : null;

  if (groupButtons) {
    if (accInputs.length > 0) groupButtons.classList.remove("hidden");
    else groupButtons.classList.add("hidden");
  }
  if (submitAccButton) {
    const allValid =
      Array.from(accInputs).every((input) =>
        input.classList.contains("valid")
      ) && checkAllPasswords;

    submitAccButton.classList.toggle("disabled", !allValid);
  }
}

// 2. Cancel account editing and restore original values
function clearAccData(accountInfoGroup) {
  const accInputs = accountInfoGroup.querySelectorAll("input");

  accInputs.forEach((input) => {
    if (input.id !== "photo") {
      input.value = input.dataset.originalValue;
      input.classList.remove("modified", "valid");
      const label = accountInfoGroup.querySelector(`label[for="${input.id}"]`);
      clearSpanWarning(label);
      if (
        input.id === "new_password" ||
        input.id === "confirm_password" ||
        input.id === "old_password"
      ) {
        const showPasswordButton = document.querySelector(
          `.toggle-password-visibility[data-target="${input.id}"]`
        );
        if (showPasswordButton) {
          const targetInput = document.getElementById(input.id);
          if (targetInput) {
            targetInput.type = "password";
          }
          showPasswordButton.querySelector("img").style.opacity = "1";
        }
      }
    } else {
      input.value = "";
      input.classList.remove("modified", "valid");
      const previewImg = document.getElementById("profile-photo-img");
      if (previewImg) {
        previewImg.src = input.dataset.originalValue;
      }
    }
  });

  const groupButtons = document.querySelector(".form-button-group.account");
  if (groupButtons) {
    groupButtons.classList.add("hidden");
  }
  const submitButton = document.getElementById("update-acc-data");
  if (submitButton) {
    submitButton.classList.add("disabled");
  }
}

// 3. Validate password fields
function validatePassword(currentInput, currentLabel) {
  const inputPassword = currentInput.value.trim();
  const type = currentInput.id;

  const oldPassword = document.querySelector("#old_password");
  const newPassword = document.querySelector("#new_password");
  const confirmPassword = document.querySelector("#confirm_password");
  const labelNewPassword = document.getElementById("label-new_password");
  const labelConfirmPassword = document.getElementById(
    "label-confirm_password"
  );

  const currentSpan = currentLabel.querySelector("span");
  currentSpan.classList.remove("yellow", "red", "green");
  currentSpan.textContent = "";

  if (type === "new_password" || type === "confirm_password") {
    if (oldPassword.value.length < 5 || oldPassword.value.length > 20) {
      currentSpan.textContent = "Απαιτείται ο παλιός";
      currentSpan.classList.add("yellow");
      currentInput.classList.remove("valid");
      return;
    } else {
      if (inputPassword.length < 5 || inputPassword.length > 20) {
        currentSpan.textContent = "5-20 χαρακτήρες";
        currentSpan.classList.add("red");
        currentInput.classList.remove("valid");
        return;
      } else if (newPassword.value !== confirmPassword.value) {
        const spanConfirmPassword = labelConfirmPassword.querySelector("span");
        spanConfirmPassword.textContent = "Δεν ταιριάζουν";
        spanConfirmPassword.classList.add("red");
        confirmPassword.classList.remove("valid");

        const spanNewPassword = labelNewPassword.querySelector("span");
        spanNewPassword.textContent = "Δεν ταιριάζουν";
        spanNewPassword.classList.add("red");
        newPassword.classList.remove("valid");
        return;
      } else {
        clearSpanWarning(labelNewPassword);
        clearSpanWarning(labelConfirmPassword);
        const spanNewPassword = labelNewPassword.querySelector("span");
        spanNewPassword.textContent = "Έγκυρος κωδικός";
        spanNewPassword.classList.add("green");
        newPassword.classList.add("valid");

        const spanConfirmPassword = labelConfirmPassword.querySelector("span");
        spanConfirmPassword.textContent = "Έγκυρος κωδικός";
        spanConfirmPassword.classList.add("green");
        confirmPassword.classList.add("valid");
        currentInput.classList.add("valid");
      }
      return;
    }
  } else if (type === "old_password") {
    if (newPassword.value.length > 0) {
      const labelNewPassword = document.getElementById("label-new_password");
      validatePassword(newPassword, labelNewPassword);
    }

    if (confirmPassword.value.length > 0) {
      const labelConfirmPassword = document.getElementById(
        "label-confirm_password"
      );
      validatePassword(confirmPassword, labelConfirmPassword);
    }

    if (inputPassword.length < 5 || inputPassword.length > 20) {
      currentSpan.textContent = "5-20 χαρακτήρες";
      currentSpan.classList.add("red");
      currentInput.classList.remove("valid");
      return;
    } else {
      currentSpan.classList.remove("yellow", "red", "green");
      currentSpan.textContent = "Εγκυρος κωδικός";
      currentSpan.classList.add("green");
      currentInput.classList.add("valid");
    }
  }
}

// 4. Update account data
function updateAccountData() {
  const accountInfoGroup = document.querySelector(".form-group.account");
  const usernameInput = accountInfoGroup.querySelector("#username");
  const oldPasswordInput = accountInfoGroup.querySelector("#old_password");
  const newPasswordInput = accountInfoGroup.querySelector("#new_password");
  const profilePhotoInput = accountInfoGroup.querySelector("#photo");

  const accData = new FormData();
  if (usernameInput.value.trim().length > 0) {
    accData.append("username", usernameInput.value.trim());
  }

  if (oldPasswordInput.value.trim().length > 0) {
    accData.append("old_password", oldPasswordInput.value.trim());
  }
  if (newPasswordInput.value.trim().length > 0) {
    accData.append("new_password", newPasswordInput.value.trim());
  }

  if (profilePhotoInput.files && profilePhotoInput.files[0]) {
    accData.append("photo", profilePhotoInput.files[0]);
  }

  // need to connect api and after render!
  updateAccountDataRequest(accData).then((res) => {
    if (res && res.success) {
      alertPopUP("Τα στοιχεία του λογαριασμού ενημερώθηκαν επιτυχώς.", "green");
      renderAccountData(res.data);
    } else {
      if (res && res.credFlag) {
        const passwordFields = [
          "old_password",
          "new_password",
          "confirm_password",
        ];

        const newPasswordInputs = passwordFields
          .map((id) => accountInfoGroup.querySelector(`#${id}`))
          .filter((el) => el !== null);

        newPasswordInputs.forEach((input) => {
          input.classList.remove("valid");
          input.textContent = "";
          const label = accountInfoGroup.querySelector(
            `label[for="${input.id}"]`
          );
          if (label) {
            clearSpanWarning(label);
          }
          checkAccountValid();
        });
        const message = "Λανθασμένα στοιχεία.";
        alertPopUP(message, "red");
      } else {
        const message = "Σφάλμα κατά την αποθήκευση.";
        alertPopUP(message, "red");
      }
    }
  });
}

async function updateAccountDataRequest(accData) {
  try {
    const response = await fetch("/api/profile/update/account", {
      method: "PUT",
      body: accData,
    });
    return await response.json();
  } catch (err) {
    const message = "Σφάλμα κατά την αποθήκευση.";
    alertPopUP(message, "red");
  }
}

// 5. Render account data to the form
function renderAccountData(data) {
  if (!data) return;
  const accountInfoGroup = document.querySelector(".form-group.account");
  if (accountInfoGroup) {
    const usernameInput = accountInfoGroup.querySelector("#username");
    const profilePhotoImg = document.getElementById("profile-photo-img");
    if (usernameInput && data.username)
      usernameInput.dataset.originalValue = data.username || "";
    if (profilePhotoImg && data.profilePhoto) {
      profilePhotoImg.src = data.profilePhoto;
      const profilePhotoInput = accountInfoGroup.querySelector("#photo");
      if (profilePhotoInput) {
        profilePhotoInput.dataset.originalValue = profilePhotoImg.src;
      }
    }
    clearAccData(accountInfoGroup);
  }

  const globalUserPic = document.getElementById("global-user-pic");
  const globalUsername = document.getElementById("global-user-name");
  if (globalUserPic && data.profilePhoto) {
    globalUserPic.src = data.profilePhoto;
  }
  if (globalUsername && data.username) {
    globalUsername.textContent = data.username;
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const profileDetailsForm = document.getElementById("profile-details-form");

  if (!profileDetailsForm) {
    return;
  }

  const usersUtils = await import("./users/users-utils.js");
  if (!usersUtils) {
    return;
  }
  validateEmail = usersUtils.validateEmail;
  validatePhone = usersUtils.validatePhone;
  validateUsername = usersUtils.validateUsername;

  const communicationInfoGroup = document.querySelector(
    ".form-group.communication"
  );

  if (communicationInfoGroup) {
    constUserId = communicationInfoGroup.dataset.userId;
    console.log("User id set to:", constUserId);

    const commInputs = communicationInfoGroup.querySelectorAll("input");
    if (commInputs) {
      commInputs.forEach((input) => {
        input.addEventListener("input", function () {
          const currentLabel = communicationInfoGroup.querySelector(
            `label[for="${input.id}"]`
          );
          if (input.dataset.originalValue !== input.value.trim()) {
            input.classList.add("modified");
            if (input.id === "email") {
              // pass callback to check status after validation
              validateEmail(input, currentLabel, checkCommunicationValid);
            } else {
              validatePhone(input, currentLabel, input.id);
              checkCommunicationValid();
            }
          } else {
            input.classList.remove("modified", "valid");
            clearSpanWarning(currentLabel);
            checkCommunicationValid();
          }
        });
      });
    }
  }

  const accountInfoGroup = document.querySelector(".form-group.account");
  if (accountInfoGroup) {
    const accInputs = accountInfoGroup.querySelectorAll("input");
    if (accInputs) {
      accInputs.forEach((input) => {
        input.addEventListener("input", function () {
          const currentLabel = accountInfoGroup.querySelector(
            `label[for="${input.id}"]`
          );
          if (input.id === "photo") {
            input.addEventListener("change", function (e) {
              const file = input.files && input.files[0];
              if (file) {
                const reader = new FileReader();
                reader.onload = function (event) {
                  const previewImg =
                    document.getElementById("profile-photo-img");
                  if (previewImg) {
                    previewImg.src = event.target.result;
                  }
                };
                reader.readAsDataURL(file);
              }
              input.classList.add("valid", "modified");
            });
          }
          if (input.dataset.originalValue !== input.value.trim()) {
            input.classList.add("modified");
            input.classList.remove("valid");
            if (input.id === "username") {
              validateUsername(input, checkAccountValid);
            } else if (
              input.id === "new_password" ||
              input.id === "confirm_password" ||
              input.id === "old_password"
            ) {
              validatePassword(input, currentLabel);
              checkAccountValid();
            } else if (input.id === "photo") {
              input.classList.add("valid");
              checkAccountValid();
            }
          } else {
            input.classList.remove("modified", "valid");
            clearSpanWarning(currentLabel);
            checkAccountValid();
          }
        });
      });
    }
  }

  // Handle communication data submission
  const saveComDataButton = document.getElementById("update-com-data");
  if (saveComDataButton) {
    saveComDataButton.addEventListener("click", function (e) {
      e.preventDefault();
      if (saveComDataButton.classList.contains("disabled")) {
        return;
      }
      const emailValue = communicationInfoGroup
        .querySelector("#email")
        .value.trim();
      const mobileValue = communicationInfoGroup
        .querySelector("#mobile")
        .value.trim();
      const phoneValue = communicationInfoGroup
        .querySelector("#phone")
        .value.trim();
      const commData = createdCommObject(emailValue, mobileValue, phoneValue);
      updateCommunicationData(commData);
    });
  }

  const cancelCommInputs = document.getElementById("cancel-com-data");
  if (cancelCommInputs) {
    cancelCommInputs.addEventListener("click", function (e) {
      e.preventDefault();
      clearComData(communicationInfoGroup);
    });
  }

  const saveAccDataButton = document.getElementById("update-acc-data");
  if (saveAccDataButton) {
    saveAccDataButton.addEventListener("click", function (e) {
      e.preventDefault();
      if (saveAccDataButton.classList.contains("disabled")) {
        return;
      }
      updateAccountData();
    });
  }

  const cancelAccInputs = document.getElementById("cancel-acc-data");
  if (cancelAccInputs) {
    cancelAccInputs.addEventListener("click", function (e) {
      e.preventDefault();
      clearAccData(accountInfoGroup);
    });
  }

  // Password visibility toggle logic
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
});
