import {
  alertPopUP,
  formatDate,
  debounce,
  validateInput,
  ensureScheme,
  renderLink,
  clearSpanWarning,
} from "./utils.js";

let constExistGrades = null;
let constID = null;
let constUserRole = null;
let invitationsLoaded = false;
let notesLoaded = false;
let evaluationLoaded = false;
let constEventModal = null;
let announcementLoaded = false;

let searchProfessorFetchController = null;

// ####################### GENERAL FUNCTIONS #########################
// 1. Tab navigation
function activateTab(tabId) {
  const tabs = document.querySelectorAll(".tab-link");
  const contents = document.querySelectorAll(".tab-content");
  const allowed = new Set(
    Array.from(tabs).map((t) => t.getAttribute("data-tab"))
  );
  if (!allowed.has(tabId)) {
    tabId = "info";
    const message = "Μη έγκυρη καρτέλα. Επιστροφή στην αρχική καρτέλα.";
    alertPopUP(message, "red");
    window.location.hash = "#info";
  }
  tabs.forEach((l) => l.classList.remove("active"));
  contents.forEach((c) => c.classList.remove("active"));
  const link = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
  const pane = document.getElementById(tabId);
  if (link) link.classList.add("active");
  if (pane) pane.classList.add("active");
  if (tabId === "timeline") {
    loadInvitations(constID);
  }
  if (tabId === "notes") loadNotes();
  // if (tabId === 'meetings') loadMeetings();
  const gradesContainer = document.querySelector(".grades-container");
  if (gradesContainer) {
    constExistGrades = gradesContainer.dataset.existGrades;
  }
  if (tabId === "evaluation" && constExistGrades === "true") loadGrades();
  // if (tabId === 'protocol') loadProtocol();
  if (tabId !== "notes") {
    const newNoteItem = document.querySelector(".new-note-container");
    if (newNoteItem && newNoteItem.style.display !== "none") cancelNewNote();
  }
  // if (tabId !== 'meetings') {
  //     const newMeetingItem = document.querySelector('.new-meeting-container');
  //     if (newMeetingItem && newMeetingItem.style.display !== 'none') cancelNewMeeting();
  // }
}

// 2. Validate numbers between 0-10 (grades)
function validateNumbers(inputElement) {
  const value = inputElement.value.trim();
  const labelInput = inputElement.parentElement;
  const spanWarning = labelInput.querySelector("span");
  spanWarning.classList.remove("red", "green", "yellow");
  spanWarning.textContent = "";

  if (isNaN(value) || value < 0 || value > 10) {
    inputElement.classList.add("error");
    inputElement.classList.remove("valid");
    spanWarning.textContent = "Μη έγκυρος αριθμός";
    spanWarning.classList.add("red");
  } else {
    inputElement.classList.remove("error", "valid");
    validateInput(inputElement, labelInput, 1, 10, true);
  }
}

// 3. Validate date input dd/mm/yyyy HH:mm
function isValidDateTimeInput(value) {
  // Match dd/mm/yyyy HH:mm
  const regex =
    /^([0-2]\d|3[01])\/(0\d|1[0-2])\/(\d{4})\s([01]\d|2[0-3]):([0-5]\d)$/;
  return regex.test(value);
}

