import { debounce, alertPopUP } from "./utils.js";

const filtersIcon = document.querySelector(".filters-icon");
const filtersContainer = document.getElementById(
  "assignments-filters-container"
);
const closeBtn = document.getElementById("close-mobile-filters");
const exportButton = document.getElementById("export-theses");

let constUserRole = null;
let exportFetchController = null;
let filterFetchController = null;

let jsonFilters = {
  search: "",
  sortBy: "title",
  status: {},
  year: {},
  professorRole: {},
  pendingChanges: null,
};

// 1. Export current UI assignments data (JSON or CSV)
function exportUIData(exportType) {
  const noDataExists = document.querySelector(".no-data");
  if (noDataExists) {
    alert("Δεν υπάρχουν δεδομένα για εξαγωγή.");
    return;
  }
  const thesesList = document.querySelector("#assignments-list");

  const currentThesesIDs = [];

  if (thesesList) console.log("Theses list found for export.");
  const theses = thesesList.querySelectorAll(".thesis-item-collapsed");
  theses.forEach((thesis) => {
    console.log("Processing thesis for export:", thesis);
    const thesisID = thesis.getAttribute("data-thesis-id");
    if (thesisID) {
      currentThesesIDs.push(thesisID);
    }
  });

  // Abort previous export fetch if exists
  if (exportFetchController) exportFetchController.abort();
  exportFetchController = new AbortController();

  if (exportType === "json") {
    fetchExportData(currentThesesIDs, exportFetchController.signal).then(
      (data) => {
        if (data && data.length > 0) {
          const dataStr =
            "data:text/json;charset=utf-8," +
            encodeURIComponent(JSON.stringify(data));
          const downloadAnchorNode = document.createElement("a");
          downloadAnchorNode.setAttribute("href", dataStr);
          const now = new Date();
          // Always use Europe/Athens timezone, format in Greek with 24h
          const options = {
            timeZone: "Europe/Athens",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour12: false,
          };
          const parts = new Intl.DateTimeFormat("el-GR", options).formatToParts(
            now
          );
          const getPart = (type) => parts.find((p) => p.type === type)?.value;
          const formattedDate = `${getPart("hour")}:${getPart(
            "minute"
          )}-${getPart("day")}-${getPart("month")}-${getPart("year")}`;
          downloadAnchorNode.setAttribute(
            "download",
            `theses_export_${formattedDate}.json`
          );
          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
        } else {
          alert("Δεν υπάρχουν δεδομένα για εξαγωγή.");
        }
      }
    );
  } else if (exportType === "csv") {
    fetchExportCSV(currentThesesIDs, exportFetchController.signal).then(
      (csvData) => {
        if (csvData && csvData.length > 0) {
          // CSV MIME type
          const dataStr =
            "data:text/csv;charset=utf-8," + encodeURIComponent(csvData);

          const downloadAnchorNode = document.createElement("a");
          downloadAnchorNode.setAttribute("href", dataStr);

          const now = new Date();
          // Format Europe/Athens, Greek, 24h
          const options = {
            timeZone: "Europe/Athens",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour12: false,
          };
          const parts = new Intl.DateTimeFormat("el-GR", options).formatToParts(
            now
          );
          const getPart = (type) => parts.find((p) => p.type === type)?.value;
          const formattedDate = `${getPart("hour")}:${getPart(
            "minute"
          )}-${getPart("day")}-${getPart("month")}-${getPart("year")}`;

          downloadAnchorNode.setAttribute(
            "download",
            `theses_export_${formattedDate}.csv`
          );

          document.body.appendChild(downloadAnchorNode);
          downloadAnchorNode.click();
          downloadAnchorNode.remove();
        } else {
          alert("Δεν υπάρχουν δεδομένα για εξαγωγή.");
        }
      }
    );
  } else {
    const message = "Μη υποστηριζόμενος τύπος εξαγωγής.";
    alertPopUP(message, "red");
  }
}

// 2. Fetch export CSV from server
async function fetchExportCSV(currentUIThesesIDs, signal) {
  try {
    const response = await fetch("/api/assignments/export-csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: currentUIThesesIDs }),
      signal: signal,
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.text();
    return data;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Export error:", err);
      alert("Σφάλμα κατά την εξαγωγή των δεδομένων.");
    }
  }
}

// 3. Fetch export JSON from server
async function fetchExportData(currentUIThesesIDs, signal) {
  try {
    const response = await fetch("/api/assignments/export-json", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: currentUIThesesIDs }),
      signal: signal,
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();
    return data.theses;
  } catch (err) {
    if (err.name !== "AbortError") {
      console.error("Export error:", err);
      alert("Σφάλμα κατά την εξαγωγή των δεδομένων.");
    }
  }
}

