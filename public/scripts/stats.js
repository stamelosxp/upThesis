const data = {
    durationAverage: {
        supervisor: 10,
        member: 12,
    },
    numberAssignments: {
        supervisor: 5,
        member: 3,
    },
    averageGrade: {
        supervisor: 9.7,
        member: 8
    }
};

// ✅ Chart.js plugin to display values above bars
const barValuePlugin = {
    id: 'barValuePlugin',
    afterDatasetsDraw(chart) {
        const {ctx} = chart;
        ctx.save();
        ctx.font = '1.5rem Noto Sans Greek';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        chart.data.datasets.forEach((dataset, i) => {
            const meta = chart.getDatasetMeta(i);
            meta.data.forEach((bar, index) => {
                const value = dataset.data[index];
                ctx.fillText(value, bar.x, bar.y - 5);
            });
        });
        ctx.restore();
    }
};

// ✅ Validate data structure
function validateData(d) {
    try {
        if (!d) return false;
        if (!d.durationAverage?.supervisor || !d.durationAverage?.member) return false;
        if (!d.numberAssignments?.supervisor || !d.numberAssignments?.member) return false;
        if (!d.averageGrade?.supervisor || !d.averageGrade?.member) return false;
        return true;
    } catch {
        return false;
    }
}

// ✅ Show error in the active tab pane
function showErrorMessage(pane) {
    // Clear old content
    pane.innerHTML = '';
    const msg = document.createElement('p');
    msg.textContent = 'Σφάλμα φόρτωσης.';
    msg.classList.add('no-data', 'error');
    pane.appendChild(msg);
}

// Store chart instances per canvas
const charts = {};

function createChart(chartId, chartData, chartMax) {
    const ctx = document.getElementById(chartId).getContext('2d');

    // Destroy old chart if it exists
    if (charts[chartId]) {
        charts[chartId].destroy();
    }

    charts[chartId] = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: ['Επιβλέπων', 'Μέλος'],
            datasets: [{
                data: chartData,
                backgroundColor: ['#52616b', '#1e2022']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            scales: {
                y: {beginAtZero: true, max: chartMax, grid: {display: false}},
                x: {grid: {display: false}}
            },
            plugins: {legend: {display: false}},
            animation: {
                duration: 700,
                easing: 'easeOutQuart'
            },
        },
        plugins: [barValuePlugin]
    });
}


function activateTab(tabId) {
    const tabs = document.querySelectorAll('.tab-link');
    const contents = document.querySelectorAll('.tab-content');
    const allowed = new Set(Array.from(tabs).map(t => t.getAttribute('data-tab')));
    if (!allowed.has(tabId)) tabId = 'info';
    tabs.forEach(l => l.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));
    const link = document.querySelector(`.tab-link[data-tab="${tabId}"]`);
    const pane = document.getElementById(tabId);
    if (link) link.classList.add('active');
    if (pane) pane.classList.add('active');

    try {
        if (!validateData(data)) {
            showErrorMessage(pane);
            return;
        }

        let chartTarget = null;
        let chartData = null;
        let chartMax = null;

        if (tabId === 'duration') {
            const values = [data.durationAverage.supervisor, data.durationAverage.member];
            createChart('duration-chart', values, Math.max(...values) + 10);
        } else if (tabId === 'assignments') {
            const values = [data.numberAssignments.supervisor, data.numberAssignments.member];
            createChart('assignments-chart', values, Math.max(...values) + 10);
        } else if (tabId === 'grades') {
            const values = [data.averageGrade.supervisor, data.averageGrade.member];
            createChart('grades-chart', values, Math.ceil(Math.max(...values) + 5));
        }

    } catch (error) {
        console.error(error);
        if (pane) showErrorMessage(pane);
    }
}

function loadAllCharts() {
    activateTab('duration');
    activateTab('assignments');
    activateTab('grades');
}

document.addEventListener('DOMContentLoaded', () => {
    if (window.innerWidth <= 1100) loadAllCharts();
    window.addEventListener('resize', () => {
        if (window.innerWidth <= 1100) loadAllCharts();
        if (window.innerWidth > 1100) activateTab('grades');
    });

    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            activateTab(tabId);
        });
    });
    activateTab('grades');
});