import {
  alertPopUP,
  formatDate,
  formatStatus,
  toggleExpandCollapseView,
} from "./utils.js";

const filtersIcon = document.querySelector(".filters-icon");
const filtersContainer = document.getElementById(
  "invitations-filters-container"
);
const closeBtn = document.getElementById("close-mobile-filters");
let filterFetchController = null;

let jsonFilters = {
  status: {},
};

// 1. Toggle expand/collapse and handle accept/reject buttons
function toggleFunction(invitationItems) {
  invitationItems.forEach(function (invItem) {
    const collapsedContent = invItem.querySelector(
      ".invitation-item-collapsed"
    );
    const expandedContent = invItem.querySelector(".invitation-item-expanded");
    const expandButton = invItem.querySelector(".expand-button");
    const collapseButton = invItem.querySelector(".collapse-button");

    const pendingButtons = invItem.querySelector(".pending-buttons");
    if (pendingButtons) {
      const acceptButton = pendingButtons.querySelector(".accept-button");
      const cancelButton = pendingButtons.querySelector(".cancel-button");
      const invitationId = acceptButton.getAttribute("data-id");

      if (acceptButton) {
        acceptButton.addEventListener("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          replyToInvitation(invitationId, "accepted");
        });
      }
      if (cancelButton) {
        cancelButton.addEventListener("click", async function (e) {
          e.preventDefault();
          e.stopPropagation();
          const invitationId = this.getAttribute("data-id");
          replyToInvitation(invitationId, "rejected");
        });
      }
    }

    toggleExpandCollapseView(
      collapsedContent,
      collapseButton,
      expandedContent,
      expandButton
    );
  });
}

// 2. Reply to invitation (accept/reject)
function replyToInvitation(invitationId, action) {
  replyToInvitationRequest(invitationId, action).then((response) => {
    if (response && response.success) {
      const invitationItem = document
        .querySelector(`.accept-button[data-id='${invitationId}']`)
        ?.closest(".invitation-item");

      if (
        jsonFilters.status[action] ||
        Object.keys(jsonFilters.status).length === 0
      ) {
        const completedDiv = document.getElementById("completed-invitations");

        if (invitationItem) {
          invitationItem.remove();
        }

        const invitationLiItem = document.createElement("li");
        invitationLiItem.classList.add("invitation-item");
        const collapsedDiv = renderCollapsedInvitation(response.invitation);
        const expandedDiv = renderExpandedInvitation(response.invitation);
        const collapseButton = expandedDiv.querySelector(".collapse-button");
        const expandButton = collapsedDiv.querySelector(".expand-button");
        toggleExpandCollapseView(
          collapsedDiv,
          collapseButton,
          expandedDiv,
          expandButton
        );

        invitationLiItem.appendChild(collapsedDiv);
        invitationLiItem.appendChild(expandedDiv);

        if (completedDiv) {
          completedDiv.insertBefore(invitationLiItem, completedDiv.firstChild);
        } else {
          const completedDiv = document.createElement("div");
          completedDiv.id = "completed-invitations";
          completedDiv.appendChild(invitationLiItem);
          const invitationsList = document.getElementById("invitations-list");
          invitationsList.appendChild(completedDiv);
        }
      } else {
        const pendingDiv = document.getElementById("pending-invitations");

        if (invitationItem) {
          invitationItem.remove();
        }
        if (pendingDiv && pendingDiv.children.length === 0) {
          pendingDiv.remove();
        }
      }

      const invitationsList = document.getElementById("invitations-list");
      const completedDiv = invitationsList.querySelector(
        "#completed-invitations"
      );
      const pendingDiv = invitationsList.querySelector("#pending-invitations");

      if (!pendingDiv && !completedDiv) {
        const noDataP = document.createElement("p");
        noDataP.classList.add("no-data");
        noDataP.textContent =
          "Δε βρέθηκαν προσκλήσεις με τα επιλεγμένα φίλτρα.";
        invitationsList.innerHTML = "";
        invitationsList.appendChild(noDataP);
      }

      const message = "Η πρόσκληση απαντήθηκε επιτυχώς.";
      alertPopUP(message, "green");
    } else {
      const message =
        "Σφάλμα κατά την απάντηση στην πρόσκληση. Προσπαθήστε ξανά.";
      alertPopUP(message, "red");
    }
  });
}