// 4. Validate date input field
function validateDateInput(inputElement) {
  const value = inputElement.value.trim();
  const labelInput = inputElement.parentElement;
  const spanWarning = labelInput.querySelector("span");
  spanWarning.classList.remove("red", "green", "yellow");
  spanWarning.textContent = "";
  if (value.length === 16) {
    if (isValidDateTimeInput(value)) {
      inputElement.classList.add("valid");
      spanWarning.textContent = "Έγκυρο πεδιο";
      spanWarning.classList.add("green");
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

// 5. Convert dd/mm/yyyy HH:mm to ISO format
function parseToISO(value) {
  const date = flatpickr.parseDate(value, "d/m/Y H:i"); // parse the string
  return date instanceof Date && !isNaN(date) ? date.toISOString() : null;
}

// ###################### STATUS CHANGE FUNCTIONS #########################
// 1. Cancel Temporary Assignment
function cancelTemporaryAssignment(constID) {
  try {
    cancelTemporaryAssignmentRequest(constID).then((response) => {
      if (response.success) {
        alertPopUP(response.message, "green");
        //redirect to assignments page
        setTimeout(() => {
          window.location.href = "/assignments";
        }, 1500);
      }
    });
  } catch (error) {
    const message = "Αποτυχία ακύρωσης προσωρινής ανάθεσης.";
    alertPopUP(message, "red");
  }
}

async function cancelTemporaryAssignmentRequest(constID) {
  try {
    const response = await fetch(
      `/api/assignment/cancel-temporary/${encodeURIComponent(constID)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία ακύρωσης προσωρινής ανάθεσης.";
    alertPopUP(message, "red");
  }
}

// 2. Official Assignment - Official Cancellation
function changeAssignmentStatus(protocolNumber, protocolDetails) {
  try {
    if (constEventModal === "official_assignment") {
      changeAssignmentStatusRequest(protocolNumber).then((response) => {
        if (response.success) {
          const message = "Ο αριθμός πρωτοκόλλου ανάθεσης υποβλήθηκε επιτυχώς.";
          alertPopUP(message, "green");
          closeAssignmentStatusModal();
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        }
      });
    } else if (constEventModal === "cancel_active_assignment") {
      changeAssignmentCancelStatusRequest(protocolNumber, protocolDetails).then(
        (response) => {
          if (response.success) {
            const message =
              "Ο αριθμός πρωτοκόλλου ακύρωσης υποβλήθηκε επιτυχώς.";
            alertPopUP(message, "green");
            closeAssignmentStatusModal();
            setTimeout(() => {
              if (constUserRole === "supervisor") {
                window.location.reload();
              } else {
                window.location.href = "/assignments";
              }
            }, 1500);
          }
        }
      );
    }
  } catch (error) {
    const message = "Αποτυχία υποβολής αριθμού πρωτοκόλλου.";
    alertPopUP(message, "red");
  }
}

async function changeAssignmentStatusRequest(protocolNumber) {
  try {
    const response = await fetch(
      `/api/assignment/assign/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ protocolNumber: protocolNumber }),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία υποβολής αριθμού πρωτοκόλλου.";
    alertPopUP(message, "red");
  }
}

async function changeAssignmentCancelStatusRequest(
  protocolNumber,
  protocolDetails
) {
  try {
    const response = await fetch(
      `/api/assignment/cancel/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          protocolNumber: protocolNumber,
          protocolDetails: protocolDetails,
        }),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία υποβολής αριθμού πρωτοκόλλου ακύρωσης.";
    alertPopUP(message, "red");
  }
}

// 3. Status change to review
function statusToReview() {
  try {
    statusToReviewRequest().then((response) => {
      if (response && response.success) {
        alertPopUP(response.message, "green");
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      }
    });
  } catch (e) {
    const message = "Αποτυχία αλλαγής κατάστασης ανάθεσης.";
    alertPopUP(message, "red");
  }
}

async function statusToReviewRequest() {
  try {
    const response = await fetch(
      `/api/assignment/review/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return await response.json();
  } catch (e) {
    const message = "Αποτυχία αλλαγής κατάστασης ανάθεσης.";
    alertPopUP(message, "red");
  }
}

// 4. Official Completion
function completeAssignment() {
  try {
    completeAssignmentRequest().then((response) => {
      if (response.success) {
        alertPopUP(response.message, "green");
        setTimeout(() => {
          window.location.href = `/assignments`;
        }, 1500);
      }
    });
  } catch (error) {
    const message = "Αποτυχία αλλαγής κατάστασης σε ολοκληρωμένη.";
    alertPopUP(message, "red");
  }
}

async function completeAssignmentRequest() {
  try {
    const response = await fetch(
      `/api/assignment/complete/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αλλαγής κατάστασης σε ολοκληρωμένη.";
    alertPopUP(message, "red");
  }
}

function openAssignmentStatusModal() {
  const modalContainer = document.getElementById("change-status-modal");

  if (!modalContainer) {
    const message = "Αποτυχία φόρτωσης παραθύρου.";
    alertPopUP(message, "red");
    return;
  }
  const innerModal = modalContainer.querySelector(".modal");

  if (innerModal) {
    constEventModal = innerModal.dataset.event;
    //Store the reason for opening the modal
    modalContainer.classList.add("active");
    document.body.classList.add("no-scroll");
    innerModal.classList.add("small");

    const inputFieldNumProtocol = modalContainer.querySelector(
      "#num-protocol-input"
    );

    if (inputFieldNumProtocol) {
      inputFieldNumProtocol.value = "";
      inputFieldNumProtocol.focus();

      const labelField = modalContainer.querySelector(
        "#label-num-protocol-input"
      );

      checkStatusModalValidation(inputFieldNumProtocol, labelField, 20);
    }

    const inputFieldDetailedCancel = modalContainer.querySelector(
      "#cancel-details-protocol"
    );

    if (inputFieldDetailedCancel) {
      inputFieldNumProtocol.value = "";
      const labelFieldDetailedCancel = modalContainer.querySelector(
        "#label-cancel-details-protocol"
      );
      checkStatusModalValidation(
        inputFieldDetailedCancel,
        labelFieldDetailedCancel,
        150
      );
    }
  } else {
    const message = "Αποτυχία φόρτωσης παραθύρου αναζήτησης.";
    alertPopUP(message, "red");
  }
}

function checkStatusModalValidation(inputElement, labelElement, maxLength) {
  validateInput(inputElement, labelElement, 2, maxLength, true, null);

  const modalContainer = document.getElementById("change-status-modal");
  const innerModal = modalContainer.querySelector(".modal");

  if (!innerModal) return false;

  const officialCancelButton = document.getElementById(
    "apply-cancel-assignment-button"
  );
  const officialAssignButton = document.getElementById(
    "apply-official-assignment-button"
  );

  const statusInputs = innerModal.querySelectorAll(
    'input[type="text"], textarea'
  );
  if (statusInputs && statusInputs.length > 0) {
    for (let input of statusInputs) {
      if (!input.classList.contains("valid")) {
        if (officialCancelButton) {
          officialCancelButton.classList.add("disabled");
        } else if (officialAssignButton) {
          officialAssignButton.classList.add("disabled");
        }
        return false;
      }
    }
  }
  if (officialCancelButton) {
    officialCancelButton.classList.remove("disabled");
  } else if (officialAssignButton) {
    officialAssignButton.classList.remove("disabled");
  }

  return true;
}

function closeAssignmentStatusModal() {
  const modalContainer = document.getElementById("change-status-modal");

  if (!modalContainer) return;

  const inputFieldNumProtocol = modalContainer.querySelector(
    "#num-protocol-input"
  );
  if (inputFieldNumProtocol) {
    inputFieldNumProtocol.value = "";
    const labelField = modalContainer.querySelector(
      "#label-num-protocol-input"
    );
    const spanWarning = labelField.querySelector("span");
    spanWarning.classList.remove("red", "green", "yellow");
    spanWarning.textContent = "";
    inputFieldNumProtocol.classList.remove("valid");
  }
  const inputFieldDetailedCancel = modalContainer.querySelector(
    "#cancel-details-protocol"
  );
  if (inputFieldDetailedCancel) {
    inputFieldDetailedCancel.value = "";
    const labelFieldDetailedCancel = modalContainer.querySelector(
      "#label-cancel-details-protocol"
    );
    const spanWarning = labelFieldDetailedCancel.querySelector("span");
    spanWarning.classList.remove("red", "green", "yellow");
    spanWarning.textContent = "";
    inputFieldNumProtocol.classList.remove("valid");
  }

  modalContainer.classList.remove("active");
  document.body.classList.remove("no-scroll");
  const innerModal = modalContainer.querySelector(".modal");
  if (innerModal) {
    innerModal.classList.remove("small");
  }

  const officialCancelButton = document.getElementById(
    "apply-cancel-assignment-button"
  );
  const officialAssignButton = document.getElementById(
    "apply-official-assignment-button"
  );
  if (officialCancelButton) {
    officialCancelButton.classList.add("disabled");
  } else if (officialAssignButton) {
    officialAssignButton.classList.add("disabled");
  }
}

// ###################### INVITATIONS FUNCTIONS #########################
// 1. Load existing invitations
function loadInvitations(constID) {
  if (invitationsLoaded) {
    return;
  }
  const hasInvitationSection = document.querySelector(
    "#timeline .pending-invitations, #timeline .completed-invitations"
  );
  if (!hasInvitationSection) {
    return;
  }
  try {
    loadInvitationsRequest(constID).then((data) => {
      if (data.success) {
        renderInvitationItem(data.pending, data.completed);
      }
    });
  } catch (error) {
    const invitationsItems = document.querySelectorAll(".invitation-items");
    if (invitationsItems) {
      invitationsItems.forEach((invitationItem) => {
        invitationItem.innerHTML = "";
        const noDataP = document.createElement("p");
        noDataP.classList.add("no-data", "error");
        noDataP.textContent =
          "Αποτυχία φόρτωσης προσκλήσεων. Προσπαθήστε ξανά αργότερα.";
        invitationItem.appendChild(noDataP);
      });
    }
  }
}

async function loadInvitationsRequest() {
  try {
    const response = fetch(
      `/api/assignment/invitations/get/${encodeURIComponent(constID)}`
    );
    return (await response).json();
  } catch (error) {
    const invitationsItems = document.querySelectorAll(".invitation-items");
    if (invitationsItems) {
      invitationsItems.forEach((invitationItem) => {
        invitationItem.innerHTML = "";
        const noDataP = document.createElement("p");
        noDataP.classList.add("no-data", "error");
        noDataP.textContent =
          "Αποτυχία φόρτωσης προσκλήσεων. Προσπαθήστε ξανά αργότερα.";
        invitationItem.appendChild(noDataP);
      });
    }
  }
}

// 2. Open/Close invitations details
function toggleInvitationView(invitationItem) {
  if (invitationItem) {
    if (invitationItem.classList.contains("hidden")) {
      invitationItem.classList.remove("hidden");
    } else {
      invitationItem.classList.add("hidden");
    }
  }
}

// 3. Modal for inviting professors
function openInviteModal(modalContainer) {
  if (!modalContainer) {
    const message = "Αποτυχία φόρτωσης παραθύρου αναζήτησης.";
    alertPopUP(message, "red");
    return;
  }

  const innerModal = modalContainer.querySelector(".modal");
  if (innerModal) {
    modalContainer.classList.add("active");
    document.body.classList.add("no-scroll");
    const searchInput = modalContainer.querySelector("#professor-search");
    if (searchInput) {
      searchInput.focus();
    }
    if (searchProfessorFetchController) {
      searchProfessorFetchController.abort();
    }
    searchProfessorFetchController = new AbortController();
    searchInput.value = "";
    const signal = searchProfessorFetchController.signal;
    getAvailableProfessors("", signal);
  } else {
    const message = "Αποτυχία φόρτωσης παραθύρου αναζήτησης.";
    alertPopUP(message, "red");
  }
}

function closeInviteModal(modalContainer) {
  if (!modalContainer) return;
  modalContainer.classList.remove("active");
  document.body.classList.remove("no-scroll");
  const professorListElement = modalContainer.querySelector(".professors-list");
  if (professorListElement) {
    professorListElement.innerHTML = "";
  }
  const searchInput = modalContainer.querySelector("#professor-search");
  if (searchInput) {
    searchInput.value = "";
  }
  if (searchProfessorFetchController) {
    searchProfessorFetchController.abort();
  }
}

// 4. Search and select professors
function professorSearch(inputValue) {
  if (searchProfessorFetchController) {
    searchProfessorFetchController.abort();
  }
  searchProfessorFetchController = new AbortController();
  const signal = searchProfessorFetchController.signal;
  getAvailableProfessors(inputValue, signal);
}

function selectProfessor(professorItem) {
  if (!professorItem) return;
  const rootList = professorItem.closest(".professors-list");
  if (!rootList) return;
  if (professorItem.classList.contains("selected")) {
    professorItem.classList.remove("selected");
    return;
  }
  professorItem.classList.add("selected");
}

function renderAvailableProfessors(professors) {
  const professorListElement = document.querySelector(".professors-list");
  professorListElement.innerHTML = "";

  if (professors.length > 0) {
    professors.forEach((professor) => {
      const professorItem = document.createElement("li");
      professorItem.classList.add("professor-item");

      professorItem.textContent = professor.fullName;
      professorItem.dataset.userId = professor.userId;
      professorItem.addEventListener("click", () =>
        selectProfessor(professorItem)
      );
      professorListElement.appendChild(professorItem);
    });
  } else {
    professorListElement.innerHTML = "";
    const noDataP = document.createElement("p");
    noDataP.classList.add("no-data");
    noDataP.textContent = "Δεν βρέθηκαν διαθέσιμοι καθηγητές.";
    professorListElement.appendChild(noDataP);
  }
}

// Fetch available professors from server
function getAvailableProfessors(searchTerm, signal) {
  try {
    if (searchTerm.length === 0) {
      searchTerm = "";
    }

    fetchAvailableProfessors(searchTerm, signal).then((data) => {
      if (data && data.success) {
        renderAvailableProfessors(data.professors);
      }
    });
  } catch (error) {
    const professorList = document.querySelector(".professors-list");
    if (professorList) {
      professorList.innerHTML = "";
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data", "error");
      noDataP.textContent =
        "Αποτυχία φόρτωσης δεδομένων. Προσπαθήστε ξανά αργότερα.";
      professorList.appendChild(noDataP);
    }
  }
}

async function fetchAvailableProfessors(searchTerm, signal) {
  try {
    const response = await fetch(
      `/api/assignment/invitation/available/professors/${encodeURIComponent(
        constID
      )}?q=${encodeURIComponent(searchTerm)}`,
      { signal: signal }
    );
    return await response.json();
  } catch (error) {
    const professorList = document.querySelector(".professors-list");
    if (professorList) {
      professorList.innerHTML = "";
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data", "error");
      noDataP.textContent =
        "Αποτυχία φόρτωσης δεδομένων. Προσπαθήστε ξανά αργότερα.";
      professorList.appendChild(noDataP);
    }
  }
}

// 5. Send invitations to selected professors
function sendInvitations(modalContainer) {
  if (!modalContainer) return;
  const selectedProfessors = modalContainer.querySelectorAll(
    ".professor-item.selected"
  );
  if (!selectedProfessors || selectedProfessors.length === 0) {
    const message =
      "Παρακαλώ επιλέξτε τουλάχιστον έναν καθηγητή για να στείλετε την πρόσκληση.";
    alert(message);
  }
  const professorIds = Array.from(selectedProfessors).map(
    (item) => item.dataset.userId
  );
  if (professorIds.length === 0) return;
  try {
    sendInvitationsRequest(professorIds).then((data) => {
      if (data && data.success) {
        const message = "Οι προσκλήσεις στάλθηκαν επιτυχώς.";
        alertPopUP(message, "green");
        closeInviteModal(modalContainer);
        invitationsLoaded = false;
        loadInvitations();
      } else {
        const message = "Αποτυχία αποστολής προσκλήσεων.";
        alertPopUP(message, "red");
      }
    });
  } catch (error) {
    const message = "Αποτυχία αποστολής προσκλήσεων.";
    alertPopUP(message, "red");
    closeInviteModal(modalContainer);
  }
}

async function sendInvitationsRequest(professorIds) {
  try {
    const response = await fetch(
      `/api/assignment/invitation/send/${encodeURIComponent(constID)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ professorIds }),
      }
    );

    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αποστολής προσκλήσεων.";
    alertPopUP(message, "red");
  }
}

// 6. Render invitation Item
function renderInvitationItem(pending, completed) {
  const pendingInvitations = document.querySelector(
    ".invitation-items.pending-list"
  );
  const completedInvitations = document.querySelector(
    ".invitation-items.completed-list"
  );
  if (pendingInvitations) {
    pendingInvitations.innerHTML = "";
    if (pending && pending.length > 0) {
      pending.forEach((invitation) => {
        const invitationMember = document.createElement("li");
        invitationMember.classList.add("invite-member", "hidden");

        const invitationRow = document.createElement("div");
        invitationRow.classList.add("invite-row");

        const nameP = document.createElement("p");
        nameP.classList.add("invite-name");
        nameP.textContent = invitation.professor.fullName;
        invitationRow.appendChild(nameP);

        const statusP = document.createElement("p");
        statusP.classList.add("info-badge", "pending");
        statusP.textContent = "Εκκρεμής";
        invitationRow.appendChild(statusP);
        invitationMember.appendChild(invitationRow);

        const invitationContent = document.createElement("div");
        invitationContent.classList.add("invite-content");

        const sendP = document.createElement("p");
        sendP.textContent = "Απεστάλη: ";
        const sendDateSpan = document.createElement("span");
        sendDateSpan.textContent = formatDate(invitation.createdAt);
        sendDateSpan.classList.add("info-badge");
        sendP.appendChild(sendDateSpan);

        invitationContent.appendChild(sendP);
        invitationMember.appendChild(invitationContent);

        invitationMember.addEventListener("click", (e) => {
          e.preventDefault();
          toggleInvitationView(invitationMember);
        });
        pendingInvitations.appendChild(invitationMember);
      });
    } else if (pending && pending.length === 0) {
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data");
      noDataP.textContent = "Δεν υπάρχουν εκκρεμείς προσκλήσεις.";
      pendingInvitations.appendChild(noDataP);
    }
  }
  if (completedInvitations && completed) {
    completedInvitations.innerHTML = "";
    if (completed && completed.length > 0) {
      completed.forEach((invitation) => {
        const invitationMember = document.createElement("li");
        invitationMember.classList.add("invite-member", "hidden");

        const invitationRow = document.createElement("div");
        invitationRow.classList.add("invite-row");

        const nameP = document.createElement("p");
        nameP.classList.add("invite-name");
        nameP.textContent = invitation.professor.fullName;
        invitationRow.appendChild(nameP);

        const statusP = document.createElement("p");
        statusP.classList.add("info-badge");

        if (invitation.status === "accepted") {
          statusP.classList.add("completed");
          statusP.textContent = "Αποδεκτή";
        } else if (invitation.status === "rejected") {
          statusP.classList.add("cancelled");
          statusP.textContent = "Απορριφθείσα";
        }

        invitationRow.appendChild(statusP);
        invitationMember.appendChild(invitationRow);

        const invitationContent = document.createElement("div");
        invitationContent.classList.add("invite-content");

        const sendP = document.createElement("p");
        sendP.textContent = "Απεστάλη: ";
        const sendDateSpan = document.createElement("span");
        sendDateSpan.textContent = formatDate(invitation.createdAt);
        sendDateSpan.classList.add("info-badge");
        sendP.appendChild(sendDateSpan);
        invitationContent.appendChild(sendP);

        const responseP = document.createElement("p");
        responseP.textContent = "Απαντήθηκε: ";
        const responseDateSpan = document.createElement("span");
        responseDateSpan.textContent = formatDate(invitation.updatedAt);
        responseDateSpan.classList.add("info-badge");
        responseP.appendChild(responseDateSpan);
        invitationContent.appendChild(responseP);

        invitationMember.appendChild(invitationContent);

        invitationMember.addEventListener("click", (e) => {
          e.preventDefault();
          toggleInvitationView(invitationMember);
        });
        completedInvitations.appendChild(invitationMember);
      });
    } else if (completed && completed.length === 0) {
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data");
      noDataP.textContent = "Δεν υπάρχουν ολοκληρωμένες προσκλήσεις.";
      completedInvitations.appendChild(noDataP);
    }
  }
  invitationsLoaded = true;
}

// ###################### NOTES FUNCTIONS #########################
// 1. Load existing notes
function loadNotes() {
  if (notesLoaded) {
    return;
  }
  const notesList = document.querySelector(".notes-list");
  if (!notesList) {
    return;
  }
  try {
    loadNotesRequest().then((data) => {
      if (data.success) {
        notesList.innerHTML = "";
        if (data.notes && data.notes.length > 0) {
          data.notes.forEach((note) => {
            const noteItem = renderNotes(note);
            notesList.appendChild(noteItem);
          });
        } else {
          const noDataP = document.createElement("p");
          noDataP.classList.add("no-data");
          noDataP.textContent = "Δεν υπάρχουν σημειώσεις.";
          notesList.appendChild(noDataP);
        }
        notesLoaded = true;
      }
    });
  } catch (error) {
    notesList.innerHTML = "";
    const noDataP = document.createElement("p");
    noDataP.classList.add("no-data", "error");
    noDataP.textContent = "Αποτυχία φόρτωσης σημειώσεων. Προσπαθήστε ξανά.";
    notesList.appendChild(noDataP);
  }
}

async function loadNotesRequest() {
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(constID)}`);
    return await response.json();
  } catch (error) {
    const notesList = document.querySelector(".notes-list");
    if (notesList) {
      notesList.innerHTML = "";
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data", "error");
      noDataP.textContent = "Αποτυχία φόρτωσης σημειώσεων. Προσπαθήστε ξανά.";
      notesList.appendChild(noDataP);
    }
  }
}

// 2. Open note content modal
function openModalNote(noteItem) {
  const modalContainer = document.getElementById("notes-modal-container");
  if (modalContainer) {
    const innerModal = modalContainer.querySelector(".modal");
    if (innerModal) {
      modalContainer.classList.add("active");
      document.body.classList.add("no-scroll");
      const modalTitle = document.getElementById("modal-title");
      modalTitle.textContent = noteItem.dataset.noteTitle;
      const noteContentText = document.getElementById("name-content-text");
      noteContentText.textContent = noteItem.dataset.noteContent;
    }
  }
}

function closeModalNote() {
  const modalContainer = document.getElementById("notes-modal-container");
  if (modalContainer) {
    modalContainer.classList.remove("active");
    document.body.classList.remove("no-scroll");
    const modalTitle = modalContainer.querySelector("#modal-title");
    if (modalTitle) modalTitle.textContent = "";
    const modalContent = modalContainer.querySelector("#modal-note-content");
    if (modalContent) modalContent.textContent = "";
  }
}

// 3. Delete note
function deleteNote(noteItem) {
  if (!noteItem) return;
  const noteId = noteItem.dataset.noteId;
  if (!noteId) return;
  const confirmed = confirm(
    "Επιβεβαίωση διαγραφής σημείωσης. Η ενέργεια αυτή δεν μπορεί να αναιρεθεί."
  );
  if (confirmed) {
    try {
      deleteNoteRequest(noteId).then((response) => {
        if (response && response.success) {
          noteItem.remove();
          const notesList = document.getElementById("notes-list");
          if (notesList && notesList.children.length === 0) {
            notesList.innerHTML = "";
            const noDataP = document.createElement("p");
            noDataP.classList.add("no-data");
            noDataP.textContent = "Δεν υπάρχουν σημειώσεις.";
            notesList.appendChild(noDataP);
          }
          alertPopUP("Η σημείωση διαγράφηκε επιτυχώς.", "green");
        } else {
          const message = "Αποτυχία διαγραφής σημείωσης.";
          alertPopUP(message, "red");
        }
      });
    } catch (error) {
      const message = "Αποτυχία διαγραφής σημείωσης.";
      alertPopUP(message, "red");
    }
  }
}

async function deleteNoteRequest(noteId) {
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία διαγραφής σημείωσης.";
    alertPopUP(message, "red");
  }
}

// 4. New note functions
function showNewNote() {
  const newNoteItem = document.querySelector(".new-note-container");
  const notesList = document.getElementById("notes-list");
  if (!newNoteItem || !notesList) return;
  const noData = notesList.querySelector(".no-data");

  if (newNoteItem) {
    newNoteItem.style.display = "block";
    newNoteItem.scrollIntoView({ behavior: "smooth", block: "center" });
    if (noData) noData.remove();
  }
  const inputNoteTitle = document.getElementById("new-note-title");
  const labelNoteTitle = document.getElementById("label-new-note-title");
  if (inputNoteTitle) {
    const value = inputNoteTitle.value.trim();
    checkNoteValidity(inputNoteTitle, value, labelNoteTitle, 50);
  }
  const newNoteContent = document.getElementById("new-note-content");
  const labelNoteContent = document.getElementById("label-new-note-content");
  if (newNoteContent) {
    const value = newNoteContent.value.trim();
    checkNoteValidity(newNoteContent, value, labelNoteContent, 300);
  }
}

function cancelNewNote() {
  const newNoteItem = document.querySelector(".new-note-container");
  if (!newNoteItem) return;
  newNoteItem.style.display = "none";
  newNoteItem
    .querySelectorAll('input[type="text"], textarea')
    .forEach((el) => (el.value = ""));
  const notesList = document.getElementById("notes-list");
  if (notesList && notesList.querySelectorAll("li.note-item").length === 0) {
    notesList.innerHTML = "";
    const noDataP = document.createElement("p");
    noDataP.classList.add("no-data");
    noDataP.textContent = "Δεν υπάρχουν σημειώσεις.";
    notesList.appendChild(noDataP);
  }
  const newNoteSubmitButton = document.getElementById("submit-new-note-button");
  if (newNoteSubmitButton) {
    newNoteSubmitButton.classList.add("disabled");
  }
}

function submitNewNote(noteTitle, noteContent) {
  try {
    submitNewNoteRequest(noteTitle, noteContent).then((response) => {
      if (response && response.success) {
        const notesList = document.getElementById("notes-list");
        if (notesList) {
          const noData = notesList.querySelector(".no-data");
          if (noData) noData.style.display = "none";
          const newNoteItem = renderNotes(response.note);
          if (notesList.firstChild) {
            notesList.insertBefore(newNoteItem, notesList.firstChild);
          } else {
            notesList.appendChild(newNoteItem);
          }

          const message = "Η σημείωση αποθηκεύτηκε επιτυχώς.";
          alertPopUP(message, "green");
          cancelNewNote();
        }
      }
    });
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης σημείωσης.";
    alertPopUP(message, "red");
  }
}

async function submitNewNoteRequest(noteTitle, noteDetails) {
  try {
    const response = await fetch(`/api/notes/${encodeURIComponent(constID)}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ noteTitle, noteDetails }),
    });
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης σημείωσης.";
    alertPopUP(message, "red");
  }
}

