let statItemInterval;

// 1. fetch dashboard stats for professor
async function fetchDashboardStats(professorId) {
  try {
    const response = await fetch(`/api/home/dashboard/${professorId}`);
    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const stats = await response.json();

    const thesesCountEl = document.getElementById("theses-count");
    const invitesCountEl = document.getElementById("invitations-count");
    const supervisionsCountEl = document.getElementById("supervisor-count");
    const topicsCountEl = document.getElementById("topics-count");

    if (thesesCountEl) thesesCountEl.textContent = stats.totalTheses;
    if (invitesCountEl)
      invitesCountEl.textContent = stats.totalPendingInvitations;
    if (supervisionsCountEl)
      supervisionsCountEl.textContent = stats.totalThesesSupervising;
    if (topicsCountEl) topicsCountEl.textContent = stats.totalAvailableTopics;
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    // Optionally, display an error message in the UI
    const dashboardSection = document.getElementById("dashboard-section");
    if (dashboardSection) {
      dashboardSection.innerHTML = "";
      const errorMsg = document.createElement("p");
      errorMsg.classList.add("no-data", "error");
      errorMsg.textContent = "Σφάλμα φόρτωσης.";
      dashboardSection.appendChild(errorMsg);
    }
  }
}

// 2. cycle through stats items (for small screens)
function cycleDashboardStats() {
  const statsItems = document.querySelectorAll(".stat-item");
  if (statsItems.length === 0) return;
  let activeIndex = Array.from(statsItems).findIndex((item) =>
    item.classList.contains("active")
  );
  if (activeIndex === -1) activeIndex = 0;

  statsItems[activeIndex].classList.remove("active");
  statsItems[activeIndex].classList.add("hidden");

  let nextIndex = (activeIndex + 1) % statsItems.length;
  statsItems[nextIndex].classList.remove("hidden");
  statsItems[nextIndex].classList.add("active");

  const dashboardSection = document.getElementById("dashboard-section");
  dashboardSection.style.transition = "opacity 0.1s";
  dashboardSection.style.opacity = "0.5";
  setTimeout(() => {
    dashboardSection.style.opacity = "1";
  }, 300);
}

// 3. start stats cycle
function startStatsCycle() {
  const statsItems = document.querySelectorAll(".stat-item");

  statsItems.forEach((item, idx) => {
    if (idx === 0) {
      item.classList.add("active");
      item.classList.remove("hidden");
    } else {
      item.classList.remove("active");
      item.classList.add("hidden");
    }
  });
  if (statItemInterval) clearInterval(statItemInterval);
  statItemInterval = setInterval(cycleDashboardStats, 3000);
}

document.addEventListener("DOMContentLoaded", () => {
  const dashboardSection = document.getElementById("dashboard-section");
  if (!dashboardSection) {
    return;
  }

  // Get professor ID from data attribute
  const professorId = dashboardSection.dataset.professorId;
  if (professorId) {
    fetchDashboardStats(professorId);
  }


  // Start stats cycle if on small screen
  if (window.innerWidth < 768) {
    startStatsCycle();
  }
  
  // Add resize event listener to handle screen size changes
  window.addEventListener("resize", () => {
    if (window.innerWidth < 768) {
      startStatsCycle();
    } else {
      if (statItemInterval) clearInterval(statItemInterval);
      const statsItems = document.querySelectorAll(".stat-item");
      statsItems.forEach((item) => {
        item.classList.remove("active");
        item.classList.remove("hidden");
      });
    }
  });
});
