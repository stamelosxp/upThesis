import { alertPopUP, debounce, toggleExpandCollapseView } from "../utils.js";
import { renderCollapsedTopic, renderExpandedTopic } from "./topics-utils.js";

let searchFetchController = null;
let topicId = null;
let userRole = "professor";

const updateString = "update";
const editMode = true;

let count = 0;

// ################ GENERAL FUNCTIONS ################
// 1. Input validation functions
function validateInput(input, topicId) {
  const titleInput = "topic-input-title-" + topicId;
  const titleLabel = "label-topic-input-title-" + topicId;
  const descInput = "topic-input-desc-" + topicId;
  const descLabel = "label-topic-input-desc-" + topicId;

  input.classList.remove("valid");
  if (input.id === titleInput) {
    const label = document.getElementById(titleLabel);
    const span = label.querySelector("span");
    const inputValue = input.value;
    if (inputValue.length === 0) {
      if (span) {
        span.textContent = "Απαιτείται";
        span.classList.remove("green", "red");
        span.classList.add("yellow");
      }
    } else if (inputValue.length > 150) {
      if (span) {
        span.textContent = "Μέχρι 150 χαρακτήρες";
        span.classList.remove("green", "yellow");
        span.classList.add("red");
      }
    } else if (inputValue === input.dataset.originalValue) {
      if (span) {
        span.textContent = "";
        span.classList.remove("green", "yellow", "red");
      }
    } else if (span) {
      span.textContent = "Έγκυρος τίτλος";
      span.classList.remove("yellow", "red");
      span.classList.add("green");
      input.classList.add("valid");
    }
  } else if (input.id === descInput) {
    const label = document.getElementById(descLabel);
    const span = label.querySelector("span");
    const inputValue = input.value;

    if (inputValue.length === 0) {
      if (span) {
        span.textContent = "Απαιτείται";
        span.classList.remove("green", "red");
        span.classList.add("yellow");
      }
    } else if (inputValue.length > 500) {
      if (span) {
        span.textContent = "Μέχρι 500 χαρακτήρες";
        span.classList.remove("green", "yellow");
        span.classList.add("red");
      }
    } else if (inputValue === input.dataset.originalValue) {
      if (span) {
        span.textContent = "";
        span.classList.remove("green", "yellow", "red");
      }
    } else if (span) {
      span.textContent = "Έγκυρη Περιγραφή";
      span.classList.remove("yellow", "red");
      span.classList.add("green");
      input.classList.add("valid");
    }
  }
}

// 2. Check form state and enable/disable submit button
function checkFormState(topicId, formInputs, submitButton) {
  let checkAllValid = false;
  let modifiedInputs = null;
  modifiedInputs = formInputs.filter((i) => i.classList.contains("modified"));
  if (submitButton.id === "submit-new-topic-button") {
    modifiedInputs = formInputs.filter(
      (i) => i.classList.contains("modified") && i.type !== "file"
    );
  }

  if (modifiedInputs.length > 0) {
    if (submitButton.id === "submit-new-topic-button") {
      checkAllValid =
        modifiedInputs.every((i) => i.classList.contains("valid")) &&
        modifiedInputs.length ===
          formInputs.filter((i) => i.type !== "file").length;
    } else {
      checkAllValid = modifiedInputs.every((i) =>
        i.classList.contains("valid")
      );
    }
  }

  if (submitButton) {
    if (checkAllValid) {
      submitButton.classList.remove("disabled");
    } else {
      submitButton.classList.add("disabled");
    }
  }
}

