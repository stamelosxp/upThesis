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

document.addEventListener('DOMContentLoaded', function () {
    var filtersIcon = document.querySelector('.filters-icon');
    var filtersContainer = document.getElementById('assignments-filters-container');
    var closeBtn = document.getElementById('close-mobile-filters');

    function updateMobileFloating() {
        if (window.innerWidth <= 1350) {
            filtersContainer.classList.add('mobile-floating');
            filtersContainer.classList.remove('show'); // Hide by default on resize
        } else {
            filtersContainer.classList.remove('mobile-floating');
            filtersContainer.classList.remove('show');
        }
    }

    const exportButton = document.getElementById('export-theses');
    if (exportButton) {
        exportButton.addEventListener('click', exportUIData);
    }

    updateMobileFloating();
    window.addEventListener('resize', updateMobileFloating);

    if (filtersIcon && filtersContainer && closeBtn) {
        filtersIcon.addEventListener('click', function () {
            if (filtersContainer.classList.contains('mobile-floating')) {
                // Get icon position relative to viewport
                var iconRect = filtersIcon.getBoundingClientRect();
                // Calculate top position (add scroll offset)
                var topPos = iconRect.top + window.scrollY;
                filtersContainer.style.top = topPos + 'px';
                filtersContainer.classList.add('show');
            }
        });
        closeBtn.addEventListener('click', function () {
            filtersContainer.classList.remove('show');
            filtersContainer.style.top = '';
        });
        document.addEventListener('mousedown', function (e) {
            if (
                filtersContainer.classList.contains('mobile-floating') &&
                filtersContainer.classList.contains('show') &&
                !filtersContainer.contains(e.target) &&
                e.target !== filtersIcon
            ) {
                filtersContainer.classList.remove('show');
                filtersContainer.style.top = '';
            }
        });
    }
});
