import { debounce, toggleExpandCollapseView } from "./utils.js";
import {
  renderCollapsedTopic,
  renderExpandedTopic,
} from "./topics/topics-utils.js";

let updateButtonListeners;

let userRole = "guest";
let filterFetchController = null;

let jsonFilters = {
  sort: "topic_title",
  search: "",
};

// 1. Apply filters and fetch data
function applyFilters() {
  if (filterFetchController) filterFetchController.abort();
  filterFetchController = new AbortController();
  fetchTopics(jsonFilters, filterFetchController.signal)
    .then((data) => {
      const topicsList = document.getElementById("topics-list");
      if (topicsList) {
        topicsList.innerHTML = "";
        if (data && data.length > 0) {
          data.forEach((topic) => {
            const topicLiItem = document.createElement("li");
            topicLiItem.className = "topic-item";
            const collapsedContent = renderCollapsedTopic(topic, "filters");
            const expandedContent = renderExpandedTopic(
              topic,
              "filters",
              userRole
            );
            topicLiItem.appendChild(collapsedContent);
            topicLiItem.appendChild(expandedContent);
            topicsList.appendChild(topicLiItem);
          });
          toggleFunction();
          if (userRole === "professor") {
            updateButtonListeners();
          }
        } else {
          topicsList.innerHTML =
            '<p class="no-data">Δε βρέθηκαν αποτελέσματα.</p>';
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

async function fetchTopics(filters, signal) {
  try {
    const response = await fetch("/api/topics/filters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(filters),
      signal: signal,
    });

    const data = await response.json();

    return data.topics;
  } catch (err) {
    if (err.name !== "AbortError") {
      throw err;
    }
  }
}

// 2. Toggle expand/collapse for all topic items
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
      expandButton
    );
  });
}

document.addEventListener("DOMContentLoaded", async function () {
  userRole = document.getElementById("topics-section").dataset.userRole;
  toggleFunction();
  // If user is professor, load edit functionalities
  if (userRole === "professor") {
    const topic_edit = await import("./topics/topics-edit.js");
    updateButtonListeners = topic_edit.updateButtonListeners;
    updateButtonListeners();
  }

  const sortSelect = document.getElementById("sort-topics");
  if (sortSelect && !sortSelect.dataset.bound) {
    sortSelect.dataset.bound = "true";
    sortSelect.addEventListener("change", function () {
      jsonFilters.sort = sortSelect.value;
      applyFilters();
    });
  }

  const searchInput = document.getElementById("search-topics");
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
});