// 3. Show selected file preview and handle removal
function showSelectedFilePreview(fileInputElement) {
  if (!fileInputElement.files || !fileInputElement.files[0]) return;
  const fileGroupContainer = fileInputElement.closest(".topic-form-group.file");
  if (!fileGroupContainer) return;

  // Remove existing temp previews
  fileGroupContainer
    .querySelectorAll(".topic-file-exists")
    .forEach((p) => p.remove());

  const selectedFile = fileInputElement.files[0];
  const fileExt = (
    selectedFile.name.lastIndexOf(".") !== -1
      ? selectedFile.name.split(".").pop()
      : ""
  ).toUpperCase();
  const objectUrl = URL.createObjectURL(selectedFile);

  // Create a new preview element
  const preview = document.createElement("p");
  preview.className = "topic-file-exists edit-mode";
  preview.dataset.newPreview = "true";

  const link = document.createElement("a");
  link.className = "attachment-link";
  link.href = objectUrl;
  link.target = "_blank";
  link.title = selectedFile.name;

  const iconSpan = document.createElement("span");
  iconSpan.className = "attachment-icon";
  iconSpan.textContent = "📄";

  const nameSpan = document.createElement("span");
  nameSpan.className = "name-content";
  nameSpan.textContent = selectedFile.name;

  const extSpan = document.createElement("span");
  extSpan.className = "attachment-type";
  extSpan.textContent = fileExt;

  link.appendChild(iconSpan);
  link.appendChild(nameSpan);
  link.appendChild(extSpan);

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "x-icon";
  removeButton.setAttribute("aria-label", "Remove selected file");
  removeButton.textContent = "×";

  preview.appendChild(link);
  preview.appendChild(removeButton);

  fileGroupContainer.insertBefore(preview, fileInputElement);
  fileInputElement.hidden = true;

  removeButton.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    preview.remove();
    fileInputElement.value = "";
    fileInputElement.hidden = false;
    fileInputElement.focus();
    fileInputElement.classList.remove("modified");
    fileInputElement.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

// 4. Remove existing file and show file input
function removeExistingFile(removeIconButton) {
  const expandedItem = removeIconButton.closest(".topic-item-expanded");
  if (!expandedItem || !expandedItem.classList.contains("edit-mode")) return;
  saveCurrentData(expandedItem);
  const fileGroupContainer = expandedItem.querySelector(
    ".topic-form-group.file"
  );
  if (!fileGroupContainer) return;
  const filePreview = fileGroupContainer.querySelector(".topic-file-exists");
  if (filePreview) filePreview.style.display = "none";

  let updateFileInput = fileGroupContainer.querySelector(".update-file-input");
  if (!updateFileInput) {
    updateFileInput = document.createElement("input");
    updateFileInput.type = "file";
    updateFileInput.accept = ".pdf,.doc,.docx,.txt";
    updateFileInput.className = "update-file-input";
    updateFileInput.classList.add("modified");
    fileGroupContainer.appendChild(updateFileInput);
  }
  updateFileInput.hidden = false;
  updateFileInput.value = "";
  updateFileInput.focus();
  updateFileInput.dispatchEvent(new Event("change", { bubbles: true }));
}


// 5. Save current data snapshot before editing
function saveCurrentData(expandedItem) {
  // Check if snapshot has already been taken
  if (expandedItem.dataset.snapshotTaken === "true") return;

  // Take a snapshot of the current state
  const titleField = expandedItem.querySelector(
    'input[id^="topic-input-title-"]'
  );
  const descriptionField = expandedItem.querySelector(
    'textarea[id^="topic-input-desc-"]'
  );
  const filePreview = expandedItem.querySelector(".topic-file-exists");
  const snapshot = {
    title: titleField ? titleField.value : "",
    desc: descriptionField ? descriptionField.value : "",
    hadFile: !!filePreview,
    fileHTML: filePreview ? filePreview.outerHTML : "",
  };

  // Store the snapshot in the dataset
  expandedItem.dataset.originalState = JSON.stringify(snapshot);
  // Mark that a snapshot has been taken
  expandedItem.dataset.snapshotTaken = "true";
}

// 6. Restore data from snapshot on cancel
function restoreData(expandedItem) {
  // Check if snapshot exists
  const rawSnapshot = expandedItem.dataset.originalState;
  if (!rawSnapshot) return;

  let snapshot;
  try {
    snapshot = JSON.parse(rawSnapshot);
  } catch {
    return;
  }

  // Restore the title and description fields
  const titleField = expandedItem.querySelector(
    'input[id^="topic-input-title-"]'
  );
  const descriptionField = expandedItem.querySelector(
    'textarea[id^="topic-input-desc-"]'
  );
  if (titleField) titleField.value = snapshot.title;
  if (descriptionField) descriptionField.value = snapshot.desc;

  // Restore the file preview if it exists
  const fileGroupContainer = expandedItem.querySelector(
    ".topic-form-group.file"
  );
  if (fileGroupContainer) {
    fileGroupContainer
      .querySelectorAll('.topic-file-exists[data-new-preview="true"]')
      .forEach((newPrev) => newPrev.remove());
    const allPreviews = Array.from(
      fileGroupContainer.querySelectorAll(".topic-file-exists")
    );
    allPreviews.slice(1).forEach((extra) => extra.remove());
    let currentPreview = fileGroupContainer.querySelector(".topic-file-exists");
    const fileInput = fileGroupContainer.querySelector(
      ".update-file-input, .file-input"
    );

    if (snapshot.hadFile) {
      if (!currentPreview && snapshot.fileHTML) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = snapshot.fileHTML.trim();
        const restoredPreview = wrapper.firstElementChild;
        if (fileInput)
          fileGroupContainer.insertBefore(restoredPreview, fileInput);
        else fileGroupContainer.appendChild(restoredPreview);
        currentPreview = restoredPreview;
      } else if (currentPreview) {
        currentPreview.style.display = "flex";
      }
      if (fileInput) {
        fileInput.value = "";
        if (fileInput.classList.contains("update-file-input"))
          fileInput.hidden = true;
        fileInput.dataset.fileRemoved = "false";
      }
      if (currentPreview) currentPreview.classList.remove("edit-mode");
    } else {
      if (currentPreview) currentPreview.remove();
      if (fileInput) {
        fileInput.hidden = false;
        fileInput.value = "";
      }
    }
  }
  // Immediately clear stored snapshot after restore
  delete expandedItem.dataset.originalState;
  delete expandedItem.dataset.snapshotTaken;
}


