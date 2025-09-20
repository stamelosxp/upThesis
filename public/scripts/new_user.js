import { alertPopUP, isValidDateInput } from "./utils.js";

let validateEmail, validatePhone;

// 1. Create user object
function createUserObject(
  firstName,
  lastName,
  birthDate,
  department,
  email,
  mobile,
  phone,
  gender,
  userType,
  extraField
) {
  return {
    firstName: firstName,
    lastName: lastName,
    birthDate: birthDate,
    department: department,
    email: email,
    mobilePhone: mobile,
    phone: phone,
    gender: gender,
    userType: userType,
    extraField: extraField,
  };
}

// 2. Validate select inputs
function validSelect(inputElement) {
  const labelElement = document.querySelector(
    `label[for='${inputElement.id}']`
  );
  const spanWarning = labelElement.querySelector("span");
  if (!spanWarning) return;
  // Clear previous messages and styles
  spanWarning.textContent = "";
  spanWarning.classList.remove("red", "green", "yellow");
  inputElement.classList.remove("valid");
  if (inputElement.value === "default") {
    spanWarning.textContent = "Απαιτείται";
    spanWarning.classList.add("yellow");
    inputElement.classList.remove("valid");
  } else {
    spanWarning.textContent = "Έγκυρο πεδιο";
    spanWarning.classList.add("green");
    inputElement.classList.add("valid");
  }
}

// 3. Render dynamic fields based on user type (student or professor)
function renderDynamicFields(userType) {
  const dynamicFieldsContainer = document.getElementById("dynamic-fields");
  if (dynamicFieldsContainer) {
    if (userType === "student") {
      dynamicFieldsContainer.innerHTML = "";
      // Add student-specific fields here
      const studentLabel = document.createElement("label");
      studentLabel.htmlFor = "student-year-studies";
      studentLabel.textContent = "Έτος Σπουδών";
      studentLabel.style.marginBottom = "0.8rem";
      const studentSpan = document.createElement("span");
      studentSpan.className = "warning-message";
      studentLabel.appendChild(studentSpan);
      const studentInput = document.createElement("input");
      //only integer numbers
      studentInput.type = "number";
      studentInput.id = "student-year-studies";
      studentInput.name = "student-year-studies";
      studentInput.min = "1";
      studentInput.className = "extra-field-input";
      dynamicFieldsContainer.appendChild(studentLabel);
      dynamicFieldsContainer.appendChild(studentInput);
      validateInput(studentInput, studentLabel, 1, 4);
      studentInput.addEventListener("input", () => {
        studentInput.value = studentInput.value.replace(/\D/g, "");
        validateInput(studentInput, studentLabel, 1, null);
        allValidInputs();
      });

      const studentAmLabel = document.createElement("label");
      studentAmLabel.htmlFor = "student-am";
      studentAmLabel.textContent = "Αριθμός Μητρώου";
      studentAmLabel.style.marginBottom = "0.8rem";

      const studentAmSpan = document.createElement("span");
      studentAmSpan.className = "warning-message";
      studentAmLabel.appendChild(studentAmSpan);
      const studentAmInput = document.createElement("input");
      //only integer numbers
      studentAmInput.type = "number";
      studentAmInput.id = "student-am";
      studentAmInput.name = "student-am";
      studentAmInput.min = "1";
      studentAmInput.className = "extra-field-input";
      dynamicFieldsContainer.appendChild(studentAmLabel);
      dynamicFieldsContainer.appendChild(studentAmInput);
      validateInput(studentAmInput, studentAmLabel, 1, null);
      studentAmInput.addEventListener("input", () => {
        studentAmInput.value = studentAmInput.value.replace(/\D/g, "");
        validateInput(studentAmInput, studentAmLabel, 1, null);
        allValidInputs();
      });
    } else {
      dynamicFieldsContainer.innerHTML = "";
      const professorTypeLabel = document.createElement("label");
      professorTypeLabel.htmlFor = "professor-type";
      professorTypeLabel.textContent = "Ιδιότητά Καθηγητή";
      const professorSpan = document.createElement("span");
      professorSpan.className = "warning-message";
      professorTypeLabel.appendChild(professorSpan);

      const professorInput = document.createElement("input");
      professorInput.type = "text";
      professorInput.id = "professor-type";
      professorInput.name = "professor-type";
      professorInput.className = "extra-field-input";

      dynamicFieldsContainer.appendChild(professorTypeLabel);
      dynamicFieldsContainer.appendChild(professorInput);
      validateInput(professorInput, professorTypeLabel, 2, 50);
      professorInput.addEventListener("input", () => {
        validateInput(professorInput, professorTypeLabel, 2, 50);
        allValidInputs();
      });
    }
  }
}

// 4. Date input with flatpickr
function setDateTimeInput(inputElement) {
  const today = new Date();
  const maxDate = new Date();
  maxDate.setFullYear(today.getFullYear() - 17);

  flatpickr("#birth-date-input", {
    locale: "gr",
    dateFormat: "d/m/Y",
    allowInput: true,
    maxDate: maxDate,
  });

  validateDateInput(inputElement);
}

