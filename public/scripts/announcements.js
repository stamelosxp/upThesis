import {
  alertPopUP,
  formatDate,
  formatTime,
  renderLink,
  ensureScheme,
} from "./utils.js";

// Module-level state (assigned on DOMContentLoaded)
let announcementsListElement;
let paginationNavElement;
let paginationListElement;
let currentPageNumber = 1;
let totalPagesCount = 1;
let basePath = "";
const pageCache = new Map();

// 1. Render single announcement item
function renderAnnouncementItem(announcement) {
  const createdDateFormatted = formatDate(announcement.updatedAt);
  const li = document.createElement("li");
  li.className = "announcement-item";
  li.dataset.id = announcement.id;
  const wrapper = document.createElement("div");
  wrapper.className = "announcement-item-collapsed";
  const header = document.createElement("div");
  header.className = "announcement-collapsed-header";
  const title = document.createElement("h3");
  title.className = "announcement-header";
  title.textContent = announcement.thesisTitle || "";
  if (announcement.hasModified) {
    const badge = document.createElement("span");
    badge.className = "status-badge pending";
    badge.textContent = "Τροποποιήθηκε";
    title.appendChild(badge);
  }
  const dateEl = document.createElement("p");
  dateEl.className = "simple-badge";
  dateEl.textContent = createdDateFormatted;
  header.appendChild(title);
  header.appendChild(dateEl);
  const expand = document.createElement("small");
  expand.className = "expand-button";
  expand.textContent = "Κλικ για άνοιγμα";
  expand.addEventListener("click", () => {
    openModalAnnouncement(announcement);
  });
  wrapper.appendChild(header);
  wrapper.appendChild(expand);
  li.appendChild(wrapper);
  return li;
}

// 2. Render modal body with announcement details when opened
function renderModalBody(announcement, innerModal) {
  if (!announcement) return null;
  const titleValue = innerModal.querySelector("#title-value");
  if (titleValue) titleValue.textContent = announcement.thesisTitle;

  const dateValue = innerModal.querySelector("#date-value");
  if (dateValue)
    dateValue.textContent = formatDate(announcement.presentationDateTime);

  const timeValue = innerModal.querySelector("#time-value");
  if (timeValue)
    timeValue.textContent = formatTime(announcement.presentationDateTime);

  const descriptionValue = innerModal.querySelector("#description-value");
  if (descriptionValue) descriptionValue.textContent = announcement.description;

  const places = [];
  if (announcement.place1) places.push(announcement.place1);
  if (announcement.place2) places.push(announcement.place2);

  if (places.length > 0) {
    places.forEach((place, index) => {
      const placeGroup = innerModal.querySelector(
        `.content-group.place${index + 1}`
      );
      const placeValue = innerModal.querySelector(`#place${index + 1}-value`);
      if (placeGroup && placeValue) {
        placeValue.innerHTML = "";

        placeGroup.classList.remove("hidden");
        if (ensureScheme(place)) {
          placeValue.appendChild(renderLink(place));
        } else {
          placeValue.textContent = place;
        }
      }
    });
  } else {
    const placesInner = innerModal.querySelectorAll(".content-group.place");
    placesInner.forEach((el) => el.classList.add("hidden"));
  }

  const studentValue = innerModal.querySelector("#student-value");
  if (studentValue) studentValue.textContent = announcement.studentName;

  const supervisorValue = innerModal.querySelector("#supervisor-value");
  if (supervisorValue)
    supervisorValue.textContent = announcement.supervisorName;

  const memberAValue = innerModal.querySelector("#member-a-value");
  if (memberAValue)
    memberAValue.textContent =
      announcement.members && announcement.members[0]
        ? announcement.members[0]
        : "-";

  const memberBValue = innerModal.querySelector("#member-b-value");
  if (memberBValue)
    memberBValue.textContent =
      announcement.members && announcement.members[1]
        ? announcement.members[1]
        : "-";

  return true;
}

// 3. Open modal
function openModalAnnouncement(announcement) {
  const modalContainer = document.getElementById("display-announcement-modal");

  if (!modalContainer) {
    const message = "Αποτυχία φόρτωσης παραθύρου.";
    alertPopUP(message, "red");
    return;
  }
  const innerModal = modalContainer.querySelector(".modal");
  if (innerModal) {
    // restore scrollbar position

    modalContainer.classList.add("active");
    document.body.classList.add("no-scroll");
    renderModalBody(announcement, innerModal);
  } else {
    const message = "Αποτυχία φόρτωσης παραθύρου.";
    alertPopUP(message, "red");
    return;
  }
}

// 4. Close modal
function closeModalAnnouncement() {
  const modalContainer = document.getElementById("display-announcement-modal");
  if (!modalContainer) {
    return;
  }

  const innerModal = modalContainer.querySelector(".modal");
  if (innerModal) {
    modalContainer.classList.remove("active");
    document.body.classList.remove("no-scroll");

    const groupValues = innerModal.querySelectorAll(".group-value");
    groupValues.forEach((val) => {
      val.textContent = "";
    });

    const supervisorValue = innerModal.querySelector("#supervisor-value");
    if (supervisorValue) supervisorValue.textContent = "";
    const memberAValue = innerModal.querySelector("#member-a-value");
    if (memberAValue) memberAValue.textContent = "";
    const memberBValue = innerModal.querySelector("#member-b-value");
    if (memberBValue) memberBValue.textContent = "";
  }
}