// 4. Fetch filtered theses from server
async function fetchFilteredTheses(filters, signal) {
  try {
    const response = await fetch("/api/assignments/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      signal: signal,
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }

    const data = await response.json();

    return data.theses;
  } catch (err) {
    if (err.name !== "AbortError") {
      throw err;
    }
  }
}

// 5. Render single assignment item
function renderAssignment(thesis) {
  //create li item
  const thesisLiItem = document.createElement("li");
  thesisLiItem.classList.add("thesis-item");

  //create div collapsed item
  const thesisItemCollapsed = document.createElement("div");
  thesisItemCollapsed.classList.add("thesis-item-collapsed");
  thesisItemCollapsed.setAttribute("data-thesis-id", thesis._id);
  if (thesis.pendingChanges && constUserRole === "secretary") {
    thesisItemCollapsed.classList.add("pending");
  }

  //create header div
  const divThesisCollapsedHeader = document.createElement("div");
  divThesisCollapsedHeader.classList.add("thesis-collapsed-header");

  const thesisHeader = document.createElement("h3");
  thesisHeader.classList.add("thesis-header");
  thesisHeader.textContent = thesis.title;

  const badgesGroup = document.createElement("div");
  badgesGroup.classList.add("badges-group");

  const statusBadge = document.createElement("p");
  statusBadge.classList.add("status-badge", `${thesis.status}`);
  if (thesis.status === "pending") {
    statusBadge.textContent = "Υπό-Ανάθεση";
  } else if (thesis.status === "active") {
    statusBadge.textContent = "Ενεργή";
  } else if (thesis.status === "completed") {
    statusBadge.textContent = "Ολοκληρωμένη";
  } else if (thesis.status === "cancelled") {
    statusBadge.textContent = "Ακυρωμένη";
  } else if (thesis.status === "review") {
    statusBadge.textContent = "Υπό-Αξιολόγηση";
  }
  badgesGroup.appendChild(statusBadge);

  const professorBadge = document.createElement("p");
  if (constUserRole === "professor") {
    professorBadge.classList.add("info-badge");
    if (thesis.professorRole === "supervisor") {
      professorBadge.textContent = "ΕΠΙΒΛΕΠΩΝ";
    } else {
      professorBadge.textContent = "ΜΕΛΟΣ";
    }
    badgesGroup.appendChild(professorBadge);
  }
  if (thesis.pendingChanges && constUserRole === "secretary") {
    const pendingBadge = document.createElement("span");
    pendingBadge.classList.add("pending-change-badge");
    pendingBadge.title = "Απαιτείται ενέργεια";
    pendingBadge.textContent = "!";
    badgesGroup.appendChild(pendingBadge);
  }

  divThesisCollapsedHeader.appendChild(thesisHeader);
  divThesisCollapsedHeader.appendChild(badgesGroup);

  const thesisLink = document.createElement("a");
  thesisLink.href = `/assignment/${thesis._id}`;
  thesisLink.classList.add("expand-button");
  thesisLink.textContent = "Κλικ για άνοιγμα";

  thesisItemCollapsed.appendChild(divThesisCollapsedHeader);
  thesisItemCollapsed.appendChild(thesisLink);

  thesisLiItem.appendChild(thesisItemCollapsed);
  return thesisLiItem;
}

// 6. Apply filters and update UI
function applyFilters() {
  if (filterFetchController) filterFetchController.abort();
  filterFetchController = new AbortController();
  fetchFilteredTheses(jsonFilters, filterFetchController.signal)
    .then((data) => {
      const thesesList = document.getElementById("assignments-list");
      if (thesesList) {
        thesesList.innerHTML = "";
        if (data && data.length > 0) {
          data.forEach((thesis) => {
            thesesList.appendChild(renderAssignment(thesis));
          });
        } else {
          thesesList.innerHTML =
            '<p class="no-data">Δεν βρέθηκαν δεδομένα με τα επιλεγμένα φίλτρα.</p>';
        }
      }
    })
    .catch((err) => {
      if (err.name === "AbortError") return;
      const thesesList = document.getElementById("assignments-list");
      if (thesesList) {
        thesesList.innerHTML =
          '<p class="no-data error">Σφάλμα φόρτωσης δεδομένων. Προσπαθήστε ξανά</p>';
      }
    });
}

// 7. Reset all filters
function clearAllFilters() {
  const filtersInputs = document.querySelectorAll("input");
  filtersInputs.forEach((input) => {
    if (input.type === "checkbox") {
      input.checked = false;
    } else if (input.type === "radio" && input.name === "sort-method") {
      if (input.id === "sort-method-title") {
        input.checked = true;
      } else {
        input.checked = false;
      }
    } else if (input.type === "text" || input.type === "number") {
      input.value = "";
    }
  });

  // Reset global filter state
  jsonFilters = {
    sortBy: "title",
    status: {},
    year: {},
    professorRole: {},
    pendingChanges: null,
  };

  // Directly call applyFilters to update UI
  applyFilters();
}