// 5. Check if text input contains numbers or special characters
function checkTextNumberOrSpecial(input) {
  // Unicode ranges:
  // a-zA-Z -> English letters
  // \u0370-\u03FF -> Greek and Coptic letters (includes accented Greek)
  // \s -> space
  const regex = /[^\sa-zA-Z\u0370-\u03FF]/;
  return regex.test(input); // true if contains number or special character
}

// 6. Validate text inputs
function validateInput(inputElement, labelElement, minLength, maxLength) {
  const spanWarning = labelElement.querySelector("span");
  const inputValue = inputElement.value.trim();
  if (!spanWarning) return;
  // Clear previous messages and styles
  spanWarning.textContent = "";
  spanWarning.classList.remove("red", "green", "yellow");
  inputElement.classList.remove("valid");

  if (inputValue.length === 0) {
    spanWarning.textContent = "Απαιτείται";
    spanWarning.classList.add("yellow");
    inputElement.classList.remove("valid");
  } else if (
    inputElement.type === "text" &&
    checkTextNumberOrSpecial(inputValue)
  ) {
    spanWarning.textContent = "Μόνο γράμματα επιτρέπονται";
    spanWarning.classList.add("red");
    inputElement.classList.remove("valid");
  } else if (maxLength && inputValue > maxLength) {
    spanWarning.textContent = `Μέγιστο μήκος ${maxLength} χαρακτήρες`;
    spanWarning.classList.add("red");
    inputElement.classList.remove("valid");
  } else if (minLength && inputValue.length < minLength) {
    spanWarning.textContent = `Ελάχιστο μήκος ${minLength} χαρακτήρες`;
    spanWarning.classList.add("red");
    inputElement.classList.remove("valid");
  } else if (
    inputValue.length >= minLength &&
    (maxLength ? inputValue.length <= maxLength : true)
  ) {
    spanWarning.textContent = `Έγκυρο πεδιο`;
    spanWarning.classList.add("green");
    inputElement.classList.add("valid");
  }
}

// 7. Validate date input and check if user is at least 17 years old
function validateDateInput(inputElement, length) {
  const value = inputElement.value.trim();
  const labelInput = document.querySelector(`label[for='${inputElement.id}']`);
  if (!labelInput) return;
  const spanWarning = labelInput.querySelector("span");
  spanWarning.classList.remove("red", "green", "yellow");
  spanWarning.textContent = "";
  if (value.length === 10) {
    if (isValidDateInput(value)) {
      //compare date to today - 17 years
      const parts = value.split("/");
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1; // JS months 0-11
      const year = parseInt(parts[2], 10);
      const inputDate = new Date(year, month, day);
      const today = new Date();
      const minDate = new Date();
      minDate.setFullYear(today.getFullYear() - 17);
      if (inputDate > minDate) {
        inputElement.classList.remove("valid");
        spanWarning.textContent = "Μη έγκυρη ημερομηνία";
        spanWarning.classList.add("red");
      } else {
        inputElement.classList.add("valid");
        spanWarning.textContent = "Έγκυρο πεδιο";
        spanWarning.classList.add("green");
      }
    } else {
      inputElement.classList.remove("valid");
      spanWarning.textContent = "Μη έγκυρη ημερομηνία";
      spanWarning.classList.add("red");
    }
  } else if (value.length > 0) {
    inputElement.classList.remove("valid");
    spanWarning.textContent = "Μη έγκυρη ημερομηνία";
    spanWarning.classList.add("red");
  } else {
    inputElement.classList.remove("valid");
    spanWarning.textContent = "Απαιτείται";
    spanWarning.classList.add("yellow");
  }
}

// 8. Check if all inputs are valid to enable submit button
function allValidInputs() {
  const formGroup = document.querySelector("#profile-details-form");
  if (!formGroup) return;
  const allInputs = formGroup.querySelectorAll(
    "input[type='text'], input[type='email'], input[type='tel'], input[type='number'], input[id='birth-date-input']"
  );
  const allSelects = formGroup.querySelectorAll("select");

  const checkAll = Array.from(allInputs).every((input) => {
    return input.classList.contains("valid");
  });

  const checkSelects = Array.from(allSelects).every((select) => {
    return select.classList.contains("valid");
  });

  const submitButton = document.getElementById("save-new-user-button");
  if (submitButton) {
    if (checkAll && checkSelects) {
      submitButton.classList.remove("disabled");
    } else {
      submitButton.classList.add("disabled");
    }
  }
  return checkAll && checkSelects;
}

