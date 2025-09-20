import { alertPopUP } from "./utils.js";

let searchFetchController = null;

// ################# GENERAL FUNCTIONS ################
// 1. Convert user badge to Greek
function greekBadge(userBadge) {
  let badgeText = "";
  switch (userBadge) {
    case "student":
      badgeText = "Φοιτητής";
      break;
    case "professor":
      badgeText = "Καθηγητής";
      break;
    case "secretary":
      badgeText = "Γραμματεία";
      break;
  }
  return badgeText;
}

// ################ UPLOAD and RENDER USERS functions ################
// 1. Upload data to the server
function uploadData(formData, modalContainer) {
  try {
    uploadDataRequest(formData).then((response) => {
      if (response && response.success) {
        closeImportModal(modalContainer);
        const message = response.message;
        alertPopUP(message, "green");
        const usersList = document.getElementById("users-list");
        if (usersList) {
          usersList.innerHTML = "";
          if (response.data && response.data.length > 0) {
            response.data.forEach((user) => {
              usersList.appendChild(renderUser(user));
            });
          } else {
            usersList.innerHTML = "";
            const noData = document.createElement("p");
            noData.textContent = "Δεν βρέθηκαν χρήστες";
            noData.className = "no-data";
            usersList.appendChild(noData);
          }
        }
      } else {
        alertPopUP(response.error, "red");
      }
    });
  } catch (error) {
    const message = "Σφάλμα κατά την αποστολή δεδομένων. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

async function uploadDataRequest(formData) {
  try {
    const response = await fetch("/api/users/upload", {
      method: "POST",
      body: formData,
    });

    return await response.json();
  } catch (err) {
    const message = "Σφάλμα κατά την αποστολή δεδομένων. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

// 2. Open import modal and handle its logic
function openImportModal() {
  const modalContainer = document.querySelector(".modal-container");
  if (!modalContainer) return;
  modalContainer.classList.add("active");
  document.body.classList.add("no-scroll");

  const closeButton = modalContainer.querySelector(".close-modal");
  if (closeButton && !closeButton.dataset.bound) {
    closeButton.dataset.bound = "true";
    closeButton.addEventListener("click", () =>
      closeImportModal(modalContainer)
    );
  }

  const confirmButton = modalContainer.querySelector("#confirm-import");
  if (confirmButton) {
    confirmButton.addEventListener("click", async () => {
      if (checkFormStatus(modalContainer)) {
        const formData = new FormData();
        const linkInput = modalContainer.querySelector('input[type="text"]');
        const fileInput = modalContainer.querySelector('input[type="file"]');

        formData.append("jsonLink", linkInput.value.trim());
        formData.append("jsonFile", fileInput.files[0]);
        uploadData(formData, modalContainer);
      }
    });
  }

  const modalInputs = modalContainer.querySelectorAll("input");
  modalInputs.forEach((input) => {
    input.addEventListener("input", async (e) => {
      if (input.type === "text") {
        if (input.value.trim().length > 0) {
          input.classList.add("modified");
          const response = await checkUrlExists(input.value.trim());
          if (response) {
            input.classList.add("valid");
          } else {
            input.classList.remove("valid");
          }
        } else {
          input.classList.remove("modified");
          const labelLink = document.querySelector('label[for="import-link"]');
          const spanWarning = labelLink.querySelector("span");
          spanWarning.classList.remove("red", "green", "yellow");
          spanWarning.textContent = "";
          input.classList.remove("valid");
        }
      } else if (input.type === "file") {
        if (input.files && input.files.length > 0) {
          input.classList.add("modified");
          const isValid = await validateLocalJSON(input.files[0]);
          if (isValid) {
            input.classList.add("valid");
          } else {
            input.classList.remove("valid");
          }
        } else {
          input.classList.remove("modified");
          const labelFile = document.querySelector('label[for="import-file"]');
          const spanWarning = labelFile.querySelector("span");
          spanWarning.classList.remove("red", "green", "yellow");
          spanWarning.textContent = "";
          input.classList.remove("valid");
        }
      }
      checkFormStatus(modalContainer);
    });
  });
}

// ################## MODAL FUNCTIONS ################
// Define required fields by role
const requiredFields = {
  student: [
    "role",
    "firstName",
    "lastName",
    "birthDate",
    "mobilePhone",
    "phone",
    "department",
    "email",
    "yearOfStudies",
    "studentId",
    "hasThesis",
    "thesisId",
  ],
  professor: [
    "role",
    "firstName",
    "lastName",
    "birthDate",
    "mobilePhone",
    "phone",
    "department",
    "typeProfessor",
    "email",
  ],
  secretary: [
    "role",
    "firstName",
    "lastName",
    "birthDate",
    "mobilePhone",
    "phone",
    "department",
    "email",
  ],
};

// 1. Validate local JSON file
function validateLocalJSON(file) {
  return new Promise((resolve) => {
    const labelFile = document.querySelector('label[for="import-file"]');
    let spanWarning = labelFile.querySelector("span");

    // Create span if not exists
    if (!spanWarning) {
      spanWarning = document.createElement("span");
      labelFile.appendChild(spanWarning);
    }

    // Reset styles
    spanWarning.classList.remove("red", "green", "yellow");
    spanWarning.textContent = "";

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (!Array.isArray(data)) {
          spanWarning.textContent =
            "Το JSON πρέπει να είναι πίνακας αντικειμένων";
          spanWarning.classList.add("red");
          return resolve(false);
        }

        // Validate each object
        for (const [index, item] of data.entries()) {
          if (!item.role || !requiredFields[item.role]) {
            spanWarning.textContent = `Άγνωστος ρόλος στο αντικείμενο ${index}`;
            spanWarning.classList.add("red");
            return resolve(false);
          }

          const missingFields = requiredFields[item.role].filter(
            (f) => !(f in item)
          );
          if (missingFields.length > 0) {
            spanWarning.textContent = `Λείπουν πεδία για τον ρόλο ${
              item.role
            } στο αντικείμενο ${index}: ${missingFields.join(", ")}`;
            spanWarning.classList.add("red");
            return resolve(false);
          }
        }

        spanWarning.textContent = "Έγκυρο Αρχείο JSON";
        spanWarning.classList.add("green");
        resolve(true);
      } catch (err) {
        spanWarning.textContent = "Το αρχείο δεν περιέχει έγκυρο JSON";
        spanWarning.classList.add("red");
        resolve(false);
      }
    };

    reader.onerror = () => {
      spanWarning.textContent = "Σφάλμα κατά την ανάγνωση του αρχείου";
      spanWarning.classList.add("red");
      resolve(false);
    };

    reader.readAsText(file);
  });
}

// 2. Check if URL exists and validate JSON structure
async function checkUrlExists(url) {
  try {
    // Add https:// if missing
    if (!/^https?:\/\//i.test(url)) {
      url = "https://" + url;
    }

    const labelLink = document.querySelector('label[for="import-link"]');
    const spanWarning = labelLink.querySelector("span");
    spanWarning.classList.remove("red", "green", "yellow");
    spanWarning.textContent = "";

    const response = await fetch(url);
    if (!response.ok) {
      spanWarning.textContent = "Μη Έγκυρος";
      spanWarning.classList.add("red");
      alertPopUP("Ο σύνδεσμος δεν είναι προσβάσιμος", "red");
      return false;
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      spanWarning.textContent = "Μη Έγκυρος";
      spanWarning.classList.add("red");
      alertPopUP("Μη έγκυρο JSON", "red");
      return false;
    }

    if (!Array.isArray(data)) {
      spanWarning.textContent = "Μη Έγκυρος";
      spanWarning.classList.add("red");
      alertPopUP("Το JSON πρέπει να είναι πίνακας αντικειμένων", "red");
      return false;
    }

    // Validate each object
    for (const [index, item] of data.entries()) {
      if (!item.role || !requiredFields[item.role]) {
        spanWarning.textContent = "Μη Έγκυρος";
        spanWarning.classList.add("red");
        alertPopUP(`Άγνωστος ρόλος στο αντικείμενο ${index}`, "red");
        return false;
      }

      const missingFields = requiredFields[item.role].filter(
        (f) => !(f in item)
      );
      if (missingFields.length > 0) {
        spanWarning.textContent = "Μη Έγκυρος";
        spanWarning.classList.add("red");
        alertPopUP(
          `Λείπουν πεδία για τον ρόλο ${
            item.role
          } στο αντικείμενο ${index}: ${missingFields.join(", ")}`,
          "red"
        );
        return false;
      }
    }

    // Everything is valid
    spanWarning.textContent = "Έγκυρος";
    spanWarning.classList.add("green");
    return true;
  } catch (err) {
    const labelLink = document.querySelector('label[for="import-link"]');
    const spanWarning = labelLink.querySelector("span");
    if (spanWarning) {
      spanWarning.textContent = "Μη Έγκυρος";
      spanWarning.classList.add("red");
    }
    alertPopUP("Σφάλμα κατά την πρόσβαση στον σύνδεσμο", "red");
    return false;
  }
}

// 3. Check form status and enable/disable confirm button
function checkFormStatus(modalContainer) {
  if (!modalContainer) return false;
  const modalInputs = modalContainer.querySelectorAll("input");
  const checkAll = Array.from(modalInputs).some((input) =>
    input.classList.contains("modified")
  );

  const allModified = Array.from(modalInputs).filter((input) =>
    input.classList.contains("modified")
  );
  const checkValid =
    allModified.length > 0 &&
    allModified.every((input) => input.classList.contains("valid"));

  const confirmButton = modalContainer.querySelector("#confirm-import");
  if (confirmButton) {
    if (checkAll && checkValid) {
      confirmButton.classList.remove("disabled");
    } else {
      confirmButton.classList.add("disabled");
    }
  }

  return checkAll && checkValid;
}

// 4. Close import modal and reset its state
function closeImportModal(modalContainer) {
  if (!modalContainer) return;
  modalContainer.classList.remove("active");
  document.body.classList.remove("no-scroll");
  const modalInputs = modalContainer.querySelectorAll("input");
  modalInputs.forEach((input) => {
    input.value = "";
    input.classList.remove("modified");
    const label = document.querySelector(`label[for="${input.id}"]`);
    if (label) {
      const spanWarning = label.querySelector("span");
      if (spanWarning) {
        spanWarning.textContent = "";
        spanWarning.classList.remove("red", "green", "yellow");
      }
    }
    input.classList.remove("valid");
  });
}

// ################# SEARCH and RENDER USERS functions ################
// 1. Render user item
function renderUser(user) {
  const userItem = document.createElement("a");
  userItem.href = `/user/${user.username}`;
  userItem.className = "user-item";

  const divContent = document.createElement("div");
  divContent.className = "user-item-content";

  const profilePreview = document.createElement("div");
  profilePreview.className = "profile-photo-preview";

  const profileImg = document.createElement("img");
  profileImg.src = user.profilePhoto;
  profileImg.alt = "Profile Photo";
  profileImg.className = "profile-photo-img";

  profilePreview.appendChild(profileImg);

  const groupItemInfo = document.createElement("div");
  groupItemInfo.className = "group-item-info";

  const nameP = document.createElement("p");
  nameP.className = "user-item-name";
  nameP.textContent = `${user.lastName} ${user.firstName}`;
  groupItemInfo.appendChild(nameP);

  const badgeP = document.createElement("p");
  badgeP.className = "info-badge";
  badgeP.textContent = greekBadge(user.role);

  groupItemInfo.appendChild(badgeP);

  divContent.appendChild(profilePreview);
  divContent.appendChild(groupItemInfo);

  userItem.appendChild(divContent);

  return userItem;
}

// 2. Search users
function userSearch(inputValue) {
  if (searchFetchController) searchFetchController.abort();
  searchFetchController = new AbortController();
  const signal = searchFetchController.signal;
  fetchUsers(inputValue, signal)
    .then((data) => {
      const usersList = document.getElementById("users-list");
      if (usersList) {
        usersList.innerHTML = "";
        if (data && data.length > 0) {
          data.forEach((user) => {
            usersList.appendChild(renderUser(user));
          });
        } else {
          usersList.innerHTML = "";
          const noData = document.createElement("p");
          noData.textContent = "Δεν βρέθηκαν χρήστες";
          noData.className = "no-data";
          usersList.appendChild(noData);
        }
      }
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      const thesesList = document.getElementById("users-list");
      if (thesesList) {
        thesesList.innerHTML =
          '<p class="no-data error">Σφάλμα φόρτωσης δεδομένων. Προσπαθήστε ξανά</p>';
      }
    });
}

// Debounce utility
function debounce(fn, delay) {
  let timer = null;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// 3. Fetch users from server
async function fetchUsers(inputValue, signal) {
  try {
    const response = await fetch(
      `/api/users?q=${encodeURIComponent(inputValue)}`,
      { signal }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    return data.users;
  } catch (err) {
    if (err.name !== "AbortError") {
      throw err;
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const importUsersButton = document.getElementById("import-users");
  if (importUsersButton) {
    importUsersButton.addEventListener("click", openImportModal);
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal-container.active")
        .forEach((container) => closeImportModal(container));
    }
  });

  const searchInput = document.getElementById("search-users");
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    const runSearch = () => {
      userSearch(searchInput.value.trim());
    };
    searchInput.addEventListener("input", debounce(runSearch, 300));
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        userSearch(searchInput.value);
      } else if (searchInput.value === "") {
        searchInput.value = "";
        userSearch(searchInput.value);
      }
    });
  }
});