// 8. Mobile floating filters
function updateMobileFloating() {
  if (window.innerWidth <= 1350) {
    filtersContainer.classList.add("mobile-floating");
    filtersContainer.classList.remove("show");
  } else {
    filtersContainer.classList.remove("mobile-floating");
    filtersContainer.classList.remove("show");
  }
}

// 9. Close mobile filters
function closeMobileFilters() {
  if (filtersContainer) {
    filtersContainer.classList.remove("show");
    filtersContainer.style.top = "";
  }
}

// 10. Open export modal
function openExportModal() {
  const modalContainer = document.querySelector(".modal-container");
  if (!modalContainer) return;

  const innerModal = modalContainer.querySelector(".modal");
  if (innerModal) {
    modalContainer.classList.add("active");
    document.body.classList.add("no-scroll");
  }
}

// 11. Close export modal
function closeExportModal() {
  const modalContainer = document.querySelector(".modal-container");
  if (!modalContainer) return;
  const innerModal = modalContainer.querySelector(".modal");
  if (innerModal) {
    modalContainer.classList.remove("active");
    document.body.classList.remove("no-scroll");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  constUserRole = document.getElementById("assignments-content-section").dataset
    .userRole;
  updateMobileFloating();

  const filtersInputs = document.querySelectorAll("input");
  const yearRangeFromInput = document.getElementById("year-range-from");
  const yearRangeToInput = document.getElementById("year-range-to");

  filtersInputs.forEach((input) => {
    input.addEventListener("change", () => {
      //store filters in jsonFilters
      if (input.name === "sort-method") {
        jsonFilters.sortBy = input.value;
      }

      if (input.name === "status") {
        if (input.checked) {
          jsonFilters.status = { ...jsonFilters.status, [input.id]: true };
        } else {
          delete jsonFilters.status[input.id];
        }
      }

      if (input.name === "year") {
        if (input.checked) {
          jsonFilters.year = { ...jsonFilters.year, [input.id]: true };
        } else {
          delete jsonFilters.year[input.id];
        }
      }

      if (input.name === "role" && constUserRole === "professor") {
        if (input.checked) {
          jsonFilters.professorRole = {
            ...jsonFilters.professorRole,
            [input.id]: true,
          };
        } else {
          delete jsonFilters.professorRole[input.id];
        }
      }

      // Handle year range inputs
      if (input.id === "year-range-from" || input.id === "year-range-to") {
        const from = yearRangeFromInput.value
          ? parseInt(yearRangeFromInput.value)
          : null;
        const to = yearRangeToInput.value
          ? parseInt(yearRangeToInput.value)
          : null;
        if (from || to) {
          jsonFilters.year.range = { from, to };
        } else {
          if (jsonFilters.year.range) delete jsonFilters.year.range;
        }
      }

      if (input.id === "pending-changes" && constUserRole === "secretary") {
        if (input.checked) {
          jsonFilters.pendingChanges = true;
        } else {
          jsonFilters.pendingChanges = null;
        }
      }

      // Call applyFilters to update UI
      applyFilters();
    });
  });

  const clearFiltersBtn = document.getElementById("clear-filters-button");
  if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener("click", function (e) {
      e.preventDefault();
      clearAllFilters();
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

  if (exportButton) {
    exportButton.addEventListener("click", openExportModal);
  }

  const closeModalBtn = document.querySelector("#close-export-modal-button");
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeExportModal);
  }

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      closeExportModal();
    }
  });

  const exportCSVBtn = document.getElementById("export-csv-button");
  if (exportCSVBtn) {
    exportCSVBtn.addEventListener("click", () => {
      exportUIData("csv");
      closeExportModal();
    });
  }
  const exportJSONBtn = document.getElementById("export-json-button");
  if (exportJSONBtn) {
    exportJSONBtn.addEventListener("click", () => {
      exportUIData("json");
      closeExportModal();
    });
  }

  const searchInput = document.getElementById("search-theses");
  if (searchInput && !searchInput.dataset.bound) {
    searchInput.dataset.bound = "true";
    const runSearch = () => {
      jsonFilters.search = searchInput.value.trim(); // FIX: use 'search' key
      applyFilters();
    };
    searchInput.addEventListener("input", debounce(runSearch, 300));
    searchInput.addEventListener("keyup", (e) => {
      if (e.key === "Escape") {
        searchInput.value = "";
        jsonFilters.search = "";
        applyFilters();
      } else if (searchInput.value === "") {
        jsonFilters.search = "";
        applyFilters();
      }
    });
  }

  window.addEventListener("resize", updateMobileFloating);
});