// Render note item
function renderNotes(note) {
  const li = document.createElement("li");
  li.className = "info-member note-item";
  li.dataset.noteId = note.id;
  li.dataset.noteTitle = note.noteTitle;
  li.dataset.noteContent = note.noteContent;
  li.dataset.noteDate = note.dateCreated;

  const titleP = document.createElement("p");
  titleP.textContent = note.noteTitle;
  li.appendChild(titleP);

  // status wrapper similar to meeting-status
  const statusWrapper = document.createElement("div");
  statusWrapper.className = "meeting-status";

  const dateP = document.createElement("p");
  dateP.className = "info-badge";
  dateP.textContent = formatDate(note.dateCreated);
  statusWrapper.appendChild(dateP);

  const delSpan = document.createElement("span");
  delSpan.className = "delete-wrapper";
  const a = document.createElement("a");
  const img = document.createElement("img");
  img.className = "delete-note-icon";
  img.src = "/icons/delete.png";
  img.alt = "Delete Note Icon";
  a.appendChild(img);

  delSpan.appendChild(a);
  statusWrapper.appendChild(delSpan);
  li.appendChild(statusWrapper);

  img.addEventListener("click", (e) => {
    e.stopPropagation(); // prevent click from bubbling to li
    deleteNote(li);
  });

  li.addEventListener("click", () => {
    openModalNote(li);
  });

  return li;
}

// check validity of note input fields
function checkNoteValidity(inputElement, inputValue, labelElement, maxLength) {
  validateInput(inputElement, labelElement, 5, maxLength, true, null);
  const newNoteContainer = document.querySelector(".new-note-container");
  if (!newNoteContainer) return false;
  const newNoteSubmitButton = document.getElementById("submit-new-note-button");

  const newNoteInputs = newNoteContainer.querySelectorAll(
    'input[type="text"], textarea'
  );
  if (newNoteInputs && newNoteInputs.length > 0) {
    for (let input of newNoteInputs) {
      if (!input.classList.contains("valid")) {
        newNoteSubmitButton.classList.add("disabled");
        return false;
      }
    }
  }

  if (newNoteSubmitButton) {
    newNoteSubmitButton.classList.remove("disabled");
  }
  return true;
}

// ###################### GRADES FUNCTIONS #########################
// 1. Load existing grades
function loadGrades() {
  if (evaluationLoaded) {
    return;
  }
  const table = document.querySelector(".evaluation-table");
  if (!table) {
    return;
  }
  try {
    loadGradesRequest().then((data) => {
      if (data.success && data.grades) {
        const evalData = data.grades;
        // For each input with data-role + data-metric fill value if present
        table.querySelectorAll("input.evaluation-input").forEach((inp) => {
          const role = inp.getAttribute("data-role");
          const metric = inp.getAttribute("data-metric");
          if (
            role &&
            metric &&
            evalData[role] &&
            evalData[role][metric] != null
          ) {
            inp.value = evalData[role][metric];
          }
        });
        evaluationLoaded = true;
      } else {
        const message =
          "Αποτυχία φόρτωσης βαθμολογίας. Προσπαθήστε ξανά αργότερα.";
        alertPopUP(message, "red");
      }
    });
  } catch (error) {
    const gradesContainer = document.querySelector(".grades-container");
    if (gradesContainer) {
      gradesContainer.innerHTML = "";
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data", "error");
      noDataP.textContent =
        "Αποτυχία φόρτωσης βαθμολογίας. Προσπαθήστε ξανά αργότερα.";
      gradesContainer.appendChild(noDataP);
    }
  }
}

async function loadGradesRequest() {
  try {
    const response = await fetch(
      `/api/assignment/grades/${encodeURIComponent(constID)}`
    );
    return await response.json();
  } catch (error) {
    const gradesContainer = document.querySelector(".grades-container");
    if (gradesContainer) {
      gradesContainer.innerHTML = "";
      const noDataP = document.createElement("p");
      noDataP.classList.add("no-data", "error");
      noDataP.textContent =
        "Αποτυχία φόρτωσης βαθμολογίας. Προσπαθήστε ξανά αργότερα.";
      gradesContainer.appendChild(noDataP);
    }
  }
}

