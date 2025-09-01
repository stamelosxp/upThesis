const filtersIcon = document.querySelector('.filters-icon');
const filtersContainer = document.getElementById('assignments-filters-container');
const closeBtn = document.getElementById('close-mobile-filters');
const exportButton = document.getElementById('export-theses');

const searchInput = document.getElementById('search-theses');

let exportFetchController = null;
let filterFetchController = null;


let jsonFilters = {
    search: '',
    sortBy: 'title',
    status: {},
    year: {},
    professorRole: {},
};


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

    // Abort previous export fetch if exists
    if (exportFetchController) exportFetchController.abort();
    exportFetchController = new AbortController();

    fetchExportData(currentThesesIDs, exportFetchController.signal).then(
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

async function fetchExportData(currentUIThesesIDs, signal) {
    try {
        const response = await fetch('/api/export-theses', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ids: currentUIThesesIDs}),
            signal: signal
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();
        return data.theses;
    } catch (err) {
        if (err.name !== 'AbortError') {
            console.error("Export error:", err);
            alert("Σφάλμα κατά την εξαγωγή των δεδομένων.");
        }
    }
}

async function fetchFilteredTheses(filters, signal) {
    try {
        const response = await fetch('/api/theses/filters', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(filters),
            signal: signal
        });

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        return data.theses;
    } catch (err) {
        if (err.name !== 'AbortError') {
            throw err;
        }
    }
}

function renderAsssignment(thesis) {
    //create li item
    const thesisLiItem = document.createElement('li');
    thesisLiItem.classList.add('thesis-item');

    //create div collapsed item
    const thesisItemCollapsed = document.createElement('div');
    thesisItemCollapsed.classList.add('thesis-item-collapsed');
    thesisItemCollapsed.setAttribute('data-thesis-id', thesis.id);

    //create header div
    const divThesisCollapsedHeader = document.createElement('div');
    divThesisCollapsedHeader.classList.add('thesis-collapsed-header');

    const thesisHeader = document.createElement('h3');
    thesisHeader.classList.add('thesis-header');
    thesisHeader.textContent = thesis.title;

    const badgesGroup = document.createElement('div');
    badgesGroup.classList.add('badges-group');

    const statusBadge = document.createElement('p');
    statusBadge.classList.add('status-badge', `${thesis.status}`);
    if (thesis.status === 'pending') {
        statusBadge.textContent = 'Υπό-Ανάθεση';
    } else if (thesis.status === 'active') {
        statusBadge.textContent = 'Ενεργή';
    } else if (thesis.status === 'completed') {
        statusBadge.textContent = 'Ολοκληρωμένη';
    } else if (thesis.status === 'cancelled') {
        statusBadge.textContent = 'Ακυρωμένη';
    } else if (thesis.status === 'review') {
        statusBadge.textContent = 'Υπό-Εξέταση';
    }

    const professorBadge = document.createElement('p');
    professorBadge.classList.add('info-badge');
    if (thesis.professorRole === 'supervisor') {

        professorBadge.textContent = 'ΕΠΙΒΛΕΠΩΝ';
    } else {
        professorBadge.textContent = 'ΜΕΛΟΣ';
    }

    badgesGroup.appendChild(statusBadge);
    badgesGroup.appendChild(professorBadge);

    divThesisCollapsedHeader.appendChild(thesisHeader);
    divThesisCollapsedHeader.appendChild(badgesGroup);

    const thesisLink = document.createElement('a');
    thesisLink.href = `/assignment/${thesis.id}`;
    thesisLink.classList.add('expand-button');
    thesisLink.textContent = 'Κλικ για άνοιγμα';

    thesisItemCollapsed.appendChild(divThesisCollapsedHeader);
    thesisItemCollapsed.appendChild(thesisLink);

    thesisLiItem.appendChild(thesisItemCollapsed);
    return thesisLiItem;
}