// 5. Pagination
function createPageLink(pageNumber, label, extraClass) {
  const li = document.createElement("li");
  li.className = "page-item" + (extraClass ? " " + extraClass : "");
  const link = document.createElement("a");
  link.href = `${basePath}?page=${pageNumber}`;
  link.dataset.page = String(pageNumber);
  link.textContent = label;
  if (pageNumber === currentPageNumber) {
    link.setAttribute("aria-current", "page");
    li.classList.add("active");
  }
  li.appendChild(link);
  return li;
}


// 6. Fetch and render announcements for a given page
function renderAnnouncements(items) {
  announcementsListElement.innerHTML = "";
  if (!items || items.length === 0) {
    const noData = document.createElement("p");
    noData.classList.add("no-data");
    noData.textContent = "Δεν υπάρχουν ανακοινώσεις.";
    announcementsListElement.appendChild(noData);
    return;
  }

  const frag = document.createDocumentFragment();
  items.forEach((ann) => frag.appendChild(renderAnnouncementItem(ann)));
  announcementsListElement.appendChild(frag);
}

// 7. Fetch page data (with caching) and update UI
async function fetchPage(pageNumber) {
  if (pageNumber < 1) pageNumber = 1;
  try {
    // get from cache
    if (pageCache.has(pageNumber)) {
      const cached = pageCache.get(pageNumber);
      currentPageNumber = pageNumber;
      renderAnnouncements(cached.items);
      totalPagesCount = cached.totalPages;
      renderPagination();
    } else {
      // fetch from server
      const response = await fetch(`/api/announcements?page=${pageNumber}`);
      if (!response.ok) throw new Error("network");

      const payload = await response.json();
      if (!payload.success) throw new Error("api");

      currentPageNumber = payload.pagination.currentPage;
      totalPagesCount = payload.pagination.totalPages;

      pageCache.set(currentPageNumber, {
        items: payload.announcements,
        totalPages: totalPagesCount,
      });

      renderAnnouncements(payload.announcements);
      renderPagination();
    }

    const url = new URL(window.location.href);
    url.searchParams.set("page", currentPageNumber);
    window.history.pushState({ page: currentPageNumber }, "", url);
  } catch (e) {
    const announcementsListsElement =
      document.getElementById("announcements-list");
    if (announcementsListsElement) {
      announcementsListsElement.innerHTML = "";
      const noData = document.createElement("p");
      noData.classList.add("no-data", "error");
      noData.textContent = "Αποτυχία φόρτωσης ανακοινώσεων.";
      announcementsListsElement.appendChild(noData);
    }
    const paginationListElement = document.getElementById("pagination-list");
    if (paginationListElement) {
      paginationListElement.style.display = "none";
    }
  }
}

// 8. Render pagination controls
function renderPagination() {
  if (totalPagesCount <= 1) {
    paginationNavElement.style.display = "none";
    return;
  }
  paginationNavElement.style.display = "flex";
  paginationListElement.innerHTML = "";
  const windowSize = 3;
  let start = Math.max(1, currentPageNumber - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;
  if (end > totalPagesCount) {
    end = totalPagesCount;
    start = Math.max(1, end - windowSize + 1);
  }
  if (currentPageNumber > 1)
    paginationListElement.appendChild(
      createPageLink(currentPageNumber - 1, "Προηγούμενη", "prev")
    );
  if (start > 1) {
    paginationListElement.appendChild(createPageLink(1, "1"));
    if (start > 2) {
      const ell = document.createElement("li");
      ell.className = "page-item ellipsis";
      ell.innerHTML = "<span>…</span>";
      paginationListElement.appendChild(ell);
    }
  }
  for (let p = start; p <= end; p++)
    paginationListElement.appendChild(
      createPageLink(p, String(p), p === currentPageNumber ? "active" : "")
    );
  if (end < totalPagesCount) {
    if (end < totalPagesCount - 1) {
      const ell2 = document.createElement("li");
      ell2.className = "page-item ellipsis";
      ell2.innerHTML = "<span>…</span>";
      paginationListElement.appendChild(ell2);
    }
    paginationListElement.appendChild(
      createPageLink(totalPagesCount, String(totalPagesCount))
    );
  }
  if (currentPageNumber < totalPagesCount)
    paginationListElement.appendChild(
      createPageLink(currentPageNumber + 1, "Επόμενη", "next")
    );
}

document.addEventListener("DOMContentLoaded", () => {
  announcementsListElement = document.getElementById("announcements-list");
  paginationNavElement = document.getElementById("pagination");
  paginationListElement = document.getElementById("pagination-list");

  const closeModalBtn = document.getElementById(
    "close-display-announcement-modal"
  );
  if (closeModalBtn) {
    closeModalBtn.addEventListener("click", closeModalAnnouncement);
  }

  // keydown close modal
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeModalAnnouncement();
  });

  currentPageNumber = 0;
  basePath = window.location.pathname;

  paginationNavElement.addEventListener("click", (e) => {
    const anchor = e.target.closest("a[data-page]");
    if (!anchor) return;
    e.preventDefault();
    const pageNumber = parseInt(anchor.dataset.page, 10);
    if (!isNaN(pageNumber)) fetchPage(pageNumber);
  });

  window.addEventListener("popstate", () => {
    const pageNumber = parseInt(
      new URL(window.location.href).searchParams.get("page") || "1",
      10
    );
    if (pageNumber !== currentPageNumber) fetchPage(pageNumber);
  });

  const initialPage = parseInt(
    new URL(window.location.href).searchParams.get("page") || "1",
    10
  );
  fetchPage(initialPage);
});