// 2. Validate and submit grades
function gradesTableListeners() {
  const gradesTable = document.querySelector(".evaluation-table");
  // Select only inputs that are not readonly
  const editableInputs = gradesTable.querySelectorAll(
    'input[type="number"]:not([readonly])'
  );
  const saveButton = document.getElementById("save-grades-button");

  for (const input of editableInputs) {
    input.addEventListener("input", (e) => {
      const value = parseFloat(e.target.value);
      if (isNaN(value) || value < 0 || value > 10) {
        input.classList.add("error");
        input.classList.remove("valid");
      } else {
        input.classList.remove("error");
        input.classList.add("valid");
      }
      checkAllValid();
    });
  }

  function checkAllValid() {
    let check = false;
    const validInputs = gradesTable.querySelectorAll(
      'input[type="number"].valid'
    );
    if (validInputs.length === editableInputs.length) {
      check = true;
    }
    if (check) {
      saveButton.classList.remove("disabled");
    } else {
      saveButton.classList.add("disabled");
    }
    return check;
  }

  if (saveButton) {
    saveButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (checkAllValid()) {
        if (saveButton.classList.contains("disabled")) {
          return;
        }

        if (constExistGrades === "false") {
          const grades = createGradesObject(editableInputs);
          uploadGrades(grades);
        } else if (constExistGrades === "true") {
          const grades = createGradesObject(editableInputs);
          updateGrades(grades);
        }
      }
    });
  }
}

// Create grades object from inputs
function createGradesObject(inputs) {
  let gradeObject = {};
  inputs.forEach((input) => {
    const metric = input.dataset.metric;
    const value = parseFloat(input.value);
    if (!isNaN(value) && value >= 0 && value <= 10) {
      gradeObject[metric] = value;
    }
  });
  return gradeObject;
}

function updateEvaluationTable() {
  const evaluationTable = document.querySelector(".evaluation-table");
  if (evaluationTable) {
    const editableInputs = evaluationTable.querySelectorAll(
      'input[type="number"]:not([readonly])'
    );
    const saveButton = document.getElementById("save-grades-button");
    editableInputs.forEach((input) => {
      input.setAttribute("readonly", "true");
    });
    if (saveButton) {
      saveButton.remove();
    }
    gradesTableListeners();
  }
}

// Upload grades to server
function uploadGrades(grades) {
  try {
    uploadGradesRequest(grades).then((response) => {
      if (response && response.success) {
        const message = "Η βαθμολογία αποθηκεύτηκε επιτυχώς.";
        alertPopUP(message, "green");
        updateEvaluationTable();
      } else {
        const message = "Αποτυχία αποθήκευσης βαθμολογίας.";
        alertPopUP(message, "red");
      }
    });
  } catch (e) {
    const message = "Αποτυχία αποθήκευσης βαθμολογίας.";
    alertPopUP(message, "red");
  }
}

async function uploadGradesRequest(grades) {
  try {
    const response = await fetch(
      `/api/assignment/grades/${encodeURIComponent(constID)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(grades),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης βαθμολογίας.";
    alertPopUP(message, "red");
  }
}

// Update grades
function updateGrades(grades) {
  try {
    updateGradesRequest(grades).then((response) => {
      if (response && response.success) {
        const message = "Η βαθμολογία αποθηκεύτηκε επιτυχώς.";
        alertPopUP(message, "green");
        updateEvaluationTable();
      } else {
        const message = "Αποτυχία αποθήκευσης βαθμολογίας.";
        alertPopUP(message, "red");
      }
    });
  } catch (e) {
    const message = "Αποτυχία αποθήκευσης βαθμολογίας.";
    alertPopUP(message, "red");
  }
}

async function updateGradesRequest(grades) {
  try {
    const response = await fetch(
      `/api/assignment/grades/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(grades),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης βαθμολογίας.";
    alertPopUP(message, "red");
  }
}

// 3. Mobile navigation for grades
function mobileGradeNavigation() {
  const evaluationGradesContainer = document.querySelector(".grades-container");
  if (!evaluationGradesContainer) {
    return;
  }

  const mobileNavigationBar = evaluationGradesContainer.querySelector(
    ".mobile-navigation-table"
  );
  const evaluationTable =
    evaluationGradesContainer.querySelector(".evaluation-table");

  if (!mobileNavigationBar || !evaluationTable) {
    return;
  }

  const currentUserThesisRole = document
    .querySelector(".assignment-detail-container")
    ?.getAttribute("data-user-role");
  const previousEvaluatorButton =
    mobileNavigationBar.querySelector(".back-arrow");
  const nextEvaluatorButton = mobileNavigationBar.querySelector(".front-arrow");
  const currentEvaluatorLabel = mobileNavigationBar.querySelector(
    ".current-table-professor"
  );

  if (
    !previousEvaluatorButton ||
    !nextEvaluatorButton ||
    !currentEvaluatorLabel
  ) {
    return;
  }

  const headerCellElements = Array.from(evaluationTable.tHead.rows[0].cells);
  if (headerCellElements.length < 2) return;

  // map roles with labels
  const evaluatorRoleDefinitions = [
    { role: "supervisor", label: "Επιβλέπων" },
    {
      role: "memberA",
      label: "Μέλος Α",
    },
    { role: "memberB", label: "Μέλος Β" },
  ];

  const evaluatorColumns = evaluatorRoleDefinitions
    .map((definition, rolePosition) => ({
      ...definition,
      index: rolePosition + 1, // skip category col (0)
      header: headerCellElements[rolePosition + 1],
    }))
    .filter((columnMeta) => !!columnMeta.header);

  if (!evaluatorColumns.length) return;

  const tableBodyRows = Array.from(evaluationTable.tBodies[0].rows || []);
  evaluatorColumns.forEach((columnMeta) => {
    columnMeta.cells = tableBodyRows
      .map((rowEl) => rowEl.cells[columnMeta.index])
      .filter(Boolean);
  });

  function resolveInitialEvaluatorColumnIndex(role) {
    const desiredRole = role === "student" ? "supervisor" : role;
    const foundIndex = evaluatorColumns.findIndex(
      (col) => col.role === desiredRole
    );
    return foundIndex;
  }

  let currentEvaluatorColumnIndex = resolveInitialEvaluatorColumnIndex(
    currentUserThesisRole
  );

  function updateCurrentEvaluatorLabel(columnIndex) {
    currentEvaluatorLabel.textContent =
      evaluatorColumns[columnIndex]?.label || "-";
  }

  function updateNavigationButtonState() {
    previousEvaluatorButton.disabled = currentEvaluatorColumnIndex === 0;
    nextEvaluatorButton.disabled =
      currentEvaluatorColumnIndex === evaluatorColumns.length - 1;
  }

  function showOnlyEvaluatorColumn(columnIndex) {
    // Always keep the category column visible
    headerCellElements[0].classList.remove("hidden");
    tableBodyRows.forEach((rowEl) =>
      rowEl.cells[0]?.classList.remove("hidden")
    );

    // Hide all evaluator columns
    evaluatorColumns.forEach((columnMeta) => {
      columnMeta.header.classList.add("hidden");
      columnMeta.cells.forEach((cellEl) => cellEl.classList.add("hidden"));
    });

    // Reveal selected evaluator column
    const selectedColumnMeta = evaluatorColumns[columnIndex];
    if (selectedColumnMeta) {
      selectedColumnMeta.header.classList.remove("hidden");
      selectedColumnMeta.cells.forEach((cellEl) =>
        cellEl.classList.remove("hidden")
      );
    }
    updateCurrentEvaluatorLabel(columnIndex);
    updateNavigationButtonState();
  }

  const isMobileViewport = window.innerWidth <= 768;
  if (isMobileViewport) {
    mobileNavigationBar.style.display = "flex";
    showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
  } else {
    mobileNavigationBar.style.display = "none";
    headerCellElements.forEach((th) => th.classList.remove("hidden"));
    tableBodyRows.forEach((rowEl) =>
      Array.from(rowEl.cells).forEach((cellEl) =>
        cellEl.classList.remove("hidden")
      )
    );
  }

  previousEvaluatorButton.onclick = () => {
    if (currentEvaluatorColumnIndex > 0) {
      currentEvaluatorColumnIndex--;
      showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
    }
  };
  nextEvaluatorButton.onclick = () => {
    if (currentEvaluatorColumnIndex < evaluatorColumns.length - 1) {
      currentEvaluatorColumnIndex++;
      showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
    }
  };

  window.addEventListener("resize", () => {
    const isMobileViewport = window.innerWidth <= 768;
    if (isMobileViewport) {
      mobileNavigationBar.style.display = "flex";
      showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
    } else {
      mobileNavigationBar.style.display = "none";
      headerCellElements.forEach((th) => th.classList.remove("hidden"));
      tableBodyRows.forEach((rowEl) =>
        Array.from(rowEl.cells).forEach((cellEl) =>
          cellEl.classList.remove("hidden")
        )
      );
    }
  });
}

// ###################### TEMPORARY FILE/LINKS FUNCTIONS #########################
// 1. Temporary file input change
function initLinkAddition() {
  const wrapper = document.querySelector(".student-add-links");
  if (!wrapper) return;

  const inputsContainer = wrapper.querySelector(".added-link-inputs");
  const addBtn = wrapper.querySelector(".nav-arrow.add-link-input");
  const removeBtn = wrapper.querySelector(".nav-arrow.remove-link-input");
  if (!inputsContainer || !addBtn || !removeBtn) return;

  const MAX_LINKS = 4; // maximum finalized + pending inputs

  function workingCount() {
    return inputsContainer.children.length;
  }

  function updateButtons() {
    addBtn.disabled = workingCount() >= MAX_LINKS;
    removeBtn.disabled = workingCount() === 0;
  }

  function finalizeInput(inputEl) {
    if (!inputEl) return;

    const rawOriginal = inputEl.value.trim();
    if (!rawOriginal) {
      inputEl.classList.remove("valid");
      checkCurrentUploadState();
      return;
    }

    const href = ensureScheme(rawOriginal);

    if (href) {
      inputEl.classList.add("valid");
    } else {
      inputEl.classList.remove("valid");
    }

    updateButtons();
  }

  function attachFinalizers(inputEl) {
    inputEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        finalizeInput(inputEl);
        checkCurrentUploadState();
      }
    });
    inputEl.addEventListener("input", () => {
      finalizeInput(inputEl);
      checkCurrentUploadState();
    });
  }

  addBtn.addEventListener("click", (e) => {
    e.preventDefault();
    if (workingCount() >= MAX_LINKS) return;
    const input = document.createElement("input");
    input.type = "url";
    input.placeholder = "Προσθήκη συνδέσμου";
    input.className = "link-input-field";
    inputsContainer.appendChild(input);
    checkCurrentUploadState();
    attachFinalizers(input);
    input.focus();
    updateButtons();
  });

  removeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    const last = inputsContainer.lastElementChild;
    if (last) last.remove();
    checkCurrentUploadState();
    updateButtons();
  });

  wrapper.dataset.linksInit = "true";
  updateButtons();
}