// ################ EDIT/NEW TOPIC FORM TRACKING ################
// 1 Event listeners for input changes for new topic
function changeInputsNew(newTopicItem) {
  const topicId = "new_topic";
  const submitButton = document.getElementById("submit-new-topic-button");
  const topicsInputs = Array.from(
    newTopicItem.querySelectorAll("input, textarea")
  ).filter((formInput) => {
    return formInput.id.includes(topicId);
  });

  topicsInputs.forEach((input) => {
    const eventType = input.type === "file" ? "change" : "input";

    if (input.type !== "file") {
      validateInput(input, topicId);
    }

    input.addEventListener(eventType, (e) => {
      if (input.type === "file") {
        const fileInput = e.target;
        if (fileInput.files && fileInput.files.length > 0) {
          showSelectedFilePreview(fileInput);
        }
      } else {
        const currentInput = e.target;
        const trimmedValue = currentInput.value.trim();

        if (trimmedValue !== currentInput.dataset.originalValue.trim()) {
          currentInput.classList.add("modified");
        } else {
          currentInput.classList.remove("modified");
        }
        validateInput(currentInput, topicId);
      }
      checkFormState(topicId, topicsInputs, submitButton);
    });
  });
}

// 2 Event listeners for input changes for edit topic
function initEditFormTracking(topicItem) {
  if (!topicItem) return;
  const expandedItem = topicItem.querySelector(
    ".topic-item-expanded.edit-mode"
  );
  if (!expandedItem) return;

  let topicId = expandedItem.dataset.topicId;

  const formInputs = Array.from(
    expandedItem.querySelectorAll("input, textarea")
  ).filter((formInput) => {
    return formInput.id.includes(topicId);
  });

  const submitButton = expandedItem.querySelector(".accept-button");

  formInputs.forEach((input) => {
    const eventType = input.type === "file" ? "change" : "input";
    input.addEventListener(eventType, (e) => {
      if (input.type === "file") {
        const fileInput = e.target;
        if (fileInput.files && fileInput.files.length > 0) {
          showSelectedFilePreview(fileInput);
          fileInput.classList.add("modified", "valid");
        } else if (fileInput.classList.contains("update-file-input")) {
          fileInput.classList.add("modified", "valid");
          fileInput.dataset.fileRemoved = "true";
        } else {
          fileInput.classList.remove("modified", "valid");
        }
      } else if (input.classList.contains("assignment")) {
        input.classList.add("modified", "valid");
      } else {
        const currentInput = e.target;
        const trimmedValue = currentInput.value.trim();

        if (trimmedValue !== currentInput.dataset.originalValue.trim()) {
          currentInput.classList.add("modified");
        } else {
          currentInput.classList.remove("modified");
        }
        validateInput(currentInput, topicId);
      }
      checkFormState(topicId, formInputs, submitButton);
    });
  });
}

