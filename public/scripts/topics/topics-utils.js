import { formatDate } from "../utils.js";

// 1. Render collapsed topic
export function renderCollapsedTopic(topic, type) {
  const collapsedDiv = document.createElement("div");
  collapsedDiv.classList.add("topic-item-collapsed");

  if (type === "update") {
    collapsedDiv.classList.add("hidden");
  }

  const topicCollapsedHeader = document.createElement("div");
  topicCollapsedHeader.className = "topic-collapsed-header";

  const topicHeader = document.createElement("h3");
  topicHeader.className = "topic-header";
  topicHeader.textContent = topic.title;

  topicCollapsedHeader.appendChild(topicHeader);

  const dateBadge = document.createElement("p");
  dateBadge.className = "simple-badge";
  dateBadge.textContent = formatDate(topic.updatedAt);
  topicCollapsedHeader.appendChild(dateBadge);

  collapsedDiv.appendChild(topicCollapsedHeader);

  const expandButton = document.createElement("small");
  expandButton.className = "expand-button";
  expandButton.textContent = "Κλικ για ανάπτυξη";

  collapsedDiv.appendChild(expandButton);
  return collapsedDiv;
}

// 2. Render expanded topic
export function renderExpandedTopic(topic, type, userRole) {
  const expandedDiv = document.createElement("div");
  expandedDiv.classList.add("topic-item-expanded", "hidden");
  expandedDiv.dataset.topicId = topic._id;

  if (type === "update") {
    expandedDiv.classList.remove("hidden");
  }

  // Title group
  const topicFormGroup1 = document.createElement("div");
  topicFormGroup1.className = "topic-form-group";
  const topicTitleLabel = document.createElement("label");
  topicTitleLabel.setAttribute("for", "topic-input-title-" + topic._id);
  topicTitleLabel.id = "label-topic-input-title-" + topic._id;

  const topicHeaderExpanded = document.createElement("div");
  topicHeaderExpanded.className = "topic-header";

  const middleTopicHeaderDiv = document.createElement("div");
  middleTopicHeaderDiv.textContent = "Τίτλος Θέματος";

  const spanWarnTitle = document.createElement("span");
  spanWarnTitle.className = "warning-message";
  middleTopicHeaderDiv.appendChild(spanWarnTitle);
  topicHeaderExpanded.appendChild(middleTopicHeaderDiv);

  const dateBadge = document.createElement("p");
  dateBadge.className = "simple-badge";
  dateBadge.textContent = formatDate(topic.updatedAt);
  topicHeaderExpanded.appendChild(dateBadge);
  topicTitleLabel.appendChild(topicHeaderExpanded);

  const topicTitleInput = document.createElement("input");
  topicTitleInput.classList.add("input-class", "hidden");
  topicTitleInput.type = "text";
  topicTitleInput.id = "topic-input-title-" + topic._id;
  topicTitleInput.value = topic.title;
  topicTitleInput.dataset.originalValue = topic.title;
  topicTitleInput.required = true;
  topicTitleInput.readOnly = true;

  const topicTitleP = document.createElement("p");
  topicTitleP.className = "group-value";
  topicTitleP.textContent = topic.title;
  topicFormGroup1.appendChild(topicTitleLabel);
  topicFormGroup1.appendChild(topicTitleInput);
  topicFormGroup1.appendChild(topicTitleP);

  expandedDiv.appendChild(topicFormGroup1);

  // Description group
  const topicFormGroup2 = document.createElement("div");
  topicFormGroup2.className = "topic-form-group";

  const descLabel = document.createElement("label");
  descLabel.setAttribute("for", "topic-input-desc-" + topic._id);
  descLabel.textContent = "Περιγραφή";
  descLabel.id = "label-topic-input-desc-" + topic._id;

  const spanWarnDesc = document.createElement("span");
  spanWarnDesc.className = "warning-message";
  descLabel.appendChild(spanWarnDesc);

  const descTextarea = document.createElement("textarea");
  descTextarea.id = "topic-input-desc-" + topic._id;
  descTextarea.dataset.originalValue = topic.description;
  descTextarea.maxLength = 510;
  descTextarea.required = true;
  descTextarea.disabled = true;
  descTextarea.textContent = topic.description;
  topicFormGroup2.appendChild(descLabel);
  topicFormGroup2.appendChild(descTextarea);
  expandedDiv.appendChild(topicFormGroup2);

  // File attachment group
  const topicFormGroup3 = document.createElement("div");
  topicFormGroup3.classList.add("topic-form-group", "file");
  const fileLabel = document.createElement("label");
  fileLabel.setAttribute("for", "topic-file-" + topic._id);
  fileLabel.textContent = "Συννημένο";
  topicFormGroup3.appendChild(fileLabel);
  if (topic.filePath) {
    const reqFileName = topic.filePath.split("/").pop();
    const reqFileExt =
      reqFileName && reqFileName.includes(".")
        ? reqFileName.split(".").pop().toUpperCase()
        : "";
    const fileExistsP = document.createElement("p");
    fileExistsP.className = "topic-file-exists";
    const fileLink = document.createElement("a");
    fileLink.href = topic.filePath;
    fileLink.target = "_blank";
    fileLink.className = "attachment-link";
    fileLink.title = reqFileName;
    const iconSpan = document.createElement("span");
    iconSpan.className = "attachment-icon";
    iconSpan.textContent = "📄";
    const nameSpan = document.createElement("span");
    nameSpan.className = "name-content";
    nameSpan.textContent = reqFileName;
    const typeSpan = document.createElement("span");
    typeSpan.className = "attachment-type";
    typeSpan.textContent = reqFileExt;
    fileLink.appendChild(iconSpan);
    fileLink.appendChild(nameSpan);
    fileLink.appendChild(typeSpan);
    fileExistsP.appendChild(fileLink);
    if (userRole === "professor") {
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "x-icon";
      deleteBtn.textContent = "\u00D7";
      fileExistsP.appendChild(deleteBtn);
    }
    topicFormGroup3.appendChild(fileExistsP);
    const updateFileInput = document.createElement("input");
    updateFileInput.type = "file";
    updateFileInput.id = "update-topic-file-" + topic._id;
    updateFileInput.accept = ".pdf,.doc,.docx,.txt";
    updateFileInput.className = "update-file-input";
    updateFileInput.dataset.originalValue = topic.filePath;
    updateFileInput.dataset.fileRemoved = "false";
    updateFileInput.readOnly = true;
    updateFileInput.hidden = true;
    topicFormGroup3.appendChild(updateFileInput);
  } else {
    if (userRole === "professor") {
      const fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.id = "topic-file-" + topic._id;
      fileInput.accept = ".pdf,.doc,.docx,.txt";
      fileInput.className = "file-input";
      fileInput.dataset.originalValue = "";
      fileInput.readOnly = true;
      topicFormGroup3.appendChild(fileInput);
    } else {
      const noFileInput = document.createElement("input");
      noFileInput.type = "text";
      noFileInput.value = "-";
      noFileInput.readOnly = true;
      topicFormGroup3.appendChild(noFileInput);
    }
  }
  expandedDiv.appendChild(topicFormGroup3);

  // Assignment group and modal (professor only)
  if (userRole === "professor") {
    const topicFormGroup4 = document.createElement("div");
    topicFormGroup4.className = "topic-form-group";
    const assignLabel = document.createElement("label");
    assignLabel.setAttribute("for", "topic-assignment-" + topic._id);
    assignLabel.textContent = "Ανάθεση";
    const assignInput = document.createElement("input");
    assignInput.id = "topic-assignment-" + topic._id;
    assignInput.placeholder = "Επιλέξτε Φοιτητή για Ανάθεση";
    assignInput.className = "assignment";
    assignInput.value = "";
    assignInput.dataset.originalValue = "";
    assignInput.dataset.assignmentId = topic._id;
    assignInput.dataset.studentAssignedId = "";
    assignInput.readOnly = true;
    topicFormGroup4.appendChild(assignLabel);
    topicFormGroup4.appendChild(assignInput);
    expandedDiv.appendChild(topicFormGroup4);

    // Topic buttons group
    const topicButtonsGroup = document.createElement("div");
    topicButtonsGroup.className = "topic-buttons-group";
    const deleteBtn = document.createElement("button");
    deleteBtn.classList.add("cancel-button", "delete-topic-button");
    deleteBtn.id = "delete-topic-button-" + topic._id;
    deleteBtn.textContent = "Διαγραφή";

    const editBtn = document.createElement("button");
    editBtn.classList.add("light-button", "edit-topic-button");
    editBtn.id = "edit-topic-button-" + topic._id;
    editBtn.textContent = "Επεξεργασία";
    topicButtonsGroup.appendChild(deleteBtn);
    topicButtonsGroup.appendChild(editBtn);
    expandedDiv.appendChild(topicButtonsGroup);

    // Edit topic buttons group
    const editButtonsGroup = document.createElement("div");
    editButtonsGroup.className = "edit-topic-buttons-group";
    const cancelEditBtn = document.createElement("button");
    cancelEditBtn.classList.add("light-button", "cancel-edit-button");
    cancelEditBtn.id = "cancel-topic-button-" + topic._id;
    cancelEditBtn.textContent = "Ακύρωση";
    const saveBtn = document.createElement("button");
    saveBtn.classList.add("accept-button", "disabled");
    saveBtn.id = "submit-topic-button-" + topic._id;
    saveBtn.textContent = "Αποθήκευση";
    editButtonsGroup.appendChild(cancelEditBtn);
    editButtonsGroup.appendChild(saveBtn);
    expandedDiv.appendChild(editButtonsGroup);
  } else {
    // Supervisor group for non-professors
    const supervisorGroup = document.createElement("div");
    supervisorGroup.className = "topic-form-group";
    const supervisorLabel = document.createElement("label");
    supervisorLabel.textContent = "Επιβλέπων";
    const supervisorInput = document.createElement("input");
    supervisorInput.type = "text";
    supervisorInput.value = "Αλεξίου Δημήτριος";
    supervisorInput.readOnly = true;
    supervisorGroup.appendChild(supervisorLabel);
    supervisorGroup.appendChild(supervisorInput);
    expandedDiv.appendChild(supervisorGroup);
  }

  // Collapse button
  const collapseButton = document.createElement("small");
  collapseButton.className = "collapse-button";
  collapseButton.textContent = "Κλικ για σύμπτυξη";
  expandedDiv.appendChild(collapseButton);

  return expandedDiv;
}