// 2. Change input file state
function changeInputFileState(inputElement, newPath) {
  const fileGroup = document.querySelector(".tmp-file");
  if (!newPath) {
    if (!inputElement.files || !inputElement.files[0]) return;

    inputElement.classList.remove("valid");

    if (inputElement.files && inputElement.files.length > 0) {
      inputElement.style.display = "none";

      const selectedFile = inputElement.files[0];
      const fileExt = (
        selectedFile.name.lastIndexOf(".") !== -1
          ? selectedFile.name.split(".").pop()
          : ""
      ).toUpperCase();
      const objectUrl = URL.createObjectURL(selectedFile);

      // Create a new preview element
      const preview = document.createElement("p");
      preview.className = "group-value tmp-file-preview";

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
      removeButton.classList.add("x-icon", "active");
      removeButton.setAttribute("aria-label", "Remove selected file");
      removeButton.textContent = "×";

      removeButton.addEventListener("click", (e) => {
        e.preventDefault();
        inputElement.value = "";
        inputElement.style.display = "";
        preview.remove();
        URL.revokeObjectURL(objectUrl);
        inputElement.classList.remove("valid");
        checkCurrentUploadState();
      });

      preview.appendChild(link);
      preview.appendChild(removeButton);

      inputElement.classList.add("valid");
      fileGroup.appendChild(preview);
    }
    checkCurrentUploadState();
  } else {
    const reqFileName = newPath.split("/").pop();
    const reqFileExt =
      reqFileName && reqFileName.includes(".")
        ? reqFileName.split(".").pop().toUpperCase()
        : "";

    // Create a new preview element
    const preview = document.createElement("p");
    preview.className = "group-value tmp-file-preview";

    const link = document.createElement("a");
    link.className = "attachment-link";
    link.href = newPath;
    link.target = "_blank";
    link.title = reqFileName;

    const iconSpan = document.createElement("span");
    iconSpan.className = "attachment-icon";
    iconSpan.textContent = "📄";

    const nameSpan = document.createElement("span");
    nameSpan.className = "name-content";
    nameSpan.textContent = reqFileName;

    const extSpan = document.createElement("span");
    extSpan.className = "attachment-type";
    extSpan.textContent = reqFileExt;

    link.appendChild(iconSpan);
    link.appendChild(nameSpan);
    link.appendChild(extSpan);
    preview.appendChild(link);
    fileGroup.appendChild(preview);
  }
}

// 3. Check current upload state
function checkCurrentUploadState() {
  let check = false; // default is false

  // 🔹 Check temporary report file
  const inputTmpReport = document.getElementById("temporary-report-file");
  if (
    inputTmpReport &&
    inputTmpReport.classList.contains("valid") &&
    inputTmpReport.files &&
    inputTmpReport.files.length > 0
  ) {
    check = true;
  }

  const divLinks = document.querySelector(".student-add-links");
  if (divLinks) {
    const linkInputs = divLinks.querySelectorAll("input.link-input-field");
    for (let input of linkInputs) {
      if (!input.classList.contains("valid")) {
        check = false;
        break;
      } else {
        check = true;
      }
    }
  }

  // 🔹 Show/hide button based on state
  const studentUploadTmpButton = document.getElementById(
    "student-upload-button"
  );
  if (studentUploadTmpButton) {
    if (check) {
      studentUploadTmpButton.classList.remove("disabled");
    } else {
      studentUploadTmpButton.classList.add("disabled");
    }
  }

  return check;
}

// 4. Student upload temporary data function
function studentUpload(submitButton) {
  try {
    const inputTmpReport = document.getElementById("temporary-report-file");
    const divLinks = document.querySelector(".student-add-links");
    let formLinks = [];
    if (divLinks) {
      const linkInputs = divLinks.querySelectorAll("input.link-input-field");
      for (let input of linkInputs) {
        if (input.classList.contains("valid") && input.value.trim() !== "") {
          formLinks.push(input.value.trim());
        }
      }
    }

    const formData = new FormData();

    if (inputTmpReport) {
      if (inputTmpReport.files && inputTmpReport.files.length > 0) {
        formData.append("file", inputTmpReport.files[0]);
      } else {
        formData.append("file", null);
      }
    }

    formData.append(
      "links",
      formLinks.length > 0 ? JSON.stringify(formLinks) : ""
    );

    studentUploadRequest(formData).then((response) => {
      if (response && response.success) {
        if (response.filePath) {
          const preview = document.querySelector(".tmp-file-preview");
          preview.remove();
          inputTmpReport.remove();
          changeInputFileState(null, response.filePath);
          renderPresentationButton();
        }

        if (response.links && response.links.length > 0) {
          renderResponseLinks(response.links);
        }

        if (response.existsBoth) {
          submitButton.remove();
        } else {
          submitButton.classList.add("disabled");
        }

        const message = "Η υποβολή ολοκληρώθηκε με επιτυχία.";
        alertPopUP(message, "green");
      } else {
        const message = "Αποτυχία υποβολής.";
        alertPopUP(message, "red");
      }
    });
  } catch (e) {
    const message = "Αποτυχία υποβολής.";
    alertPopUP(message, "red");
  }
}