// ################ NEW TOPIC functions ################
// 1. Show/Hide new topic form
function showNewTopic() {
  const newTopicItem = document.querySelector(".topic-item-expanded.new-mode");

  const topicsList = document.getElementById("topics-list");
  const noData = topicsList ? topicsList.querySelector(".no-data") : null;
  if (noData) {
    noData.remove();
  }

  if (newTopicItem) {
    newTopicItem.style.display = "flex";
    newTopicItem.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  changeInputsNew(newTopicItem);
}

function cancelNewTopic() {
  const newTopicItem = document.querySelector(".topic-item-expanded.new-mode");
  if (newTopicItem) {
    const topicList = document.getElementById("topics-list");
    if (topicList && topicList.children.length === 0) {
      const noData = document.createElement("p");
      noData.textContent = "Δεν υπάρχουν θέματα";
      noData.className = "no-data";
      topicList.appendChild(noData);
    }

    newTopicItem.style.display = "none";
    // clear all input fields
    newTopicItem
      .querySelectorAll('input[type="text"], input[type="file"], textarea')
      .forEach((input) => {
        input.value = "";
        input.classList.remove("modified", "valid");
        const label = newTopicItem.querySelector(
          'label[for="' + input.id + '"]'
        );
        const span = label ? label.querySelector("span") : null;
        if (span) {
          span.textContent = "";
          span.classList.remove("green", "yellow", "red");
        }
      });

    const assignmentInput = newTopicItem.querySelector(".assignment");
    if (assignmentInput) {
      assignmentInput.value = "";
    }

    const fileGroupContainer = newTopicItem.querySelector(
      ".topic-form-group.file"
    );
    if (fileGroupContainer) {
      fileGroupContainer
        .querySelectorAll(".topic-file-exists")
        .forEach((p) => p.remove());
      // Show the file input again
      const fileInput = fileGroupContainer.querySelector('input[type="file"]');
      if (fileInput) {
        fileInput.hidden = false;
      }
    }
    const submitButton = document.getElementById("submit-new-topic-button");
    submitButton.classList.add("disabled");
  }
}

// 2. Upload new topic to server
function uploadNewTopic() {
  try {
    const newTopicItem = document.querySelector(
      ".topic-item-expanded.new-mode"
    );
    if (!newTopicItem) return;
    const titleInput = newTopicItem.querySelector(
      'input[id^="topic-input-title-"]'
    );
    const descInput = newTopicItem.querySelector(
      'textarea[id^="topic-input-desc-"]'
    );
    const fileInput = newTopicItem.querySelector('input[type="file"]');

    const sortDropdown = document.getElementById("sort-topics");

    const formData = new FormData();
    formData.append("title", titleInput.value.trim());
    formData.append("description", descInput.value.trim());
    formData.append("file", fileInput.files[0]);
    uploadNewTopicRequest(formData).then((response) => {
      if (response && response.success) {
        const topicsList = document.getElementById("topics-list");
        if (topicsList) {
          const topicLiItem = document.createElement("li");
          topicLiItem.className = "topic-item";
          const collapsedContent = renderCollapsedTopic(response.topic, "new");
          const expandedContent = renderExpandedTopic(
            response.topic,
            "new",
            userRole
          );
          topicLiItem.appendChild(collapsedContent);
          topicLiItem.appendChild(expandedContent);
          let sortCheck = false;
          if (!sortDropdown || sortDropdown.value !== "topic_title") {
            // Insert at the beginning of the list
            if (topicsList.firstChild) {
              topicsList.insertBefore(topicLiItem, topicsList.firstChild);
            } else {
              topicsList.appendChild(topicLiItem);
            }
          } else {
            topicsList.appendChild(topicLiItem);
            sortCheck = true;
          }
          cancelNewTopic();
          alertPopUP(response.message, "green");
          updateButtonListeners();
          if (sortCheck) {
            sortTopicsUI(topicLiItem);
          }
        }
      } else {
        const message =
          "Υπήρξε σφάλμα κατά τη δημιουργία του νέου θέματος. Προσπαθήστε ξανά.";
        alertPopUP(message, "red");
      }
    });
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά τη δημιουργία του νέου θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

async function uploadNewTopicRequest(formData) {
  try {
    const response = await fetch("/api/topics/create", {
      method: "POST",
      body: formData,
    });
    return await response.json();
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά τη δημιουργία του νέου θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

// ################ EDIT TOPIC functions ################
// 1. Enter edit mode for a topic
function enterEditMode(topicItem) {
  const expandedItem = topicItem.querySelector(".topic-item-expanded");
  if (!expandedItem || expandedItem.classList.contains("edit-mode")) return;

  // Take a snapshot of the current state before entering edit mode
  saveCurrentData(expandedItem);

  topicItem.classList.add("edit-mode");
  expandedItem.classList.add("edit-mode");
  expandedItem
    .querySelectorAll("input")
    .forEach((input) => input.removeAttribute("readonly"));
  expandedItem
    .querySelectorAll("textarea")
    .forEach((textarea) => textarea.removeAttribute("disabled"));

  const inputClass = expandedItem.querySelector(".input-class");
  if (inputClass) inputClass.classList.remove("hidden");
  const groupValueTitle = expandedItem.querySelector(".group-value");
  if (groupValueTitle) groupValueTitle.classList.add("hidden");

  const filePreview = expandedItem.querySelector(".topic-file-exists");
  if (filePreview) filePreview.classList.add("edit-mode");
  const editButtonsGroup = expandedItem.querySelector(
    ".edit-topic-buttons-group"
  );
  const viewButtonsGroup = expandedItem.querySelector(".topic-buttons-group");
  if (editButtonsGroup) editButtonsGroup.style.display = "flex";
  if (viewButtonsGroup) viewButtonsGroup.style.display = "none";
  const collapseButton = expandedItem.querySelector(".collapse-button");
  if (collapseButton) collapseButton.classList.add("edit-mode");

  // Start per-topic edit tracking
  initEditFormTracking(topicItem);
}

// 2. Exit edit mode and restore original data if cancelled
function exitEditMode(topicItem) {
  const expandedItem = topicItem.querySelector(".topic-item-expanded");
  if (!expandedItem) return;
  restoreData(expandedItem);

  const assignmentField = expandedItem.querySelector(".assignment");
  if (assignmentField) {
    assignmentField.value = "";
  }
  topicItem.classList.remove("edit-mode");
  expandedItem.classList.remove("edit-mode");
  expandedItem
    .querySelectorAll("input")
    .forEach((input) => input.setAttribute("readonly", "true"));
  expandedItem
    .querySelectorAll("textarea")
    .forEach((textarea) => textarea.setAttribute("disabled", "true"));
  expandedItem
    .querySelectorAll('input[type="text"], textarea')
    .forEach((input) => {
      const label = expandedItem.querySelector('label[for="' + input.id + '"]');
      const span = label ? label.querySelector("span") : null;
      if (span) {
        span.textContent = "";
        span.classList.remove("green", "yellow", "red");
      }
    });
  const inputClass = expandedItem.querySelector(".input-class");
  if (inputClass) inputClass.classList.add("hidden");
  const groupValueTitle = expandedItem.querySelector(".group-value");
  if (groupValueTitle) groupValueTitle.classList.remove("hidden");

  const editButtonsGroup = expandedItem.querySelector(
    ".edit-topic-buttons-group"
  );
  const viewButtonsGroup = expandedItem.querySelector(".topic-buttons-group");
  if (editButtonsGroup) editButtonsGroup.style.display = "none";
  if (viewButtonsGroup) viewButtonsGroup.style.display = "flex";
  const collapseButton = expandedItem.querySelector(".collapse-button");
  if (collapseButton) collapseButton.classList.remove("edit-mode");

  const submitButton = expandedItem.querySelector(".accept-button");
  if (submitButton) submitButton.classList.add("disabled");
}

// 3. Update topic on server
function updateTopic(topicItem) {
  try {
    const expandedItem = topicItem.querySelector(".topic-item-expanded");
    if (!expandedItem) return;
    const topicId = expandedItem.dataset.topicId;
    const titleInput = expandedItem.querySelector(
      'input[id^="topic-input-title-"]'
    );
    const descInput = expandedItem.querySelector(
      'textarea[id^="topic-input-desc-"]'
    );
    const fileInput = expandedItem.querySelector('input[type="file"]');
    const assignmentInput = expandedItem.querySelector(".assignment");

    const formData = new FormData();
    formData.append("title", titleInput.value.trim());
    formData.append("description", descInput.value.trim());
    formData.append("file", fileInput.files[0]);
    if (fileInput.classList.contains("update-file-input")) {
      formData.append("fileRemoved", fileInput.dataset.fileRemoved);
    }
    if (assignmentInput.value.trim().length === 0) {
      formData.append("assignment", null);

      updateTopicRequest(topicId, formData).then((result) => {
        if (result.success) {
          topicItem.innerHTML = "";
          topicItem.appendChild(
            renderCollapsedTopic(result.topic, updateString)
          );
          topicItem.appendChild(
            renderExpandedTopic(result.topic, updateString, userRole)
          );
          alertPopUP(result.message, "green");
          updateButtonListeners();
          sortTopicsUI(topicItem);
        } else {
          const message =
            "Υπήρξε σφάλμα κατά την ενημέρωση του θέματος. Προσπαθήστε ξανά.";
          alertPopUP(message, "red");
        }
      });
    } else {
      formData.append("assignment", assignmentInput.dataset.studentAssignedId);

      assignTopicRequest(topicId, formData).then((response) => {
        if (response.success) {
          alertPopUP(response.message, "green");
          topicItem.remove();
          const topicList = document.getElementById("topics-list");
          if (topicList && topicList.children.length === 0) {
            const noData = document.createElement("p");
            noData.textContent = "Δεν υπάρχουν θέματα";
            noData.className = "no-data";
            topicList.appendChild(noData);
          }
        } else {
          const message =
            "Υπήρξε σφάλμα κατά την ενημέρωση του θέματος. Προσπαθήστε ξανά.";
          alertPopUP(message, "red");
        }
      });
    }
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά την ενημέρωση του θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

async function updateTopicRequest(topicId, formData) {
  try {
    const response = await fetch(`/api/topics/update/${topicId}`, {
      method: "PUT",
      body: formData,
    });
    return await response.json();
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά την ενημέρωση του θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

async function assignTopicRequest(topicId, formData) {
  try {
    const response = await fetch(`/api/topics/assign/${topicId}`, {
      method: "PUT",
      body: formData,
    });
    return await response.json();
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά την ανάθεση του θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

// ################ ASSIGN TOPIC functions ################
// 1. Open/close assign modal
function openAssignModal(modalContainer, enteredTopicId) {
  topicId = enteredTopicId;
  if (!modalContainer) return;
  modalContainer.classList.add("active");
  document.body.classList.add("no-scroll");
  const innerModal = modalContainer.querySelector(".modal");

  if (innerModal) {
    const searchInput = document.getElementById("student-search");
    if (searchInput) searchInput.focus();
    if (searchFetchController) searchFetchController.abort();
    searchFetchController = new AbortController();
    const signal = searchFetchController.signal;
    fetchAvailableStudents("", signal)
      .then((data) => {
        const studentsList = document.querySelector(".student-list");
        if (studentsList) {
          studentsList.innerHTML = "";
          if (data && data.length > 0) {
            data.forEach((student) => {
              const li = document.createElement("li");
              li.className = "student-item";
              li.textContent = student.fullName;
              li.dataset.userId = student.userId;
              li.addEventListener("click", () => selectStudent(li, topicId));
              studentsList.appendChild(li);
            });
          } else {
            studentsList.innerHTML = "";
            const noData = document.createElement("p");
            noData.textContent = "Δεν βρέθηκαν χρήστες";
            noData.className = "no-data";
            studentsList.appendChild(noData);
          }
        }
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        const userList = document.getElementById("users-list");
        if (userList) {
          userList.innerHTML =
            '<p class="no-data error">Σφάλμα φόρτωσης δεδομένων. Προσπαθήστε ξανά</p>';
        }
      });
  }

  // Backdrop (outside click) close support; bind once
  if (!modalContainer.dataset.backdropBound) {
    modalContainer.dataset.backdropBound = "true";
    modalContainer.addEventListener("mousedown", (e) => {
      if (e.target === modalContainer) {
        closeAssignModal(modalContainer);
      }
    });
  }

  const searchInput = document.getElementById("student-search");

  // Debounced input event for search
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


  // Close modal button
  const closeModalBtn = modalContainer.querySelector(".close-modal");
  if (closeModalBtn && !closeModalBtn.dataset.bound) {
    closeModalBtn.dataset.bound = "true";
    closeModalBtn.addEventListener("click", () =>
      closeAssignModal(modalContainer)
    );
  }

  const assignBtn = modalContainer.querySelector(
    ".modal-footer .standard-button"
  );
  if (assignBtn && !assignBtn.dataset.bound) {
    assignBtn.dataset.bound = "true";
    assignBtn.addEventListener("click", () => {
      const selected = modalContainer.querySelector(".student-item.selected");

      if (!selected) {
        alert("Παρακαλώ επιλέξτε φοιτητή.");
        return;
      }
      const assignmentInput = document.querySelector(
        `.topic-item-expanded[data-topic-id="${topicId}"] .assignment`
      );

      assignmentInput.value = selected.textContent.trim();
      assignmentInput.value = selected.textContent.trim();
      assignmentInput.dataset.studentAssignedId = selected.dataset.userId;
      assignmentInput.classList.add("modified");
      assignmentInput.dispatchEvent(new Event("input", { bubbles: true }));
      closeAssignModal(modalContainer);
    });
  }
}

// 2. Close assign modal and reset state
function closeAssignModal(modalContainer) {
  const assignBtn = modalContainer.querySelector(
    ".modal-footer .standard-button"
  );
  assignBtn.dataset.bound = "false";
  if (!modalContainer) return;
  modalContainer.classList.remove("active");
  document.body.classList.remove("no-scroll");
  const searchInput = modalContainer.querySelector(".student-search-bar");
  const selected = modalContainer.querySelector(".student-item.selected");
  if (searchInput) searchInput.value = "";
  if (selected) selected.classList.remove("selected");
}

function selectStudent(studentEl) {
  if (!studentEl) return;
  const rootList = studentEl.closest(".student-list");
  if (!rootList) return;
  const prev = rootList.querySelector(".student-item.selected");
  if (studentEl.classList.contains("selected")) {
    studentEl.classList.remove("selected");
    return;
  }
  if (prev && prev !== studentEl) prev.classList.remove("selected");
  studentEl.classList.add("selected");
}

// 3. Search users with debounced input
function userSearch(inputValue) {
  if (searchFetchController) searchFetchController.abort();
  searchFetchController = new AbortController();
  const signal = searchFetchController.signal;
  fetchAvailableStudents(inputValue, signal)
    .then((data) => {
      const studentsList = document.querySelector(".student-list");
      if (studentsList) {
        studentsList.innerHTML = "";
        if (data && data.length > 0) {
          data.forEach((student) => {
            const li = document.createElement("li");
            li.className = "student-item";
            li.textContent = student.fullName;
            li.dataset.userId = student.userId;
            li.addEventListener("click", () => selectStudent(li, topicId));
            studentsList.appendChild(li);
          });
        } else {
          studentsList.innerHTML = "";
          const noData = document.createElement("p");
          noData.textContent = "Δεν βρέθηκαν χρήστες";
          noData.className = "no-data";
          studentsList.appendChild(noData);
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

// 4. Fetch available students from server
async function fetchAvailableStudents(inputValue, signal) {
  try {
    const response = await fetch(
      `/api/users/students/available?q=${encodeURIComponent(inputValue)}`,
      { signal }
    );

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    return data.students;
  } catch (err) {
    if (err.name !== "AbortError") {
      throw err;
    }
  }
}

// ################ DELETE TOPIC functions ################
// 1. Delete topic from server
function deleteTopic(topicItem) {
  try {
    const expandedTopic = topicItem.querySelector(".topic-item-expanded");
    const topicId = expandedTopic.dataset.topicId;

    deleteTopicRequest(topicId).then((result) => {
      if (result.success) {
        topicItem.remove();
        // NEED TO CONN
        alertPopUP(result.message, "green");
        const topicList = document.getElementById("topics-list");
        if (topicList && topicList.children.length === 0) {
          const noData = document.createElement("p");
          noData.textContent = "Δεν υπάρχουν θέματα";
          noData.className = "no-data";
          topicList.appendChild(noData);
        }
      } else {
        const message =
          "Υπήρξε σφάλμα κατά τη διαγραφή του θέματος. Προσπαθήστε ξανά.";
        alertPopUP(message, "red");
      }
    });
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά τη διαγραφή του θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

async function deleteTopicRequest(topicId) {
  try {
    const response = await fetch(`/api/topics/delete/${topicId}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    const message =
      "Υπήρξε σφάλμα κατά τη διαγραφή του θέματος. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

// ################ TOGGLE, SORT, SCROLL functions ################
// 1. Toggle expand/collapse for all topics
function toggleFunction() {
  const topicItems = document.querySelectorAll(".topic-item");
  topicItems.forEach(function (topicItem) {
    const collapsedContent = topicItem.querySelector(".topic-item-collapsed");
    const expandedContent = topicItem.querySelector(".topic-item-expanded");
    const expandButton = topicItem.querySelector(".expand-button");
    const collapseButton = topicItem.querySelector(".collapse-button");

    toggleExpandCollapseView(
      collapsedContent,
      collapseButton,
      expandedContent,
      expandButton,
      editMode
    );
  });
}

// 2. Sort topics alphabetically by title
function sortTopicsUI(topicItem) {
  const sortDropdown = document.getElementById("sort-topics");
  if (!sortDropdown || sortDropdown.value !== "topic_title") return;

  const topicsList = document.getElementById("topics-list");
  if (!topicsList) return;

  const items = Array.from(topicsList.querySelectorAll(".topic-item"));

  items.sort((a, b) => {
    const titleA =
      a
        .querySelector(".topic-item-collapsed .topic-header")
        ?.textContent.trim()
        .toLowerCase() || "";
    const titleB =
      b
        .querySelector(".topic-item-collapsed .topic-header")
        ?.textContent.trim()
        .toLowerCase() || "";
    return titleA.localeCompare(titleB, "el", { sensitivity: "base" }); // Greek-friendly sort
  });

  // Re-append in sorted order
  topicsList.innerHTML = "";
  items.forEach((item) => topicsList.appendChild(item));
  scrollToTopic(topicItem);
}

// 3. Smooth scroll to a specific topic item
function scrollToTopic(topicItem) {
  if (!topicItem) return;
  topicItem.scrollIntoView({
    behavior: "smooth", // smooth scrolling
    block: "center", // vertical alignment
    inline: "nearest", // horizontal alignment (if needed)
  });
}

// ################ INITIALIZE/UPDATE BUTTON LISTENERS ################
// Call this function after any DOM changes to rebind event listeners
export function updateButtonListeners() {
  toggleFunction();

  // Helper: clone and replace element to remove old listeners
  const replaceWithClone = (el) => {
    if (!el) return null;
    const newEl = el.cloneNode(true);
    el.replaceWith(newEl);
    return newEl;
  };

  // Edit mode existing topics
  document.querySelectorAll(".edit-topic-button").forEach((editButton) => {
    const btn = replaceWithClone(editButton);
    btn.addEventListener("click", () => {
      const topicItem = btn.closest(".topic-item");
      if (topicItem) enterEditMode(topicItem);
    });
  });

  // Cancel edit for existing topics
  document.querySelectorAll(".cancel-edit-button").forEach((cancelButton) => {
    const btn = replaceWithClone(cancelButton);
    btn.addEventListener("click", () => {
      const topicItem = btn.closest(".topic-item");
      if (topicItem) exitEditMode(topicItem);
    });
  });

  // Delete existing topics
  document.querySelectorAll(".delete-topic-button").forEach((deleteButton) => {
    const btn = replaceWithClone(deleteButton);
    btn.addEventListener("click", () => {
      const topicItem = btn.closest(".topic-item");
      if (topicItem) {
        const confirmed = confirm(
          "Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το θέμα; Αυτή η ενέργεια δεν μπορεί να αναιρεθεί."
        );
        if (confirmed) deleteTopic(topicItem);
      }
    });
  });

  // Accept button (save/update) for all topics including new
  document.querySelectorAll(".accept-button").forEach((saveButton) => {
    const btn = replaceWithClone(saveButton);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      if (btn.classList.contains("disabled")) return;
      const topicItem = btn.closest(".topic-item");
      const expanded = topicItem.querySelector(".topic-item-expanded");
      if (!expanded) return;
      const topicId = expanded.dataset.topicId;

      if (topicId === "new_topic") {
        uploadNewTopic();
      } else {
        updateTopic(topicItem);
      }
    });
  });

  // New topic item display form
  const newTopicButton = document.getElementById("new-topic-button");
  if (newTopicButton) {
    const btn = replaceWithClone(newTopicButton);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      showNewTopic();
    });
  }

  // Cancel new topic form
  const cancelNewTopicButton = document.getElementById(
    "cancel-new-topic-button"
  );
  if (cancelNewTopicButton) {
    const btn = replaceWithClone(cancelNewTopicButton);
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      cancelNewTopic();
    });
  }

  // Assignment input modal click
  document.querySelectorAll(".topic-item-expanded").forEach((expanded) => {
    const assignmentInput = expanded.querySelector(".assignment");
    const modalContainer = document.querySelector(".modal-container");
    if (!assignmentInput || !modalContainer) return;

    const input = replaceWithClone(assignmentInput);
    input.addEventListener("click", (e) => {
      e.preventDefault();
      openAssignModal(modalContainer, expanded.dataset.topicId);
    });
  });

  document
    .querySelectorAll(".topic-file-exists:not([data-new-preview]) .x-icon")
    .forEach((removeIcon) => {
      const btn = replaceWithClone(removeIcon);
      if (!btn) return;
      btn.addEventListener("click", (e) => {
        e.preventDefault();
        const expandedItem = btn.closest(".topic-item-expanded");
        if (!expandedItem || !expandedItem.classList.contains("edit-mode"))
          return;
        removeExistingFile(btn);
      });
    });

  // Escape key for modals (no cloning needed)
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal-container.active")
        .forEach((container) => closeAssignModal(container));
    }
  });
}
