// Move DOM references outside functions for reuse
const filtersIcon = document.querySelector('.filters-icon');
const filtersContainer = document.getElementById('assignments-filters-container');
const closeBtn = document.getElementById('close-mobile-filters');
const exportButton = document.getElementById('export-theses');

function exportUIData() {
    const noDataExists = document.querySelector('.no-data');
    if (noDataExists) {
        alert('Δεν υπάρχουν δεδομένα για εξαγωγή.');
        return;
    }
    const thesesList = document.querySelector('#assignments-list');

    const currentThesesIDs = [];

    if (thesesList) {
        const theses = thesesList.querySelectorAll('.thesis-item-collapsed');
        theses.forEach(thesis => {
            const thesisID = thesis.getAttribute('data-thesis-id');
            if (thesisID) {
                currentThesesIDs.push(thesisID);
            }
        });
    }
    let currentFetchController = null;

    fetchExportData(currentThesesIDs, currentFetchController).then(
        (data) => {
            if (data && data.length > 0) {
                const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data));
                const downloadAnchorNode = document.createElement('a');
                downloadAnchorNode.setAttribute("href", dataStr);
                const now = new Date();
                // Always use Europe/Athens timezone, format in Greek with 24h
                const options = {
                    timeZone: 'Europe/Athens',
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour12: false
                };
                const parts = new Intl.DateTimeFormat('el-GR', options).formatToParts(now);
                const getPart = type => parts.find(p => p.type === type)?.value;
                const formattedDate = `${getPart('hour')}:${getPart('minute')}-${getPart('day')}-${getPart('month')}-${getPart('year')}`;
                downloadAnchorNode.setAttribute("download", `theses_export_${formattedDate}.json`);
                document.body.appendChild(downloadAnchorNode);
                downloadAnchorNode.click();
                downloadAnchorNode.remove();
            } else {
                alert('Δεν υπάρχουν δεδομένα για εξαγωγή.');
            }
        }
    )
}

async function fetchExportData(currentUIThesesIDs, currentFetchController) {
    if (currentFetchController) currentFetchController.abort();
    currentFetchController = new AbortController();

    try {
        // Send IDs in POST body as JSON
        const response = await fetch('/api/export-theses', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ids: currentUIThesesIDs}),
            signal: currentFetchController.signal
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        return data.theses;
    } catch (err) {
        console.error("Export error:", err);
        alert("Σφάλμα κατά την εξαγωγή των δεδομένων.");
    }
}

function clearAllFilters() {
    const filtersInputs = document.querySelectorAll('input');
    filtersInputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else {
            input.value = '';
        }
        if (input.type === 'radio' && input.id === 'sort-method-title') {
            input.checked = true;
            console.log(input);

        }
    });
    const sortSelect = document.getElementById('sort-select');
    const statusSelect = document.getElementById('status-select');
    if (sortSelect) sortSelect.value = 'title'; // Select sort by title by default
    if (statusSelect) statusSelect.value = '';
}

// function filterTheses() {
//     const filtersInputs = document.querySelectorAll('input');
//     filtersInputs.forEach(input => {
//         input.addEventListener('change', () => {
//             console.log(input.value);
//         });
//     });
//     const sortSelect = document.getElementById('sort-select');
//     const statusSelect = document.getElementById('status-select');
//
//     console.log(statusSelect);
//     console.log(sortSelect);
// }

function updateMobileFloating() {
    if (window.innerWidth <= 1350) {
        filtersContainer.classList.add('mobile-floating');
        filtersContainer.classList.remove('show'); // Hide by default on resize
    } else {
        filtersContainer.classList.remove('mobile-floating');
        filtersContainer.classList.remove('show');
    }
}

function closeMobileFilters() {
    if (filtersContainer) {
        filtersContainer.classList.remove('show');
        filtersContainer.style.top = '';
    }
}

document.addEventListener('DOMContentLoaded', function () {
    updateMobileFloating();

    filterTheses();

    const clearFiltersBtn = document.getElementById('clear-filters-button');
    if (clearFiltersBtn) {
        clearFiltersBtn.addEventListener('click', function (e) {
            e.preventDefault();
            clearAllFilters();
        });
    }

    if (filtersIcon && filtersContainer) {
        filtersIcon.addEventListener('click', function () {
            if (filtersContainer.classList.contains('mobile-floating')) {
                const iconRect = filtersIcon.getBoundingClientRect();
                const topPos = iconRect.top + window.scrollY;
                filtersContainer.style.top = topPos + 'px';
                filtersContainer.classList.add('show');
            }
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', closeMobileFilters);
    }

    document.addEventListener('mousedown', function (e) {
        if (
            filtersContainer &&
            filtersContainer.classList.contains('mobile-floating') &&
            filtersContainer.classList.contains('show') &&
            !filtersContainer.contains(e.target) &&
            e.target !== filtersIcon
        ) {
            closeMobileFilters();
        }
    });

    if (exportButton) {
        exportButton.addEventListener('click', exportUIData);
    }

    window.addEventListener('resize', updateMobileFloating);
});