// 9. Upload user to server
function uploadUser(userObject) {
  try {
    uploadUserRequest(userObject).then((response) => {
      if (response && response.success) {
        const message = "Ο χρήστης δημιουργήθηκε επιτυχώς.";
        alertPopUP(message, "green");
        setTimeout(() => {
          window.location.href = "/users";
        }, 1500);
      } else {
        const message =
          response && response.message
            ? response.message
            : "Σφάλμα κατά τη δημιουργία χρήστη. Προσπαθήστε ξανά.";
        alertPopUP(message, "red");
      }
    });
  } catch (e) {
    const message = "Σφάλμα κατά τη δημιουργία χρήστη. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

async function uploadUserRequest(userObject) {
  try {
    const response = await fetch("/api/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userObject),
    });
    return await response.json();
  } catch (error) {
    const message = "Σφάλμα κατά τη δημιουργία χρήστη. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

document.addEventListener("DOMContentLoaded", async function () {
  const usersUtils = await import("./users/users-utils.js");
  if (!usersUtils) {
    return;
  }
  validateEmail = usersUtils.validateEmail;
  validatePhone = usersUtils.validatePhone;

  const formGroup = document.querySelector("#profile-details-form");
  if (formGroup) {
    const editableInputs = formGroup.querySelectorAll("input");
    if (editableInputs) {
      editableInputs.forEach((input) => {
        const labelInput = document.querySelector(`label[for='${input.id}']`);
        if (input.id === "phone" || input.id === "mobile") {
          validatePhone(
            input,
            labelInput,
            input.id === "phone" ? "phone" : "mobile"
          );
          input.addEventListener("input", () => {
            validatePhone(
              input,
              labelInput,
              input.id === "phone" ? "phone" : "mobile"
            );
            allValidInputs();
          });
        } else if (input.id === "email") {
          validateEmail(input, labelInput, allValidInputs);
          input.addEventListener("input", () => {
            validateEmail(input, labelInput, allValidInputs);
          });
        } else if (input.id !== "birth-date-input") {
          let lengthLimits = { min: 2, max: 50 };
          if (typeof input.id === "school") {
            lengthLimits = { min: 2, max: 200 };
          }
          validateInput(input, labelInput, lengthLimits.min, lengthLimits.max);
          input.addEventListener("input", () => {
            validateInput(
              input,
              labelInput,
              lengthLimits.min,
              lengthLimits.max
            );
            allValidInputs();
          });
        } else {
          setDateTimeInput(input);
          input.addEventListener("input", () => {
            validateDateInput(input);
            allValidInputs();
          });
        }
      });
    }
  }

  const saveButton = document.getElementById("save-new-user-button");
  if (saveButton) {
    saveButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (allValidInputs()) {
        const firstName = document.getElementById("first-name").value.trim();
        const lastName = document.getElementById("last-name").value.trim();
        const birthDate = document
          .getElementById("birth-date-input")
          .value.trim();
        const department = document.getElementById("school").value.trim();
        const email = document.getElementById("email").value.trim();
        const mobile = document.getElementById("mobile").value.trim();
        const phone = document.getElementById("phone").value.trim();
        const userTypeSelect = document.getElementById("type-id");
        const userType = userTypeSelect ? userTypeSelect.value.trim() : null;
        const userGenderSelect = document.getElementById("gender");
        const gender = userGenderSelect ? userGenderSelect.value.trim() : null;
        const dynamicFieldInputs =
          document.querySelectorAll(".extra-field-input");
        let extraField = null;
        if (dynamicFieldInputs && dynamicFieldInputs.length > 0) {
          if (userType === "student") {
            extraField = { studentId: null, yearOfStudies: null };
            const yearOfStudiesInput = document.getElementById(
              "student-year-studies"
            );
            const studentAmInput = document.getElementById("student-am");
            extraField["yearOfStudies"] =
              yearOfStudiesInput && yearOfStudiesInput.value.trim().length > 0
                ? parseInt(yearOfStudiesInput.value.trim())
                : null;
            extraField["studentId"] =
              studentAmInput && studentAmInput.value.trim().length > 0
                ? parseInt(studentAmInput.value.trim())
                : null;
          } else if (userType === "professor") {
            const professorTypeInput =
              document.getElementById("professor-type");
            if (
              professorTypeInput &&
              professorTypeInput.value.trim().length > 0
            ) {
              extraField = professorTypeInput.value.trim();
            }
          }
        }

        const newUser = createUserObject(
          firstName,
          lastName,
          birthDate,
          department,
          email,
          mobile,
          phone,
          gender,
          userType,
          extraField
        );
        uploadUser(newUser);
      }
    });
  }

  // User Type Select
  const userTypeSelect = document.getElementById("type-id");
  if (userTypeSelect) {
    validSelect(userTypeSelect);
    allValidInputs();
    userTypeSelect.addEventListener("change", () => {
      validSelect(userTypeSelect);
      renderDynamicFields(userTypeSelect.value);
      allValidInputs();
    });
  }

  const userGenderSelect = document.getElementById("gender");
  if (userGenderSelect) {
    validSelect(userGenderSelect);
    allValidInputs();
    userGenderSelect.addEventListener("change", () => {
      validSelect(userGenderSelect);
      allValidInputs();
    });
  }
});