async function replyToInvitationRequest(invitationId, action) {
  try {
    const response = await fetch(`/api/invitations/reply/${invitationId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: action }),
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (err) {
    const message =
      "Σφάλμα κατά την αποστολή της απάντησης στην πρόσκληση. Προσπαθήστε ξανά.";
    alertPopUP(message, "red");
  }
}

// 3. Fetch invitations based on filters
async function fetchFilteredInvitations(filters, signal) {
  try {
    const response = await fetch("/api/invitations/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      signal: signal,
    });
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    return await response.json();
  } catch (err) {
    if (err.name !== "AbortError") {
      throw err;
    }
  }
}

// 4. Render invitation items
function renderCollapsedInvitation(invitation) {
  // Crete DIV collapsed view
  const collapsedDiv = document.createElement("div");
  collapsedDiv.classList.add("invitation-item-collapsed");

  // Create div for header
  const invitationHeaderDiv = document.createElement("div");
  invitationHeaderDiv.classList.add("invitation-header");

  // Add title and status badge
  const title = document.createElement("h3");
  title.classList.add("invitation-thesis-title");
  title.textContent = invitation.thesis.title;
  collapsedDiv.appendChild(title);

  // Div group
  const badgesGroup = document.createElement("div");
  badgesGroup.classList.add("badges-group");

  // Date badge
  const dateBadge = document.createElement("p");
  dateBadge.classList.add("simple-badge");
  dateBadge.textContent = formatDate(invitation.createdAt);
  badgesGroup.appendChild(dateBadge);

  // Status badge
  const statusBadge = document.createElement("p");
  statusBadge.classList.add("status-badge", invitation.status);
  statusBadge.textContent = formatStatus(invitation.status);

  badgesGroup.appendChild(dateBadge);
  badgesGroup.appendChild(statusBadge);

  invitationHeaderDiv.appendChild(title);
  invitationHeaderDiv.appendChild(badgesGroup);

  collapsedDiv.appendChild(invitationHeaderDiv);

  // Expand Button
  const expandButton = document.createElement("small");
  expandButton.classList.add("expand-button");
  expandButton.textContent = "Κλικ για ανάπτυξη";

  collapsedDiv.appendChild(expandButton);

  return collapsedDiv;
}

function renderExpandedInvitation(invitation) {
  // Div expanded
  const expandedDiv = document.createElement("div");
  expandedDiv.classList.add("invitation-item-expanded", "hidden");

  // Group 1 - Title
  const group1 = document.createElement("div");
  group1.classList.add("content-group");

  const groupTitleBadges = document.createElement("div");
  groupTitleBadges.classList.add("group-title-badges");

  const groupHeader1 = document.createElement("p");
  groupHeader1.classList.add("group-header");
  groupHeader1.textContent = "Τίτλος";
  groupTitleBadges.appendChild(groupHeader1);

  // Badges group
  const badgesGroup = document.createElement("div");
  badgesGroup.classList.add("badges-group", "expanded");

  // Date badge
  const dateBadge = document.createElement("p");
  dateBadge.classList.add("simple-badge");
  dateBadge.textContent = formatDate(invitation.createdAt);
  badgesGroup.appendChild(dateBadge);

  // Status badge
  const statusBadge = document.createElement("p");
  statusBadge.classList.add("status-badge", invitation.status);
  statusBadge.textContent = formatStatus(invitation.status);
  badgesGroup.appendChild(statusBadge);
  groupTitleBadges.appendChild(badgesGroup);
  group1.appendChild(groupTitleBadges);

  const groupValue1 = document.createElement("p");
  groupValue1.classList.add("group-value");
  groupValue1.textContent = invitation.thesis.title;
  group1.appendChild(groupValue1);
  expandedDiv.appendChild(group1);

  // Group 2 - Description
  const group2 = document.createElement("div");
  group2.classList.add("content-group");

  const groupHeader2 = document.createElement("p");
  groupHeader2.classList.add("group-header");
  groupHeader2.textContent = "Περιγραφή";
  group2.appendChild(groupHeader2);

  const groupValue2 = document.createElement("p");
  groupValue2.classList.add("group-value");
  groupValue2.textContent = invitation.thesis.description;
  group2.appendChild(groupValue2);
  expandedDiv.appendChild(group2);

  // Group 3 - File Optional
  if (invitation.thesis.filePath) {
    const reqFileName = invitation.thesis.filePath.split("/").pop();
    const reqFileExt =
      reqFileName && reqFileName.includes(".")
        ? reqFileName.split(".").pop().toUpperCase()
        : "";

    const group3 = document.createElement("div");
    group3.classList.add("content-group");

    const groupHeader3 = document.createElement("p");
    groupHeader3.classList.add("group-header");
    groupHeader3.textContent = "Συνημμένο";
    group3.appendChild(groupHeader3);

    const groupValue3 = document.createElement("p");
    groupValue3.classList.add("group-value");
    const fileLink = document.createElement("a");
    fileLink.href = invitation.thesis.filePath;
    fileLink.classList.add("attachment-link");
    fileLink.target = "_blank";
    fileLink.title = reqFileName;

    const spanIcon = document.createElement("span");
    spanIcon.classList.add("attachment-icon");
    spanIcon.textContent = "📄";
    fileLink.appendChild(spanIcon);

    const spanNameContent = document.createElement("span");
    spanNameContent.classList.add("name-content");
    spanNameContent.textContent = reqFileName;
    fileLink.appendChild(spanNameContent);

    const spanExt = document.createElement("span");
    spanExt.classList.add("attachment-type");
    spanExt.textContent = reqFileExt;
    fileLink.appendChild(spanExt);

    groupValue3.appendChild(fileLink);
    group3.appendChild(groupValue3);

    expandedDiv.appendChild(group3);
  }

  // Group 4 - Professor
  const group4 = document.createElement("div");
  group4.classList.add("content-group");

  const groupHeader4 = document.createElement("p");
  groupHeader4.classList.add("group-header");
  groupHeader4.textContent = "Επιβλέπων";
  group4.appendChild(groupHeader4);

  const groupValue4 = document.createElement("p");
  groupValue4.classList.add("group-value");
  groupValue4.textContent = invitation.thesis.supervisorFullName;
  group4.appendChild(groupValue4);
  expandedDiv.appendChild(group4);

  // Group 5 - Student
  const group5 = document.createElement("div");
  group5.classList.add("content-group");

  const groupHeader5 = document.createElement("p");
  groupHeader5.classList.add("group-header");
  groupHeader5.textContent = "Φοιτητής";
  group5.appendChild(groupHeader5);

  const groupValue5 = document.createElement("p");
  groupValue5.classList.add("group-value");
  groupValue5.textContent = `${invitation.thesis.studentFullName}, ${invitation.thesis.studentIdNumber}`;
  group5.appendChild(groupValue5);
  expandedDiv.appendChild(group5);

  // Group 6 - Group Buttons - Pending Only
  if (invitation.status === "pending") {
    const pendingButtons = document.createElement("div");
    pendingButtons.classList.add("pending-buttons");

    const cancelButton = document.createElement("button");
    cancelButton.classList.add("cancel-button");
    cancelButton.setAttribute("data-id", invitation._id);
    cancelButton.textContent = "Απόρριψη";
    pendingButtons.appendChild(cancelButton);

    const acceptButton = document.createElement("button");
    acceptButton.classList.add("accept-button");
    acceptButton.setAttribute("data-id", invitation._id);
    acceptButton.textContent = "Αποδοχή";
    pendingButtons.appendChild(acceptButton);
    expandedDiv.appendChild(pendingButtons);
  }

  // Expand Button
  const collapseButton = document.createElement("small");
  collapseButton.classList.add("collapse-button");
  collapseButton.textContent = "Κλικ για ανάπτυξη";

  expandedDiv.appendChild(collapseButton);

  return expandedDiv;
}

// 5. Apply and Clear Filters
function applyFilters() {
  if (filterFetchController) filterFetchController.abort();
  filterFetchController = new AbortController();
  fetchFilteredInvitations(jsonFilters, filterFetchController.signal).then(
    (response) => {
      const invitationsList = document.getElementById("invitations-list");
      let existPending = false;
      let existCompleted = false;
      invitationsList.innerHTML = "";
      if (response && response.success) {
        if (response.pendingList && response.pendingList.length > 0) {
          existPending = true;
          const pendingDiv = document.createElement("div");
          pendingDiv.id = "pending-invitations";
          response.pendingList.forEach((invitation) => {
            const invitationLiItem = document.createElement("li");
            invitationLiItem.classList.add("invitation-item");
            invitationLiItem.appendChild(renderCollapsedInvitation(invitation));
            invitationLiItem.appendChild(renderExpandedInvitation(invitation));
            pendingDiv.appendChild(invitationLiItem);
          });
          invitationsList.appendChild(pendingDiv);
        }
        if (response.completedList && response.completedList.length > 0) {
          existCompleted = true;
          const completedDiv = document.createElement("div");
          completedDiv.id = "completed-invitations";

          response.completedList.forEach((invitation) => {
            const invitationLiItem = document.createElement("li");
            invitationLiItem.classList.add("invitation-item");
            invitationLiItem.appendChild(renderCollapsedInvitation(invitation));
            invitationLiItem.appendChild(renderExpandedInvitation(invitation));
            completedDiv.appendChild(invitationLiItem);
          });
          invitationsList.appendChild(completedDiv);
        }

        if (!existPending && !existCompleted) {
          const noDataP = document.createElement("p");
          noDataP.classList.add("no-data");
          noDataP.textContent =
            "Δε βρέθηκαν προσκλήσεις με τα επιλεγμένα φίλτρα.";
          invitationsList.appendChild(noDataP);
        } else {
          const invitationItems = document.querySelectorAll(".invitation-item");
          toggleFunction(invitationItems);
        }
      } else {
        const noDataP = document.createElement("p");
        noDataP.classList.add("no-data", "error");
        noDataP.textContent =
          "Σφάλμα κατά την φόρτωση των προσκλήσεων. Προσπαθήστε ξανά.";
        invitationsList.appendChild(noDataP);
      }
    }
  );
}

function clearFilters() {
  const filtersInputs = document.querySelectorAll("input");
  filtersInputs.forEach((input) => {
    if (input.type === "checkbox") {
      input.checked = false;
    }
  });

  // Reset global filter state
  jsonFilters = {
    status: {},
  };

  // Directly call applyFilters to update UI
  applyFilters();
}

// 6. Mobile Floating Filters
function updateMobileFloating() {
  if (window.innerWidth <= 1350) {
    filtersContainer.classList.add("mobile-floating");
    filtersContainer.classList.remove("show"); // Hide by default on resize
  } else {
    filtersContainer.classList.remove("mobile-floating");
    filtersContainer.classList.remove("show");
  }
}

function closeMobileFilters() {
  if (filtersContainer) {
    filtersContainer.classList.remove("show");
    filtersContainer.style.top = "";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  updateMobileFloating();

  const invitationItems = document.querySelectorAll(".invitation-item");
  if (invitationItems) {
    toggleFunction(invitationItems);
  }

  const filtersInputs = document.querySelectorAll("input");

  filtersInputs.forEach((input) => {
    input.addEventListener("change", () => {
      if (input.name === "status") {
        if (input.checked) {
          jsonFilters.status = { ...jsonFilters.status, [input.id]: true };
        } else {
          delete jsonFilters.status[input.id];
        }
      }
      applyFilters();
    });
  });

  const clearFiltersBtn = document.getElementById("clear-filters-button");
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", function (e) {
      e.preventDefault();
      clearFilters();
    });
  }

  if (filtersIcon && filtersContainer) {
    filtersIcon.addEventListener("click", function () {
      if (filtersContainer.classList.contains("mobile-floating")) {
        const iconRect = filtersIcon.getBoundingClientRect();
        const topPos = iconRect.top + window.scrollY;
        filtersContainer.style.top = topPos + "px";
        filtersContainer.classList.add("show");
      }
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener("click", closeMobileFilters);
  }

  document.addEventListener("mousedown", function (e) {
    if (
      filtersContainer &&
      filtersContainer.classList.contains("mobile-floating") &&
      filtersContainer.classList.contains("show") &&
      !filtersContainer.contains(e.target) &&
      e.target !== filtersIcon
    ) {
      closeMobileFilters();
    }
  });

  window.addEventListener("resize", updateMobileFloating);
});