function applyFilters() {
    if (filterFetchController) filterFetchController.abort();
    filterFetchController = new AbortController();
    fetchFilteredTheses(jsonFilters, filterFetchController.signal)
        .then((data) => {
            const thesesList = document.getElementById('assignments-list');
            if (thesesList) {
                thesesList.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(thesis => {
                        thesesList.appendChild(renderAsssignment(thesis));
                    });
                } else {
                    thesesList.innerHTML = '<p class="no-data">Δεν βρέθηκαν δεδομένα με τα επιλεγμένα φίλτρα.</p>';
                }
            }
        })
        .catch((err) => {
            if (err.name === 'AbortError') return;
            const thesesList = document.getElementById('assignments-list');
            if (thesesList) {
                thesesList.innerHTML = '<p class="no-data error">Σφάλμα φόρτωσης δεδομένων. Προσπαθήστε ξανά</p>';
            }
        });
}

function clearAllFilters() {
    const filtersInputs = document.querySelectorAll('input');
    filtersInputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (input.type === 'radio' && input.name === 'sort-method') {
            if (input.id === 'sort-method-title') {
                input.checked = true;
            } else {
                input.checked = false;
            }
        } else if (input.type === 'text' || input.type === 'number') {
            input.value = '';
        }
    });

    // Reset global filter state
    jsonFilters = {
        sortBy: 'title',
        status: {},
        year: {},
        professorRole: {},
    };

    // Directly call applyFilters to update UI
    applyFilters();
}

function updateMobileFloating() {
    if (window.innerWidth <= 1350) {
        filtersContainer.classList.add('mobile-floating');
        filtersContainer.classList.remove('show');
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

// Debounce utility
function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

document.addEventListener('DOMContentLoaded', function () {
    updateMobileFloating();

    const filtersInputs = document.querySelectorAll('input');
    const yearRangeFromInput = document.getElementById('year-range-from');
    const yearRangeToInput = document.getElementById('year-range-to');

    filtersInputs.forEach(input => {
        input.addEventListener('change', () => {
            //store filters in jsonFilters
            if (input.name === 'sort-method') {
                jsonFilters.sortBy = input.value;
                console.log('Sort by:', jsonFilters.sortBy);
            }

            if (input.name === 'status') {
                if (input.checked) {
                    jsonFilters.status = {...jsonFilters.status, [input.id]: true};
                } else {
                    delete jsonFilters.status[input.id];
                }
            }

            if (input.name === 'year') {
                if (input.checked) {
                    jsonFilters.year = {...jsonFilters.year, [input.id]: true};
                } else {
                    delete jsonFilters.year[input.id];
                }
            }

            if (input.name === 'role') {
                if (input.checked) {
                    jsonFilters.professorRole = {...jsonFilters.professorRole, [input.id]: true};
                } else {
                    delete jsonFilters.professorRole[input.id];
                }
            }

            // Handle year range inputs
            if (input.id === 'year-range-from' || input.id === 'year-range-to') {
                const from = yearRangeFromInput.value ? parseInt(yearRangeFromInput.value) : null;
                const to = yearRangeToInput.value ? parseInt(yearRangeToInput.value) : null;
                if (from || to) {
                    jsonFilters.year.range = {from, to};
                } else {
                    if (jsonFilters.year.range) delete jsonFilters.year.range;
                }
            }

            // Call applyFilters to update UI
            applyFilters();
        });
    });


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

    const searchInput = document.getElementById('search-theses');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        const runSearch = () => {
            jsonFilters.search = searchInput.value.trim(); // FIX: use 'search' key
            applyFilters();
        };
        searchInput.addEventListener('input', debounce(runSearch, 300));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                jsonFilters.search = '';
                applyFilters();
            } else if (searchInput.value === '') {
                jsonFilters.search = '';
                applyFilters();
            }
        });
    }

    window.addEventListener('resize', updateMobileFloating);
});
