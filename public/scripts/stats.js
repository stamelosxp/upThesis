import { alertPopUP } from "./utils.js";

const charts = {};
let data = {};
let statsLoaded = false;

//################# GENERAL FUNCTIONS ################
// 1. Show error or empty messages
function showErrorMessage(pane) {
  // Clear old content
  pane.innerHTML = "";
  const msg = document.createElement("p");
  msg.textContent = "Σφάλμα φόρτωσης.";
  msg.classList.add("no-data", "error");
  pane.appendChild(msg);
}

function showEmptyMessage(pane) {
  // Clear old content
  pane.innerHTML = "";
  const msg = document.createElement("p");
  msg.textContent = "Δεν υπάρχουν δεδομένα.";
  msg.classList.add("no-data");
  pane.appendChild(msg);
}

// 2. Load all charts (for small screens)
function loadAllCharts() {
  activateTab("duration");
  activateTab("assignments");
  activateTab("grades");
}

//################# STATS FUNCTIONS ################
// 1. Fetch stats data from the server
async function loadStatsDataRequest() {
  try {
    const response = await fetch("/api/stats/", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error("Network response was not ok");
    }
    const res = await response.json();
    if (res.success) {
      data = res.stats || {};
      statsLoaded = true;
    } else {
      const message = "Σφάλμα φόρτωσης δεδομένων.";
      alertPopUP(message, "red");
    }
  } catch {
    const message = "Σφάλμα φόρτωσης δεδομένων.";
    alertPopUP(message, "red");
  }
}

// 2. Create charts using Chart.js
const barValuePlugin = {
  id: "barValuePlugin",
  afterDatasetsDraw(chart) {
    const { ctx } = chart;
    ctx.save();
    ctx.font = "1.5rem Noto Sans Greek";
    ctx.textAlign = "center";
    ctx.textBaseline = "bottom";
    chart.data.datasets.forEach((dataset, i) => {
      const meta = chart.getDatasetMeta(i);
      meta.data.forEach((bar, index) => {
        const value = dataset.data[index];
        ctx.fillText(value, bar.x, bar.y - 5);
      });
    });
    ctx.restore();
  },
};

// 3. Create or update charts
function createChart(chartId, chartData, chartMax) {
  const ctx = document.getElementById(chartId).getContext("2d");

  if (!ctx) {
    return;
  }

  // Destroy old chart if it exists
  if (charts[chartId]) {
    charts[chartId].destroy();
  }

  charts[chartId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: ["Επιβλέπων", "Μέλος"],
      datasets: [
        {
          data: chartData,
          backgroundColor: ["#52616b", "#1e2022"],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: { beginAtZero: true, max: chartMax, grid: { display: false } },
        x: { grid: { display: false } },
      },
      plugins: { legend: { display: false } },
      animation: false,
    },
    plugins: [barValuePlugin],
  });
}

// ################ UI FUNCTIONS ################
// 1. Activate tab and load corresponding chart
function activateTab(tabId) {
  const tabs = document.querySelectorAll(".tab-link");
  const contents = document.querySelectorAll(".tab-content");
  const allowed = new Set(
    Array.from(tabs).map((t) => t.getAttribute("data-tab"))
  );
  if (!allowed.has(tabId)) tabId = "info";
  tabs.forEach((l) => l.classList.remove("active"));
  contents.forEach((c) => c.classList.remove("active"));
  const link = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
  const pane = document.getElementById(tabId);
  if (link) link.classList.add("active");
  if (pane) pane.classList.add("active");
  try {
    const isEmpty =
      Object.keys(data).length === 0 && data.constructor === Object;
    if (isEmpty) {
      showEmptyMessage(pane);
      return;
    }

    if (tabId === "duration") {
      const values = [
        data.durationAverage.supervisor,
        data.durationAverage.member,
      ];
      createChart("duration-chart", values, Math.max(...values) + 10);
    } else if (tabId === "assignments") {
      const values = [
        data.numberAssignments.supervisor,
        data.numberAssignments.member,
      ];
      createChart("assignments-chart", values, Math.max(...values) + 10);
    } else if (tabId === "grades") {
      const values = [data.averageGrade.supervisor, data.averageGrade.member];
      createChart("grades-chart", values, Math.ceil(Math.max(...values) + 5));
    }
  } catch (error) {
    if (pane) showErrorMessage(pane);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  const statsSection = document.getElementById("stats-content");
  if (!statsSection) return;
  if (statsLoaded) return;
  loadStatsDataRequest().then(() => {
    if (window.innerWidth <= 1100) loadAllCharts();
    window.addEventListener("resize", () => {
      if (window.innerWidth <= 1100) loadAllCharts();
      if (window.innerWidth > 1100) activateTab("grades");
    });
    activateTab("grades");

    document.querySelectorAll(".tab-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const tabId = link.getAttribute("data-tab");
        activateTab(tabId);
      });
    });
  });
});
