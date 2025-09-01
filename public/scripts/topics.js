let userRole = null;

let filterFetchController = null;


let jsonFilters = {
    sort: 'topic_title',
    search: '',
};

function formatDate(dateString) {
    if (!dateString) return '';
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

function renderCollapsedTopic(topic) {


    const collapsedDiv = document.createElement('div');
    collapsedDiv.className = 'topic-item-collapsed';

    const topicCollapsedHeader = document.createElement('div');
    topicCollapsedHeader.className = 'topic-collapsed-header';

    const topicHeader = document.createElement('h3');
    topicHeader.className = 'topic-header';
    topicHeader.textContent = topic.title;

    topicCollapsedHeader.appendChild(topicHeader);

    const dateBadge = document.createElement('p');
    dateBadge.className = 'simple-badge';
    dateBadge.textContent = formatDate(topic.creationDate);
    topicCollapsedHeader.appendChild(dateBadge);

    collapsedDiv.appendChild(topicCollapsedHeader);


    const expandButton = document.createElement('small');
    expandButton.className = 'expand-button';
    expandButton.textContent = 'Κλικ για ανάπτυξη';

    collapsedDiv.appendChild(expandButton);

    return collapsedDiv;
}

function renderExpandedTopic(topic) {
    const expandedDiv = document.createElement('div');
    expandedDiv.className = 'topic-item-expanded';

    // Title group
    const topicFormGroup1 = document.createElement('div');
    topicFormGroup1.className = 'topic-form-group';
    const topicTitleLabel = document.createElement('label');
    topicTitleLabel.setAttribute('for', 'topic-input-title-' + topic.id);
    const topicHeader = document.createElement('div');
    topicHeader.className = 'topic-header';
    topicHeader.textContent = 'Τίτλος Θέματος';
    const dateBadge = document.createElement('p');
    dateBadge.className = 'simple-badge';
    dateBadge.textContent = formatDate(topic.creationDate);
    topicHeader.appendChild(dateBadge);
    topicTitleLabel.appendChild(topicHeader);
    const topicTitleInput = document.createElement('input');
    topicTitleInput.type = 'text';
    topicTitleInput.id = 'topic-input-title-' + topic.id;
    topicTitleInput.value = topic.title;
    topicTitleInput.required = true;
    topicTitleInput.readOnly = true;
    topicFormGroup1.appendChild(topicTitleLabel);
    topicFormGroup1.appendChild(topicTitleInput);
    expandedDiv.appendChild(topicFormGroup1);

    // Description group
    const topicFormGroup2 = document.createElement('div');
    topicFormGroup2.className = 'topic-form-group';
    const descLabel = document.createElement('label');
    descLabel.setAttribute('for', 'topic-input-desc-' + topic.id);
    descLabel.textContent = 'Περιγραφή';
    const descTextarea = document.createElement('textarea');
    descTextarea.id = 'topic-input-desc-' + topic.id;
    descTextarea.maxLength = 500;
    descTextarea.required = true;
    descTextarea.disabled = true;
    descTextarea.textContent = topic.description ? topic.description.repeat(3) : '';
    topicFormGroup2.appendChild(descLabel);
    topicFormGroup2.appendChild(descTextarea);
    expandedDiv.appendChild(topicFormGroup2);

    // File attachment group
    const topicFormGroup3 = document.createElement('div');
    topicFormGroup3.classList.add('topic-form-group', 'file');
    const fileLabel = document.createElement('label');
    fileLabel.setAttribute('for', 'topic-file-' + topic.id);
    fileLabel.textContent = 'Συννημένο';
    topicFormGroup3.appendChild(fileLabel);
    if (topic.filePath) {
        const reqFileName = topic.filePath.split('/').pop();
        const reqFileExt = reqFileName && reqFileName.includes('.') ? reqFileName.split('.').pop().toUpperCase() : '';
        const fileExistsP = document.createElement('p');
        fileExistsP.className = 'topic-file-exists';
        const fileLink = document.createElement('a');
        fileLink.href = topic.filePath;
        fileLink.target = '_blank';
        fileLink.className = 'attachment-link';
        fileLink.title = reqFileName;
        const iconSpan = document.createElement('span');
        iconSpan.className = 'attachment-icon';
        iconSpan.textContent = '📄';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name-content';
        nameSpan.textContent = reqFileName;
        const typeSpan = document.createElement('span');
        typeSpan.className = 'attachment-type';
        typeSpan.textContent = reqFileExt;
        fileLink.appendChild(iconSpan);
        fileLink.appendChild(nameSpan);
        fileLink.appendChild(typeSpan);
        fileExistsP.appendChild(fileLink);
        if (userRole === 'professor') {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'x-icon';
            deleteBtn.textContent = '\u00D7';
            fileExistsP.appendChild(deleteBtn);
        }
        topicFormGroup3.appendChild(fileExistsP);
        const updateFileInput = document.createElement('input');
        updateFileInput.type = 'file';
        updateFileInput.id = 'update-topic-file-' + topic.id;
        updateFileInput.accept = '.pdf,.doc,.docx,.txt';
        updateFileInput.className = 'update-file-input';
        updateFileInput.readOnly = true;
        updateFileInput.hidden = true;
        topicFormGroup3.appendChild(updateFileInput);
    } else {
        if (userRole === 'professor') {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'topic-file-' + topic.id;
            fileInput.accept = '.pdf,.doc,.docx,.txt';
            fileInput.className = 'file-input';
            fileInput.readOnly = true;
            topicFormGroup3.appendChild(fileInput);
        } else {
            const noFileInput = document.createElement('input');
            noFileInput.type = 'text';
            noFileInput.value = '-';
            noFileInput.readOnly = true;
            topicFormGroup3.appendChild(noFileInput);
        }
    }
    expandedDiv.appendChild(topicFormGroup3);

    // Assignment group and modal (professor only)
    if (userRole === 'professor') {
        const topicFormGroup4 = document.createElement('div');
        topicFormGroup4.className = 'topic-form-group';
        const assignLabel = document.createElement('label');
        assignLabel.setAttribute('for', 'topic-assignment-' + topic.id);
        assignLabel.textContent = 'Ανάθεση';
        const assignInput = document.createElement('input');
        assignInput.id = 'topic-assignment-' + topic.id;
        assignInput.placeholder = 'Επιλέξτε Φοιτητή για Ανάθεση';
        assignInput.className = 'assignment';
        assignInput.value = '';
        assignInput.readOnly = true;
        topicFormGroup4.appendChild(assignLabel);
        topicFormGroup4.appendChild(assignInput);
        expandedDiv.appendChild(topicFormGroup4);

        // Assign student modal container (placeholder)
        const assignModalContainer = document.createElement('div');
        assignModalContainer.classList.add('assign-student-modal-container', 'empty');
        // Modal content would be injected here by server-side rendering or JS
        expandedDiv.appendChild(assignModalContainer);

        // Topic buttons group
        const topicButtonsGroup = document.createElement('div');
        topicButtonsGroup.className = 'topic-buttons-group';
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'cancel-button';
        deleteBtn.id = 'delete-topic-button-' + topic.id;
        deleteBtn.textContent = 'Διαγραφή';
        const editBtn = document.createElement('button');
        editBtn.className = 'light-button edit-topic-button';
        editBtn.id = 'edit-topic-button-' + topic.id;
        editBtn.textContent = 'Επεξεργασία';
        topicButtonsGroup.appendChild(deleteBtn);
        topicButtonsGroup.appendChild(editBtn);
        expandedDiv.appendChild(topicButtonsGroup);

        // Edit topic buttons group
        const editButtonsGroup = document.createElement('div');
        editButtonsGroup.className = 'edit-topic-buttons-group';
        const cancelEditBtn = document.createElement('button');
        cancelEditBtn.className = 'light-cancel-button cancel-edit-button';
        cancelEditBtn.id = 'cancel-topic-button-' + topic.id;
        cancelEditBtn.textContent = 'Ακύρωση';
        const saveBtn = document.createElement('button');
        saveBtn.className = 'accept-button';
        saveBtn.id = 'submit-topic-button-' + topic.id;
        saveBtn.textContent = 'Αποθήκευση';
        editButtonsGroup.appendChild(cancelEditBtn);
        editButtonsGroup.appendChild(saveBtn);
        expandedDiv.appendChild(editButtonsGroup);
    } else {
        // Supervisor group for non-professors
        const supervisorGroup = document.createElement('div');
        supervisorGroup.className = 'topic-form-group';
        const supervisorLabel = document.createElement('label');
        supervisorLabel.textContent = 'Επιβλέπων';
        const supervisorInput = document.createElement('input');
        supervisorInput.type = 'text';
        supervisorInput.value = 'Αλεξίου Δημήτριος';
        supervisorInput.readOnly = true;
        supervisorGroup.appendChild(supervisorLabel);
        supervisorGroup.appendChild(supervisorInput);
        expandedDiv.appendChild(supervisorGroup);
    }

    // Collapse button
    const collapseButton = document.createElement('small');
    collapseButton.className = 'collapse-button';
    collapseButton.textContent = 'Κλικ για σύμπτυξη';
    expandedDiv.appendChild(collapseButton);

    return expandedDiv;

}

function applyFilters() {
    if (filterFetchController) filterFetchController.abort();
    filterFetchController = new AbortController();
    fetchTopics(jsonFilters, filterFetchController.signal)
        .then((data) => {
            const topicsList = document.getElementById('topics-list');
            if (topicsList) {
                topicsList.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(topic => {
                        const topicLiItem = document.createElement('li');
                        topicLiItem.className = 'topic-item';
                        topicLiItem.appendChild(renderCollapsedTopic(topic));
                        topicLiItem.appendChild(renderExpandedTopic(topic));
                        topicsList.appendChild(topicLiItem);
                    });
                    toggleTopicView();
                    if (window.initEdit()) window.initEdit();
                    if (window.initAssignTopic()) window.initAssignTopic();
                } else {
                    topicsList.innerHTML = '<p class="no-data">Δε βρέθηκαν αποτελέσματα.</p>';
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

async function fetchTopics(filters, signal) {
    try {
        const response = await fetch('/api/filters/topics', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(filters),
            signal: signal
        });

        console.log('Request sending successfully...');

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }
        console.log('No network error, parsing data...');

        const data = await response.json();

        return data.topics;
    } catch (err) {
        if (err.name !== 'AbortError') {
            throw err;
        }
    }
}

function toggleTopicView() {
    const topicItems = document.querySelectorAll('.topic-item');
    topicItems.forEach(function (topicItem) {
        const collapsedContent = topicItem.querySelector(".topic-item-collapsed");
        const expandedContent = topicItem.querySelector(".topic-item-expanded");
        const expandButton = topicItem.querySelector(".expand-button");
        const collapseButton = topicItem.querySelector(".collapse-button");

        if (collapsedContent && expandedContent && expandButton && collapseButton) {

            expandButton.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                collapsedContent.style.display = "none";
                expandedContent.style.display = "flex";
            };

            collapseButton.onclick = function (e) {
                if (collapseButton.classList.contains('edit-mode')) {
                    e.preventDefault();
                    e.stopPropagation();
                    alert('Δεν έχετε ολοκληρώσει την επεξεργασία του θέματος. Παρακαλώ αποθηκεύστε ή ακυρώστε την επεξεργασία πριν προσπαθήσετε να κλείσετε το θέμα.');
                    return;
                }
                collapsedContent.style.display = "flex";
                expandedContent.style.display = "none";
            };
        }
    });
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
    userRole = document.getElementById('topics-section').dataset.userRole;

    toggleTopicView();

    const sortSelect = document.getElementById('sort-topics');
    if (sortSelect && !sortSelect.dataset.bound) {
        sortSelect.dataset.bound = 'true';
        sortSelect.addEventListener('change', function () {
            jsonFilters.sort = sortSelect.value;
            applyFilters();
        });
    }

    const searchInput = document.getElementById('search-topics');
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
});