async function studentUploadRequest(formData) {
  try {
    const response = await fetch(
      `/api/assignment/student/upload-temp/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        body: formData,
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία υποβολής.";
    alertPopUP(message, "red");
  }
}

// 5. Render response links
function renderResponseLinks(links) {
  const divLinks = document.querySelector(".student-add-links");
  if (divLinks) {
    divLinks.remove();
  }
  const groupLinks = document.querySelector(".content-group.links");
  if (groupLinks) {
    const newLinksList = document.createElement("ul");
    newLinksList.className = "links-list";
    links.forEach((link) => {
      const li = document.createElement("li");
      li.className = "group-value";
      li.appendChild(renderLink(link));
      newLinksList.appendChild(li);
    });
    groupLinks.appendChild(newLinksList);
  }
}

// ###################### PROTOCOL FUNCTIONS #########################
function setDateTimeInput(inputElement) {
  const minDate = inputElement.dataset.minDate;
  flatpickr("#protocol-date-time", {
    locale: "gr",
    enableTime: true,
    time_24hr: true,
    dateFormat: "d/m/Y H:i",
    minDate: minDate,
    maxDate: new Date(),
    allowInput: true,
  });

  validateDateInput(inputElement);
}

function editableProtocolListeners() {
  const protocolContainer = document.querySelector(".protocol-container");
  const editableInputs = protocolContainer.querySelectorAll("input");
  editableInputs.forEach((input) => {
    if (input.id === "protocol-date-time") {
      setDateTimeInput(input);
    } else {
      validateInput(input, input.parentElement, 1, 20, true, null);
    }
    input.addEventListener("input", (e) => {
      e.preventDefault();
      if (input.id === "protocol-date-time") {
        validateDateInput(input);
      } else if (input.type === "number") {
        validateNumbers(input);
      } else {
        validateInput(input, input.parentElement, 1, 20, true, null);
      }
      checkAllValidProtocol();
    });
  });

  const submitProtocolButton = document.getElementById(
    "submit-protocol-button"
  );
  if (submitProtocolButton) {
    submitProtocolButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (submitProtocolButton.classList.contains("disabled")) {
        return;
      }
      if (checkAllValidProtocol()) {
        const dateTimeInput = document.getElementById("protocol-date-time");
        const placeInput = document.getElementById("protocol-place");
        const tmpGradeInput = document.getElementById("protocol-tmp-grade");
        const finalGradeInput = document.getElementById("protocol-final-grade");
        const protocol = createProtocolObject(
          dateTimeInput.value.trim(),
          placeInput.value.trim(),
          parseFloat(tmpGradeInput.value.trim()),
          parseFloat(finalGradeInput.value.trim())
        );

        uploadProtocol(protocol);
      }
    });
  }
}

function createProtocolObject(dateTime, place, tmpGrade, finalGrade) {
  return {
    dateTime: parseToISO(dateTime),
    place: place,
    tmpGrade: tmpGrade,
    finalGrade: finalGrade,
  };
}

function renderProtocol(protocol) {
  const dateInput = document.getElementById("protocol-date-time");
  const placeInput = document.getElementById("protocol-place");
  const tmpGradeInput = document.getElementById("protocol-tmp-grade");
  const finalGradeInput = document.getElementById("protocol-final-grade");

  if (dateInput && protocol.dateTime) {
    const dateLabel = document.getElementById("label-protocol-date-time");
    clearSpanWarning(dateLabel);
    const dateP = document.createElement("p");
    dateP.className = "group-value";
    const dateObj = new Date(protocol.dateTime);
    dateP.textContent = dateObj.toLocaleString("el-GR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    dateInput.replaceWith(dateP);
  }

  if (placeInput && protocol.place) {
    const placeLabel = document.getElementById("label-protocol-place");
    clearSpanWarning(placeLabel);
    const placeP = document.createElement("p");
    placeP.className = "group-value";
    placeP.textContent = protocol.place;
    placeInput.replaceWith(placeP);
  }
  if (tmpGradeInput && protocol.tmpGrade != null) {
    const tmpGradeLabel = document.getElementById("label-tmp-grade");
    clearSpanWarning(tmpGradeLabel);
    const tmpGradeP = document.createElement("p");
    tmpGradeP.className = "group-value";
    tmpGradeP.textContent = protocol.tmpGrade.toFixed(2);
    tmpGradeInput.replaceWith(tmpGradeP);
  }
  if (finalGradeInput && protocol.finalGrade != null) {
    const finalGradeLabel = document.getElementById("label-final-grade");
    clearSpanWarning(finalGradeLabel);
    const finalGradeP = document.createElement("p");
    finalGradeP.className = "group-value";
    finalGradeP.textContent = protocol.finalGrade.toFixed(2);
    finalGradeInput.replaceWith(finalGradeP);
  }

  const submitButton = document.getElementById("submit-protocol-button");
  if (submitButton) {
    const viewButton = document.createElement("a");
    viewButton.className = "standard-button";
    viewButton.textContent = "Προβολή";
    viewButton.href = `/protocol/${constID}`;
    viewButton.target = "_blank";
    submitButton.replaceWith(viewButton);
  }
}

function uploadProtocol(protocol) {
  try {
    uploadProtocolRequest(protocol).then((response) => {
      if (response && response.success) {
        renderProtocol(protocol);
        const message = "Το πρωτόκολλο αποθηκεύτηκε επιτυχώς.";
        alertPopUP(message, "green");
      } else {
        const message = "Αποτυχία αποθήκευσης πρωτοκόλλου.";
        alertPopUP(message, "red");
      }
    });
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης πρωτοκόλλου.";
    alertPopUP(message, "red");
  }
}

async function uploadProtocolRequest(protocol) {
  try {
    const response = await fetch(
      `/api/assignment/protocol/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(protocol),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης πρωτοκόλλου.";
    alertPopUP(message, "red");
  }
}

function checkAllValidProtocol() {
  const protocolContainer = document.querySelector(".protocol-container");
  if (!protocolContainer) return;
  const submitButton = document.getElementById("submit-protocol-button");
  if (!submitButton) return;
  let check = false;
  const validInputs = protocolContainer.querySelectorAll("input.valid");
  const allInputs = protocolContainer.querySelectorAll("input");
  if (validInputs.length === allInputs.length) {
    check = true;
  }
  if (check) {
    submitButton.classList.remove("disabled");
  } else {
    submitButton.classList.add("disabled");
  }
  return check;
}

// ###################### NEMERTES LINK FUNCTIONS #########################
function checkNemertesForm(nemertesInput) {
  let check = false;
  const labelInput = nemertesInput.parentElement;
  const spanWarning = labelInput.querySelector("span");

  if (
    ensureScheme(nemertesInput.value.trim()) ||
    nemertesInput.value.trim().length === 0
  ) {
    validateInput(nemertesInput, labelInput, 1, 200, true, null);
  } else {
    spanWarning.classList.remove("red", "green", "yellow");
    spanWarning.textContent = "Μη έγκυρο URL";
    spanWarning.classList.add("red");
    nemertesInput.classList.remove("valid");
  }

  const nemertesButton = document.getElementById("nemertes-upload-button");
  if (nemertesButton) {
    if (nemertesInput.classList.contains("valid")) {
      nemertesButton.classList.remove("disabled");
      check = true;
    } else {
      nemertesButton.classList.add("disabled");
    }
  }
  return check;
}

function renderNemertesLink(link) {
  const nemertesInput = document.getElementById("nemertes-link-input");
  if (nemertesInput) {
    const labelInput = nemertesInput.parentElement;
    clearSpanWarning(labelInput);
    const dataP = document.createElement("p");
    dataP.className = "group-value";
    const linkElement = renderLink(link);
    const nameContent = linkElement.querySelector(".name-content");
    if (nameContent) {
      nameContent.textContent = "Νημέρτης";
    }
    dataP.appendChild(linkElement);
    nemertesInput.replaceWith(dataP);
  }
  const nemertesButton = document.getElementById("nemertes-upload-button");
  if (nemertesButton) {
    nemertesButton.remove();
  }
}

function uploadNemertesLink(link) {
  try {
    uploadNemertesLinkRequest(link).then((response) => {
      if (response && response.success) {
        renderNemertesLink(link);
        const message = "Ο σύνδεσμος Νημέρτης αποθηκεύτηκε επιτυχώς.";
        alertPopUP(message, "green");
      } else {
        const message = "Αποτυχία αποθήκευσης συνδέσμου Νημέρτης.";
        alertPopUP(message, "red");
      }
    });
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης συνδέσμου Νημέρτης.";
    alertPopUP(message, "red");
  }
}

async function uploadNemertesLinkRequest(link) {
  try {
    const response = await fetch(
      `/api/assignment/nemertes/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ link: link }),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία αποθήκευσης συνδέσμου Νημέρτης.";
    alertPopUP(message, "red");
  }
}

// ###################### ANNOUNCEMENT FUNCTIONS #########################
// 1. Load existing announcement
function loadAnnouncement() {
  try {
    loadAnnouncementRequest().then((data) => {
      if (data.success && data.announcement) {
        updateModalAnnouncement(data.announcement, "load");
      }
    });
  } catch (error) {
    const message = "Αποτυχία φόρτωσης παρουσίασης.";
    alertPopUP(message, "red");
  }
}

async function loadAnnouncementRequest() {
  try {
    const response = await fetch(
      `/api/assignment/announcement/${encodeURIComponent(constID)}`
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία φόρτωσης παρουσίασης.";
    alertPopUP(message, "red");
  }
}

function openAnnouncementModal() {
  const modalAnnouncement = document.getElementById(
    "create-announcement-modal"
  );
  if (!modalAnnouncement) return;
  const innerModal = modalAnnouncement.querySelector(".modal");
  if (innerModal) {
    if (modalAnnouncement.dataset.existAnnouncement === "true") {
      loadAnnouncement();
    } else {
      const dateInput = document.getElementById("announcement-date-time");
      if (dateInput) {
        setDateTimeInputAnnouncement(dateInput);
      }
    }
    setTimeout(() => {
      modalAnnouncement.classList.add("active");
      document.body.classList.add("no-scroll");
    }, 100);
  }
}

function closeAnnouncementModal() {
  const modalAnnouncement = document.getElementById(
    "create-announcement-modal"
  );
  if (!modalAnnouncement) return;
  modalAnnouncement.classList.remove("active");
  document.body.classList.remove("no-scroll");
  const innerModal = modalAnnouncement.querySelector(".modal");
  if (innerModal) {
    const allInputs = innerModal.querySelectorAll("input, textarea");
    allInputs.forEach((input) => {
      const labelInput = document.querySelector(
        'label[for="' + input.id + '"]'
      );
      restoreDefaultAnnouncementValues(input, labelInput);
    });
  }

  const applyButton = document.getElementById("apply-announcement-button");
  const updateButton = document.getElementById("update-announcement-button");
  if (applyButton) {
    applyButton.classList.add("disabled");
  }
  if (updateButton) {
    updateButton.classList.add("disabled");
  }
}

function restoreDefaultAnnouncementValues(inputElement, labelElement) {
  if (!inputElement || !labelElement) return;
  // Clear warning span
  const spanWarning = labelElement.querySelector("span");
  spanWarning.classList.remove("red", "green", "yellow");
  spanWarning.textContent = "";
  inputElement.classList.remove("valid", "modified");
  inputElement.value = inputElement.dataset.originalValue;
  if (inputElement.id !== "announcement-date-time") {
    let required = true;
    if (inputElement.id === "place-2") {
      required = false;
    }
    validateInput(
      inputElement,
      labelElement,
      1,
      inputElement.maxLength - 10,
      required,
      null
    );
  } else {
    validateDateInput(inputElement);
  }
}

function setDateTimeInputAnnouncement(inputElement, existingDate = null) {
  flatpickr(inputElement, {
    locale: "gr",
    enableTime: true,
    time_24hr: true,
    dateFormat: "d/m/Y H:i",
    minDate: new Date(), // tomorrow
    defaultDate: existingDate ? new Date(existingDate) : null,
    allowInput: true,
  });

  validateDateInput(inputElement);
}

function renderPresentationButton() {
  const buttonContainer = document.getElementById(
    "dynamic-button-presentation"
  );
  if (!buttonContainer) return;

  const newButton = document.createElement("button");
  newButton.className = "standard-button";
  newButton.id = "presentation-button";
  newButton.textContent = "Παρουσίαση";
  buttonContainer.replaceWith(newButton);

  const assignmentHeader = document.querySelector(".assignment-header");
  if (assignmentHeader) {
    assignmentHeader.insertAdjacentElement(
      "afterend",
      renderAnnouncementModal()
    );
    announcementModalListeners();
  }

  newButton.addEventListener("click", (e) => {
    e.preventDefault();
    openAnnouncementModal();
  });
}

function renderAnnouncementModal() {
  const container = document.createElement("div");
  container.classList.add("modal-container");
  container.id = "create-announcement-modal";
  container.dataset.existAnnouncement = "false";

  // Modal wrapper
  const modal = document.createElement("div");
  modal.classList.add("modal", "small");

  // ----- Header -----
  const header = document.createElement("div");
  header.classList.add("modal-header");

  const title = document.createElement("div");
  title.classList.add("modal-title");

  const p = document.createElement("p");
  p.textContent = "Παρουσίασή Διπλωματικής";

  const closeBtn = document.createElement("button");
  closeBtn.classList.add("close-modal");
  closeBtn.id = "close-announcement-modal";
  closeBtn.type = "button";
  closeBtn.innerHTML = "&times;";
  closeBtn.addEventListener("click", (e) => {
    e.preventDefault();
    closeAnnouncementModal();
  });

  title.append(p, closeBtn);
  header.appendChild(title);

  // ----- Body -----
  const body = document.createElement("div");
  body.classList.add("modal-body");

  // Date input
  const labelDate = document.createElement("label");
  labelDate.setAttribute("for", "announcement-date-time");
  labelDate.id = "label-announcement-date-time";
  labelDate.textContent = "Ημερομηνία και Ώρα ";

  const spanDate = document.createElement("span");
  spanDate.classList.add("warning-message");
  labelDate.appendChild(spanDate);

  const inputDate = document.createElement("input");
  inputDate.type = "text";
  inputDate.id = "announcement-date-time";
  inputDate.dataset.originalValue = "";
  inputDate.dataset.minDate = new Date();
  inputDate.placeholder = "πχ. 25/12/2023 14:30";

  // Content textarea
  const labelContent = document.createElement("label");
  labelContent.setAttribute("for", "content-announcement-input");
  labelContent.id = "label-content-announcement-input";
  labelContent.textContent = "Κείμενο ";
  const spanContent = document.createElement("span");
  spanContent.classList.add("warning-message");
  labelContent.appendChild(spanContent);

  const textarea = document.createElement("textarea");
  textarea.id = "content-announcement-input";
  textarea.rows = 4;
  textarea.maxLength = 310;
  textarea.dataset.originalValue = "";

  // Physical and online places
  const labelPlace1 = document.createElement("label");
  labelPlace1.setAttribute("for", "place-1");
  labelPlace1.id = "label-place-1";
  labelPlace1.textContent = "Αίθουσα ";
  const spanPlace1 = document.createElement("span");
  spanPlace1.classList.add("warning-message");
  labelPlace1.appendChild(spanPlace1);

  const inputPlace1 = document.createElement("input");
  inputPlace1.type = "text";
  inputPlace1.id = "place-1";
  inputPlace1.dataset.originalValue = "";
  inputPlace1.maxLength = 40;

  const labelPlace2 = document.createElement("label");
  labelPlace2.setAttribute("for", "place-2");
  labelPlace2.id = "label-place-2";
  labelPlace2.textContent = "Αίθουσα ";
  const spanPlace2 = document.createElement("span");
  spanPlace2.classList.add("warning-message");
  labelPlace2.appendChild(spanPlace2);

  const inputPlace2 = document.createElement("input");
  inputPlace2.type = "text";
  inputPlace2.id = "place-2";
  inputPlace2.dataset.originalValue = "";
  inputPlace2.maxLength = 90;

  body.append(
    labelDate,
    inputDate,
    labelContent,
    textarea,
    labelPlace1,
    inputPlace1,
    labelPlace2,
    inputPlace2
  );

  // ----- Footer -----
  const footer = document.createElement("div");
  footer.classList.add("modal-footer");

  const button = document.createElement("button");
  button.classList.add("accept-button", "disabled");
  button.type = "button";
  button.id = "apply-announcement-button";
  button.textContent = "Δημοσίευση";

  footer.appendChild(button);

  modal.append(header, body, footer);
  container.appendChild(modal);

  return container;
}

function announcementModalListeners() {
  const allInputs = document.querySelectorAll(
    "#create-announcement-modal input, #create-announcement-modal textarea"
  );

  allInputs.forEach((input) => {
    if (input.id !== "announcement-date-time") {
      const value = input.value.trim();
      const labelInput = document.querySelector(
        'label[for="' + input.id + '"]'
      );
      if (input.id !== "place-2") {
        validateInput(input, labelInput, 1, input.maxLength - 10, true, null);
      }
    } else {
      validateDateInput(input);
    }
  });

  allInputs.forEach((input) => {
    input.addEventListener("input", (e) => {
      e.preventDefault();
      if (input.id !== "announcement-date-time") {
        const value = input.value.trim();
        const labelInput = document.querySelector(
          'label[for="' + input.id + '"]'
        );

        let required = true;
        if (input.id === "place-2") {
          required = false;
        }

        if (value !== input.dataset.originalValue.trim()) {
          input.classList.add("modified");
          validateInput(
            input,
            labelInput,
            1,
            input.maxLength - 10,
            required,
            null
          );
        } else {
          clearSpanWarning(labelInput);
          input.classList.remove("modified", "valid");
        }
      } else {
        if (input.value.trim() !== input.dataset.originalValue.trim()) {
          input.classList.add("modified");
          validateDateInput(input);
        } else {
          clearSpanWarning(
            document.querySelector('label[for="' + input.id + '"]')
          );
          input.classList.remove("modified", "valid");
        }
      }
      checkAnnouncementValidity();
    });
  });

  const applyButton = document.getElementById("apply-announcement-button");
  const updateButton = document.getElementById("update-announcement-button");
  const dateInput = document.getElementById("announcement-date-time");
  const contentInput = document.getElementById("content-announcement-input");
  const place1Input = document.getElementById("place-1");
  const place2Input = document.getElementById("place-2");
  if (applyButton) {
    applyButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (applyButton.classList.contains("disabled")) {
        return;
      }

      const dateValue = dateInput.value.trim();
      const contentValue = contentInput.value.trim();
      const place1Value = place1Input.value.trim();
      const place2Value = place2Input.value.trim();
      if (place2Value.length === 0) {
        place2Input.value = null;
      }
      const announcement = createAnnouncementObject(
        dateValue,
        contentValue,
        place1Value,
        place2Value
      );
      uploadAnnouncement(announcement);
    });
  }

  if (updateButton) {
    updateButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (updateButton.classList.contains("disabled")) {
        return;
      }
      console.log("Update button clicked");
      const dateValue = dateInput.value.trim();
      const contentValue = contentInput.value.trim();
      const place1Value = place1Input.value.trim();
      const place2Value = place2Input.value.trim();
      updateAnnouncement(
        createAnnouncementObject(
          dateValue,
          contentValue,
          place1Value,
          place2Value
        )
      );
    });
  }
}

function checkAnnouncementValidity() {
  const allInputsRaw = document.querySelectorAll(
    "#create-announcement-modal input, #create-announcement-modal textarea"
  );
  const allInputs = Array.from(allInputsRaw).filter(
    (input) =>
      input.type !== "datetime-local" &&
      (input.id !== "place-2" || input.value.trim() !== "")
  );

  let allValid = false;

  const applyButton = document.getElementById("apply-announcement-button");
  const updateButton = document.getElementById("update-announcement-button");
  if (applyButton) {
    const modifiedInputs = document.querySelectorAll(".modified.valid");
    if (modifiedInputs.length === allInputs.length) {
      allValid = true;
    }
    if (allValid) {
      applyButton.classList.remove("disabled");
    } else {
      applyButton.classList.add("disabled");
    }
  } else if (updateButton) {
    const modifiedInputs = document.querySelectorAll(".modified");
    const validInputs = document.querySelectorAll(".valid");
    if (
      modifiedInputs.length === validInputs.length &&
      modifiedInputs.length > 0
    ) {
      allValid = true;
    }
    if (allValid) {
      updateButton.classList.remove("disabled");
    } else {
      updateButton.classList.add("disabled");
    }
  }
  return allValid;
}

function uploadAnnouncement(announcement) {
  uploadAnnouncementRequest(announcement).then((response) => {
    if (response && response.success) {
      const message = "Η παρουσίαση δημοσιεύτηκε επιτυχώς.";
      alertPopUP(message, "green");
      updateModalAnnouncement(response.announcement, "new");
    } else {
      const message = "Αποτυχία δημοσίευσης παρουσίασης.";
      alertPopUP(message, "red");
    }
  });
}

async function uploadAnnouncementRequest(announcement) {
  try {
    const response = await fetch(
      `/api/assignment/announcement/${encodeURIComponent(constID)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(announcement),
      }
    );
    return await response.json();
  } catch (e) {
    const message = "Αποτυχία δημοσίευσης παρουσίασης.";
    alertPopUP(message, "red");
  }
}

function toDateTimeLocal(isoString) {
  if (!isoString) {
    return "";
  }

  const date = new Date(isoString);
  if (isNaN(date.getTime())) {
    return "";
  }

  // Extract parts
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0"); // months are 0-based
  const year = date.getFullYear();

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  // Format: dd/mm/yyyy H:mm
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function updateModalAnnouncement(announcement, typeOfEvent) {
  const modal = document.getElementById("create-announcement-modal");
  if (!modal) return;
  const dateInput = document.getElementById("announcement-date-time");
  const labelDate = document.getElementById("label-announcement-date-time");
  const contentInput = document.getElementById("content-announcement-input");
  const labelContent = document.getElementById(
    "label-content-announcement-input"
  );
  const place1Input = document.getElementById("place-1");
  const labelPlace1 = document.getElementById("label-place-1");
  const place2Input = document.getElementById("place-2");
  const labelPlace2 = document.getElementById("label-place-2");
  const applyButton = document.getElementById("apply-announcement-button");

  if (dateInput) {
    console.log("Date Input found:", dateInput);
    setDateTimeInputAnnouncement(dateInput, announcement.dateTime);
    dateInput.value = toDateTimeLocal(announcement.dateTime);
    dateInput.dataset.originalValue = toDateTimeLocal(announcement.dateTime);
    dateInput.classList.remove("valid", "modified");
    clearSpanWarning(labelDate);
  }
  if (contentInput) {
    console.log("Content Input found:", contentInput);
    contentInput.value = announcement.content;
    contentInput.dataset.originalValue = announcement.content;
    contentInput.classList.remove("valid", "modified");
    clearSpanWarning(labelContent);
  }
  if (place1Input) {
    console.log("Place 1 Input found:", place1Input);
    place1Input.value = announcement.place1;
    place1Input.dataset.originalValue = announcement.place1;
    place1Input.classList.remove("valid", "modified");
    clearSpanWarning(labelPlace1);
  }
  if (place2Input) {
    console.log("Place 2 Input found:", place2Input);
    place2Input.value = announcement.place2;
    place2Input.dataset.originalValue = announcement.place2;
    place2Input.classList.remove("valid", "modified");
    clearSpanWarning(labelPlace2);
  }
  if (typeOfEvent === "new" && applyButton) {
    const updateButton = document.createElement("button");
    updateButton.classList.add("accept-button", "disabled");
    updateButton.type = "button";
    updateButton.id = "update-announcement-button";
    updateButton.textContent = "Ενημέρωση";
    applyButton.replaceWith(updateButton);
    updateButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (updateButton.classList.contains("disabled")) {
        return;
      }
      const dateValue = dateInput.value.trim();
      const contentValue = contentInput.value.trim();
      const place1Value = place1Input.value.trim();
      const place2Value = place2Input.value.trim();
      updateAnnouncement(
        createAnnouncementObject(
          dateValue,
          contentValue,
          place1Value,
          place2Value
        )
      );
    });
  } else if (typeOfEvent === "update") {
    const updateButton = document.getElementById("update-announcement-button");
    if (updateButton) {
      updateButton.classList.add("disabled");
    }
  }
}

function updateAnnouncement(announcement) {
  try {
    updateAnnouncementRequest(announcement).then((response) => {
      if (response && response.success) {
        const message = "Η παρουσίαση ενημερώθηκε επιτυχώς.";
        updateModalAnnouncement(announcement, "update");
        alertPopUP(message, "green");
      }
    });
  } catch (error) {
    const message = "Αποτυχία ενημέρωσης παρουσίασης.";
    alertPopUP(message, "red");
  }
}

async function updateAnnouncementRequest(announcement) {
  try {
    const response = await fetch(
      `/api/assignment/announcement/${encodeURIComponent(constID)}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(announcement),
      }
    );
    return await response.json();
  } catch (error) {
    const message = "Αποτυχία ενημέρωσης παρουσίασης.";
    alertPopUP(message, "red");
  }
}

function createAnnouncementObject(dateTime, content, place1, place2) {
  return {
    dateTime: parseToISO(dateTime),
    content: content,
    place1: place1,
    place2: place2,
  };
}

document.addEventListener("DOMContentLoaded", () => {
  // Initialize global assignment variables
  const assignmentContainer = document.querySelector(
    ".assignment-detail-container"
  );
  constID = assignmentContainer.dataset.thesisId;
  constUserRole = assignmentContainer.dataset.userRole;

  // Main tab navigation
  document.querySelectorAll(".tab-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const tabId = link.getAttribute("data-tab");
      if (location.hash !== "#" + tabId)
        history.replaceState(null, "", "#" + tabId);
      activateTab(tabId);
    });
  });

  // Listen for changes in the URL hash
  window.addEventListener("hashchange", () => {
    const h = (location.hash || "").slice(1);
    activateTab(h);
  });

  // On page load, check the current hash in the URL
  const initial = (location.hash || "").slice(1);
  // Default hash/tab
  activateTab(initial || "info");

  // Grade container to load existing grades
  const evaluationTable = document.querySelector(".evaluation-table");
  if (evaluationTable) {
    gradesTableListeners();
  }

  // Mobile navigation for grades
  mobileGradeNavigation();

  //Protocol container to load existing protocol
  const protocolContainer = document.querySelector(".protocol-container");
  if (protocolContainer) {
    const existProtocol = protocolContainer.dataset.loadProtocol;
    if (existProtocol === "false" && constUserRole === "supervisor") {
      editableProtocolListeners();
    }
  }

  // Temporary cancel assignment from professor
  const tmpCancelButton = document.getElementById(
    "cancel-tmp-assignment-button"
  );
  if (tmpCancelButton) {
    tmpCancelButton.addEventListener("click", (e) => {
      e.preventDefault();
      const confirmed = confirm(
        "Επιβεβαίωση ακύρωσης προσωρινής ανάθεσης. Η ενέργεια αυτή δεν μπορεί να αναιρεθεί."
      );
      if (confirmed) {
        cancelTemporaryAssignment(constID);
      }
    });
  }

  // Invite professor button listener
  const inviteButton = document.getElementById("invite-professor-button");
  if (inviteButton) {
    // Open invite modal listener
    inviteButton.addEventListener("click", (e) => {
      e.preventDefault();
      const modalContainer = document.getElementById("invite-professor-modal");
      openInviteModal(modalContainer, constID);
    });

    // Close invite modal listener
    document
      .getElementById("close-invite-modal-button")
      .addEventListener("click", (e) => {
        e.preventDefault();
        const modalContainer = document.getElementById(
          "invite-professor-modal"
        );
        closeInviteModal(modalContainer);
      });

    // Close modal on ESC key press
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const modalContainer = document.getElementById(
          "invite-professor-modal"
        );
        if (modalContainer.classList.contains("active")) {
          closeInviteModal(modalContainer);
        }
      }
    });
    // Apply invitations button listener
    document
      .getElementById("apply-invitation-button")
      .addEventListener("click", (e) => {
        e.preventDefault();
        const modalContainer = document.getElementById(
          "invite-professor-modal"
        );
        sendInvitations(modalContainer, constID);
      });

    // Search professors input listener
    const searchInput = document.getElementById("professor-search");
    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "true";
      const runProfessorSearch = () => {
        professorSearch(searchInput.value.trim(), constID);
      };
      searchInput.addEventListener("input", debounce(runProfessorSearch, 300));
    }
  }
  // Assignment status change modal listeners
  const modalContainer = document.getElementById("change-status-modal");
  if (modalContainer) {
    const officialAssignButton = document.getElementById(
      "official-assignment-button"
    );
    const officialCancelButton = document.getElementById(
      "official-cancel-button"
    );

    // Open modal for official assignment or cancellation
    if (officialAssignButton) {
      officialAssignButton.addEventListener("click", (e) => {
        e.preventDefault();
        openAssignmentStatusModal("official_assignment");
      });
    }
    if (
      officialCancelButton &&
      !officialCancelButton.classList.contains("disabled")
    ) {
      officialCancelButton.addEventListener("click", (e) => {
        e.preventDefault();
        openAssignmentStatusModal("official_cancellation");
      });
    }

    // Close modal listener
    const closeModalBtn = modalContainer.querySelector(".close-modal");
    if (closeModalBtn) {
      closeModalBtn.addEventListener("click", (e) => {
        e.preventDefault();
        closeAssignmentStatusModal();
      });
    }

    // Input listeners for status modal
    const inputFieldNumProtocol = modalContainer.querySelector(
      "#num-protocol-input"
    );
    const labelFieldNumProtocol = modalContainer.querySelector(
      "#label-num-protocol-input"
    );
    if (inputFieldNumProtocol) {
      inputFieldNumProtocol.addEventListener("input", (e) => {
        e.preventDefault();
        checkStatusModalValidation(
          inputFieldNumProtocol,
          labelFieldNumProtocol,
          20
        );
      });
    }

    const inputFieldDetailedCancel = modalContainer.querySelector(
      "#cancel-details-protocol"
    );
    const labelFieldDetailedCancel = modalContainer.querySelector(
      "#label-cancel-details-protocol"
    );
    if (inputFieldDetailedCancel) {
      inputFieldDetailedCancel.addEventListener("input", (e) => {
        e.preventDefault();
        const value = inputFieldDetailedCancel.value.trim();
        checkStatusModalValidation(
          inputFieldDetailedCancel,
          labelFieldDetailedCancel,
          150
        );
      });
    }

    const setActiveNumber = modalContainer.querySelector(
      "#apply-official-assignment-button"
    );
    if (setActiveNumber) {
      setActiveNumber.addEventListener("click", (e) => {
        e.preventDefault();
        if (setActiveNumber.classList.contains("disabled")) {
          return;
        }
        if (inputFieldNumProtocol.classList.contains("valid")) {
          changeAssignmentStatus(inputFieldNumProtocol.value.trim(), null);
          closeAssignmentStatusModal();
        }
      });
    }

    const officialCancelButtonModal = modalContainer.querySelector(
      "#apply-cancel-assignment-button"
    );

    if (officialCancelButtonModal) {
      officialCancelButtonModal.addEventListener("click", (e) => {
        e.preventDefault();
        if (officialCancelButtonModal.classList.contains("disabled")) {
          return;
        }

        if (inputFieldNumProtocol.classList.contains("valid")) {
          if (inputFieldDetailedCancel) {
            if (inputFieldDetailedCancel.classList.contains("valid")) {
              changeAssignmentStatus(
                inputFieldNumProtocol.value.trim(),
                inputFieldDetailedCancel.value.trim()
              );
              closeAssignmentStatusModal();
            }
          } else {
            const protocolDetails = "Από Διδάσκοντα.";
            changeAssignmentStatus(
              inputFieldNumProtocol.value.trim(),
              protocolDetails
            );
            closeAssignmentStatusModal();
          }
        }
      });
    }
  }

  // Official completion assignment button listener
  const completeButton = document.getElementById("complete-assignment-button");
  if (completeButton) {
    completeButton.addEventListener("click", (e) => {
      e.preventDefault();
      const confirmed = confirm(
        "Επιβεβαίωση ολοκλήρωσης ανάθεσης. Η ενέργεια αυτή δεν μπορεί να αναιρεθεί."
      );
      if (confirmed) {
        completeAssignment();
      }
    });
  }

  // ---------------- Notes listeners -------------------
  // 1. New note listeners
  const newNoteButton = document.getElementById("new-note-button");
  if (newNoteButton) {
    newNoteButton.addEventListener("click", (e) => {
      e.preventDefault();
      showNewNote();
    });
  }

  // 2. Cancel and submit new note listeners
  const cancelNewNoteButton = document.getElementById("cancel-new-note-button");
  if (cancelNewNoteButton) {
    cancelNewNoteButton.addEventListener("click", (e) => {
      e.preventDefault();
      cancelNewNote();
    });
  }

  // 3. Submit new note listener
  const submitNewNoteButton = document.getElementById("submit-new-note-button");
  if (submitNewNoteButton) {
    submitNewNoteButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (submitNewNoteButton.classList.contains("disabled")) {
        return;
      }
      const noteTitle = document.getElementById("new-note-title")?.value.trim();
      const noteContent = document
        .getElementById("new-note-content")
        ?.value.trim();
      if (noteTitle && noteContent) {
        submitNewNote(noteTitle, noteContent);
      }
    });
  }
  // 4. Note input listeners
  const inputNoteTitle = document.getElementById("new-note-title");
  const labelNoteTitle = document.getElementById("label-new-note-title");
  if (inputNoteTitle) {
    inputNoteTitle.addEventListener("input", (e) => {
      e.preventDefault();
      const value = inputNoteTitle.value.trim();
      checkNoteValidity(inputNoteTitle, value, labelNoteTitle, 50);
    });
  }

  const newNoteContent = document.getElementById("new-note-content");
  const labelNoteContent = document.getElementById("label-new-note-content");
  if (newNoteContent) {
    newNoteContent.addEventListener("input", (e) => {
      e.preventDefault();
      const value = newNoteContent.value.trim();
      checkNoteValidity(newNoteContent, value, labelNoteContent, 300);
    });
  }

  // 5. Close notes modal listener
  const closeNotesModalButton = document.getElementById(
    "close-note-modal-button"
  );
  if (closeNotesModalButton) {
    closeNotesModalButton.addEventListener("click", (e) => {
      closeModalNote();
    });
  }

  // Change status to review button listener
  const statusToReviewButton = document.getElementById("change-to-review");
  if (statusToReviewButton)
    statusToReviewButton.addEventListener("click", (e) => {
      e.preventDefault();
      const confirmed = confirm(
        'Επιβεβαίωση αλλαγής κατάστασης ανάθεσης σε "Υπό Αξιολόγηση". Η ενέργεια αυτή δεν μπορεί να αναιρεθεί.'
      );
      if (confirmed) {
        statusToReview();
      }
    });

  // ---------------- Student upload temporary data listeners -------------------
  // 1. Init link addition

  // 2. Temporary report file input listener
  const inputTmpReport = document.getElementById("temporary-report-file");
  if (inputTmpReport) {
    inputTmpReport.addEventListener("change", (e) => {
      e.preventDefault();
      changeInputFileState(inputTmpReport, null);
    });
  }

  // 3. Check role and init link addition & upload button listener
  if (constUserRole === "student") {
    const divLinks = document.querySelector(".student-add-links");
    if (divLinks && !divLinks.dataset.linksInit) {
      initLinkAddition();
    }
  }
  const studentUploadTmpButton = document.getElementById(
    "student-upload-button"
  );
  if (studentUploadTmpButton) {
    studentUploadTmpButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (studentUploadTmpButton.classList.contains("disabled")) {
        return;
      }
      if (checkCurrentUploadState()) {
        studentUpload(studentUploadTmpButton);
      }
    });
  }

  // ---------------- Announcement listeners -------------------
  // 1. Open/close announcement modal listeners
  const presentationButton = document.getElementById("presentation-button");
  if (presentationButton) {
    announcementModalListeners();
    presentationButton.addEventListener("click", (e) => {
      e.preventDefault();
      openAnnouncementModal();
    });
  }

  const closeAnnouncementModalButton = document.getElementById(
    "close-announcement-modal"
  );
  if (closeAnnouncementModalButton) {
    closeAnnouncementModalButton.addEventListener("click", (e) => {
      e.preventDefault();
      closeAnnouncementModal();
    });
  }

  // Nemertes link input listeners
  const nemertesInput = document.getElementById("nemertes-link-input");
  if (nemertesInput) {
    const labelInput = nemertesInput.parentElement;
    validateInput(nemertesInput, labelInput, 1, 200, true);
    nemertesInput.addEventListener("input", (e) => {
      e.preventDefault();
      checkNemertesForm(nemertesInput);
    });
  }

  // Nemertes link upload button listener
  const nemertesButton = document.getElementById("nemertes-upload-button");
  if (nemertesButton) {
    nemertesButton.addEventListener("click", (e) => {
      e.preventDefault();
      if (nemertesButton.classList.contains("disabled")) {
        return;
      }
      if (checkNemertesForm(nemertesInput)) {
        const link = ensureScheme(nemertesInput.value.trim());
        uploadNemertesLink(link);
      }
    });
  }
});

//

// async function loadMeetings() {
//     if (meetingsLoaded) return;
//     // Mark as loading early to prevent concurrent duplicate fetches
//     meetingsLoaded = true;
//     const list = document.getElementById('meetings-list');
//     if (!list) return; // tab not present
//     list.setAttribute('data-loaded', 'loading');
//     const emptyEl = document.getElementById('meetings-empty');
//     try {
//         const res = await fetch(`/api/assignment/meetings/${constID}`);
//         if (!res.ok) throw new Error('Network');
//         const data = await res.json();
//         if (!data.success) throw new Error(data.error || 'API');
//         const meetings = data.meetings || [];
//         if (meetings.length === 0) {
//             if (emptyEl) emptyEl.style.display = 'block';
//             list.setAttribute('data-loaded', 'true');
//             return;
//         }
//         if (emptyEl) emptyEl.remove();
//         meetings.forEach(m => {
//             const li = document.createElement('li');
//             li.className = 'info-member meeting-item';
//             li.dataset.meetingId = m.id;
//             const dateP = document.createElement('p');
//             dateP.textContent = formatDate(m.dateTime);
//             li.appendChild(dateP);
//
//             if (m.status === 'scheduled') {
//                 const statusDiv = document.createElement('div');
//                 statusDiv.className = 'meeting-status';
//                 const badge = document.createElement('p');
//                 badge.className = 'info-badge pending';
//                 badge.textContent = 'Προγραμματισμένη';
//                 statusDiv.appendChild(badge);
//                 const cancelBtn = document.createElement('button');
//                 cancelBtn.className = 'cancel-meeting-button';
//                 cancelBtn.title = 'Ακύρωση συνάντησης';
//                 const span = document.createElement('span');
//                 span.textContent = '×';
//                 cancelBtn.appendChild(span);
//                 statusDiv.appendChild(cancelBtn);
//                 li.appendChild(statusDiv);
//             } else if (m.status === 'cancelled') {
//                 const badge = document.createElement('p');
//                 badge.className = 'info-badge cancelled';
//                 badge.textContent = 'Ακυρωμένη';
//                 li.appendChild(badge);
//             } else if (m.status === 'completed') {
//                 const badge = document.createElement('p');
//                 badge.className = 'info-badge completed';
//                 badge.textContent = 'Ολοκληρωμένη';
//                 li.appendChild(badge);
//             } else { // fallback unknown
//                 const badge = document.createElement('p');
//                 badge.className = 'info-badge';
//                 badge.textContent = m.status || '-';
//                 li.appendChild(badge);
//             }
//             list.appendChild(li);
//         });
//         list.setAttribute('data-loaded', 'true');
//     } catch (e) {
//         console.error('Failed loading meetings', e);
//         // Allow retry on failure
//         meetingsLoaded = false;
//         if (emptyEl) {
//             emptyEl.textContent = 'Πρόβλημα φόρτωσης';
//             emptyEl.classList.add('error');
//             emptyEl.style.display = 'block';
//         } else {
//             const errLi = document.createElement('li');
//             errLi.className = 'no-data error';
//             errLi.textContent = 'Πρόβλημα φόρτωσης';
//             list.appendChild(errLi);
//         }
//         list.setAttribute('data-loaded', 'error');
//     }
// }

// function showNewMeeting() {
//     const newMeetingItem = document.querySelector('.new-meeting-container');
//     const noData = document.getElementById('meetings-empty');
//     const datePickerMeeting = document.getElementById("new-meeting-date-time");
//     //connect with users events to prevent overlap
//     if (datePickerMeeting) {
//         const now = new Date();
//         const pad = n => String(n).padStart(2, '0');
//         const yyyy = now.getFullYear();
//         const mm = pad(now.getMonth() + 1);
//         const dd = pad(now.getDate());
//         const hh = pad(now.getHours());
//         const min = pad(now.getMinutes());
//         const dateTimeStr = `${yyyy}-${mm}-${dd}T${hh}:${min}`; // full datetime-local value
//         datePickerMeeting.value = dateTimeStr; // set default to current local time
//
//         datePickerMeeting.setAttribute('min', `${yyyy}-${mm}-${dd}T00:00`);
//     }
//     if (newMeetingItem) {
//         newMeetingItem.style.display = 'block';
//         newMeetingItem.scrollIntoView({behavior: 'smooth', block: 'center'});
//         if (noData) noData.style.display = 'none';
//     }
//
// }

// function cancelNewMeeting() {
//     const newMeetingItem = document.querySelector('.new-meeting-container');
//     if (!newMeetingItem) return;
//     newMeetingItem.style.display = 'none';
//     newMeetingItem.querySelectorAll('input[type="datetime-local"]').forEach(el => el.value = '');
//     const meetingList = document.getElementById('meetings-list');
//     if (meetingList && meetingList.querySelectorAll('li.meeting-item').length === 0) {
//         const noData = document.getElementById('meetings-empty');
//         if (noData) noData.style.display = 'block';
//     }
// }
