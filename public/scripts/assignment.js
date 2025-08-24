// Global state
let thesisId = null;
let invitationsLoaded = false;
let notesLoaded = false;
let meetingsLoaded = false; // added meetings state
let evaluationLoaded = false; // added evaluation state
let protocolLoaded = false; // added protocol state

function getThesisId() {
    if (!thesisId) {
        const detailContainer = document.querySelector('.assignment-detail-container');
        thesisId = detailContainer ? detailContainer.getAttribute('data-thesis-id') : null;
    }
    return thesisId;
}

// Formatting helpers
function formatDate(iso) {
    if (!iso) return '-';
    const d = new Date(iso);
    if (isNaN(d)) return '-';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
}

function showNewNote() {
    const newNoteItem = document.querySelector('.new-note-container');
    const noData = document.getElementById('notes-empty');
    if (newNoteItem) {
        newNoteItem.style.display = 'block';
        newNoteItem.scrollIntoView({behavior: 'smooth', block: 'center'});
        if (noData) noData.style.display = 'none';
    }
}

function cancelNewNote() {
    const newNoteItem = document.querySelector('.new-note-container');
    if (!newNoteItem) return;
    newNoteItem.style.display = 'none';
    newNoteItem.querySelectorAll('input[type="text"], textarea').forEach(el => el.value = '');
    const notesList = document.getElementById('notes-list');
    if (notesList && notesList.querySelectorAll('li.note-item').length === 0) {
        const noData = document.getElementById('notes-empty');
        if (noData) noData.style.display = 'block';
    }
}

function showNewMeeting() {
    const newMeetingItem = document.querySelector('.new-meeting-container');
    const noData = document.getElementById('meetings-empty');
    const datePickerMeeting = document.getElementById("new-meeting-date-time");
    //connect with users events to prevent overlap
    if (datePickerMeeting) {
        const now = new Date();
        const pad = n => String(n).padStart(2, '0');
        const yyyy = now.getFullYear();
        const mm = pad(now.getMonth() + 1);
        const dd = pad(now.getDate());
        const hh = pad(now.getHours());
        const min = pad(now.getMinutes());
        const dateTimeStr = `${yyyy}-${mm}-${dd}T${hh}:${min}`; // full datetime-local value
        datePickerMeeting.value = dateTimeStr; // set default to current local time

        datePickerMeeting.setAttribute('min', `${yyyy}-${mm}-${dd}T00:00`);
    }
    if (newMeetingItem) {
        newMeetingItem.style.display = 'block';
        newMeetingItem.scrollIntoView({behavior: 'smooth', block: 'center'});
        if (noData) noData.style.display = 'none';
    }

}

function cancelNewMeeting() {
    const newMeetingItem = document.querySelector('.new-meeting-container');
    if (!newMeetingItem) return;
    newMeetingItem.style.display = 'none';
    newMeetingItem.querySelectorAll('input[type="datetime-local"]').forEach(el => el.value = '');
    const meetingList = document.getElementById('meetings-list');
    if (meetingList && meetingList.querySelectorAll('li.meeting-item').length === 0) {
        const noData = document.getElementById('meetings-empty');
        if (noData) noData.style.display = 'block';
    }
}

function attachNoteItemHandlers() {
    const overlay = document.getElementById('noteOverlay');
    const modalTitle = document.getElementById('modalNoteTitle');
    const modalContent = document.getElementById('modalNoteContent');
    document.querySelectorAll('.note-item').forEach(item => {
        item.addEventListener('click', (e) => {
            if (e.target && e.target.classList.contains('delete-note-icon')) return;
            if (overlay) {
                modalTitle.textContent = item.dataset.noteTitle || 'Σημείωση';
                modalContent.textContent = item.dataset.noteContent || '';
                overlay.classList.add('active');
            }
        });
    });
    const closeBtn = document.getElementById('closeNoteModal');
    if (closeBtn) closeBtn.addEventListener('click', () => overlay && overlay.classList.remove('active'));
    if (overlay) overlay.addEventListener('click', e => {
        if (e.target === overlay) overlay.classList.remove('active');
    });
}

async function loadNotes() {
    if (notesLoaded || !getThesisId()) return;
    const list = document.getElementById('notes-list');
    if (!list) return;
    list.setAttribute('data-loaded', 'loading');
    const emptyEl = document.getElementById('notes-empty');
    try {
        const res = await fetch(`/api/thesis/${getThesisId()}/notes`);
        if (!res.ok) throw new Error('Network');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'API');
        const notes = data.notes || [];
        if (notes.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            notesLoaded = true;
            list.setAttribute('data-loaded', 'true');
            return;
        }
        if (emptyEl) emptyEl.remove();
        notes.forEach(note => {
            const li = document.createElement('li');
            li.className = 'info-member note-item';
            li.dataset.noteId = note.id;
            li.dataset.noteTitle = note.noteTitle;
            li.dataset.noteContent = note.noteContent;
            li.dataset.noteDate = note.dateCreated;

            const titleP = document.createElement('p');
            titleP.className = 'note-title';
            titleP.textContent = note.noteTitle;
            li.appendChild(titleP);

            // status wrapper similar to meeting-status
            const statusWrapper = document.createElement('div');
            statusWrapper.className = 'meeting-status';

            const dateP = document.createElement('p');
            dateP.className = 'info-badge';
            dateP.textContent = formatDate(note.dateCreated);
            statusWrapper.appendChild(dateP);

            const delSpan = document.createElement('span');
            delSpan.className = 'delete-wrapper';
            const a = document.createElement('a');
            const img = document.createElement('img');
            img.className = 'delete-note-icon';
            img.src = '/icons/delete.png';
            img.alt = 'Delete Note Icon';
            a.appendChild(img);
            delSpan.appendChild(a);
            statusWrapper.appendChild(delSpan);

            li.appendChild(statusWrapper);

            list.appendChild(li);
        });
        attachNoteItemHandlers();
        notesLoaded = true;
        list.setAttribute('data-loaded', 'true');
    } catch (e) {
        console.error('Failed loading notes', e);
        if (emptyEl) {
            emptyEl.textContent = 'Πρόβλημα φόρτωσης';
            emptyEl.classList.add('error');
            emptyEl.style.display = 'block';
        }
        list.setAttribute('data-loaded', 'error');
    }
}

// Invitations rendering
function renderInvitations(pending, completed) {
    const pendingWrapper = document.querySelector('#timeline .pending-invitations');
    const pendingList = pendingWrapper ? pendingWrapper.querySelector('.pending-list') : null;
    const completedWrapper = document.querySelector('#timeline .completed-invitations');
    const completedList = completedWrapper ? completedWrapper.querySelector('.completed-list') : null;

    function renderCategory(listEl, wrapperEl, data, type) {
        if (!listEl || !wrapperEl) return;
        listEl.innerHTML = '';
        const existsNoData = wrapperEl.querySelector('p.no-data');
        if (existsNoData) existsNoData.remove();
        if (!data || data.length === 0) {
            const noData = document.createElement('p');
            noData.className = 'no-data';
            noData.textContent = 'Δεν υπάρχουν αποτελέσματα';
            wrapperEl.appendChild(noData);
            return;
        }
        data.forEach(inv => {
            const memberDiv = document.createElement('div');
            memberDiv.className = `info-member ${type === 'pending' ? 'invite' : 'complete-invite'}`;
            if (inv.invitationID) memberDiv.setAttribute('data-invitation-id', inv.invitationID);
            const nameP = document.createElement('p');
            nameP.textContent = inv.professorFullName;
            memberDiv.appendChild(nameP);
            const badgeP = document.createElement('p');
            if (inv.status === 'pending') {
                badgeP.className = 'info-badge invite-date';
                badgeP.textContent = formatDate(inv.createdAt);
            } else if (inv.status === 'accepted') {
                badgeP.className = 'info-badge completed invite-answer';
                badgeP.textContent = 'Αποδεκτή';
            } else if (inv.status === 'rejected') {
                badgeP.className = 'info-badge cancelled invite-answer';
                badgeP.textContent = 'Απορριφθείσα';
            }
            memberDiv.appendChild(badgeP);
            listEl.appendChild(memberDiv);
        });
    }

    renderCategory(pendingList, pendingWrapper, pending, 'pending');
    renderCategory(completedList, completedWrapper, completed, 'completed');
}

async function loadInvitations() {
    if (invitationsLoaded || !getThesisId()) return;
    const hasInvitationSection = document.querySelector('#timeline .pending-invitations, #timeline .completed-invitations');
    if (!hasInvitationSection) {
        invitationsLoaded = true;
        return;
    }
    invitationsLoaded = true;
    try {
        const res = await fetch(`/api/thesis/${getThesisId()}/invitations`);
        if (!res.ok) throw new Error('Network response was not ok');
        const data = await res.json();
        if (!data.success) return;
        renderInvitations(data.pending || [], data.completed || []);
    } catch (err) {
        console.error('Failed to load invitations', err);
        document.querySelectorAll('#timeline .pending-invitations, #timeline .completed-invitations').forEach(w => {
            const normalNoData = w.querySelector('p.no-data:not(.error)');
            if (normalNoData) normalNoData.remove();
            if (!w.querySelector('p.no-data.error')) {
                const p = document.createElement('p');
                p.className = 'no-data error';
                p.textContent = 'Πρόβλημα φόρτωσης προσκλήσεων προσπαθήστε ξανά αργότερα';
                w.appendChild(p);
            }
        });
    }
}

async function loadMeetings() {
    if (meetingsLoaded || !getThesisId()) return;
    // Mark as loading early to prevent concurrent duplicate fetches
    meetingsLoaded = true;
    const list = document.getElementById('meetings-list');
    if (!list) return; // tab not present
    list.setAttribute('data-loaded', 'loading');
    const emptyEl = document.getElementById('meetings-empty');
    try {
        const res = await fetch(`/api/thesis/${getThesisId()}/meetings`);
        if (!res.ok) throw new Error('Network');
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'API');
        const meetings = data.meetings || [];
        if (meetings.length === 0) {
            if (emptyEl) emptyEl.style.display = 'block';
            list.setAttribute('data-loaded', 'true');
            return;
        }
        if (emptyEl) emptyEl.remove();
        meetings.forEach(m => {
            const li = document.createElement('li');
            li.className = 'info-member meeting-item';
            li.dataset.meetingId = m.id;
            const dateP = document.createElement('p');
            dateP.textContent = formatDate(m.dateTime);
            li.appendChild(dateP);

            if (m.status === 'scheduled') {
                const statusDiv = document.createElement('div');
                statusDiv.className = 'meeting-status';
                const badge = document.createElement('p');
                badge.className = 'info-badge pending';
                badge.textContent = 'Προγραμματισμένη';
                statusDiv.appendChild(badge);
                const cancelBtn = document.createElement('button');
                cancelBtn.className = 'cancel-meeting-button';
                cancelBtn.title = 'Ακύρωση συνάντησης';
                const span = document.createElement('span');
                span.textContent = '×';
                cancelBtn.appendChild(span);
                statusDiv.appendChild(cancelBtn);
                li.appendChild(statusDiv);
            } else if (m.status === 'cancelled') {
                const badge = document.createElement('p');
                badge.className = 'info-badge cancelled';
                badge.textContent = 'Ακυρωμένη';
                li.appendChild(badge);
            } else if (m.status === 'completed') {
                const badge = document.createElement('p');
                badge.className = 'info-badge completed';
                badge.textContent = 'Ολοκληρωμένη';
                li.appendChild(badge);
            } else { // fallback unknown
                const badge = document.createElement('p');
                badge.className = 'info-badge';
                badge.textContent = m.status || '-';
                li.appendChild(badge);
            }
            list.appendChild(li);
        });
        list.setAttribute('data-loaded', 'true');
    } catch (e) {
        console.error('Failed loading meetings', e);
        // Allow retry on failure
        meetingsLoaded = false;
        if (emptyEl) {
            emptyEl.textContent = 'Πρόβλημα φόρτωσης';
            emptyEl.classList.add('error');
            emptyEl.style.display = 'block';
        } else {
            const errLi = document.createElement('li');
            errLi.className = 'no-data error';
            errLi.textContent = 'Πρόβλημα φόρτωσης';
            list.appendChild(errLi);
        }
        list.setAttribute('data-loaded', 'error');
    }
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
    if (tabId === 'timeline') {
        loadInvitations();
        initInviteModal();
    }
    if (tabId === 'notes') loadNotes();
    if (tabId === 'meetings') loadMeetings();
    if (tabId === 'evaluation') loadEvaluation();
    if (tabId === 'protocol') loadProtocol();
    if (tabId !== 'notes') {
        const newNoteItem = document.querySelector('.new-note-container');
        if (newNoteItem && newNoteItem.style.display !== 'none') cancelNewNote();
    }
    if (tabId !== 'meetings') {
        const newMeetingItem = document.querySelector('.new-meeting-container');
        if (newMeetingItem && newMeetingItem.style.display !== 'none') cancelNewMeeting();
    }
}

function mobileGradeNavigation() {
    const evaluationGradesContainer = document.querySelector('.grades-container');
    if (!evaluationGradesContainer) {
        return;
    }

    const mobileNavigationBar = evaluationGradesContainer.querySelector('.mobile-navigation-table');
    const evaluationTable = evaluationGradesContainer.querySelector('.evaluation-table');

    if (!mobileNavigationBar || !evaluationTable) {
        return;
    }

    const currentUserThesisRole = document.querySelector('.assignment-detail-container')?.getAttribute('data-user-role');
    const previousEvaluatorButton = mobileNavigationBar.querySelector('.back-arrow');
    const nextEvaluatorButton = mobileNavigationBar.querySelector('.front-arrow');
    const currentEvaluatorLabel = mobileNavigationBar.querySelector('.current-table-professor');

    if (!previousEvaluatorButton || !nextEvaluatorButton || !currentEvaluatorLabel) {
        return;
    }

    const headerCellElements = Array.from(evaluationTable.tHead.rows[0].cells);
    if (headerCellElements.length < 2) return;

    // map roles with labels
    const evaluatorRoleDefinitions = [
        {role: 'supervisor', label: 'Επιβλέπων'},
        {role: 'memberA', label: 'Μέλος Α'},
        {role: 'memberB', label: 'Μέλος Β'}
    ];


    const evaluatorColumns = evaluatorRoleDefinitions
        .map((definition, rolePosition) => ({
            ...definition,
            index: rolePosition + 1, // skip category col (0)
            header: headerCellElements[rolePosition + 1]
        }))
        .filter(columnMeta => !!columnMeta.header);

    if (!evaluatorColumns.length) return;

    const tableBodyRows = Array.from(evaluationTable.tBodies[0].rows || []);
    evaluatorColumns.forEach(columnMeta => {
        columnMeta.cells = tableBodyRows.map(rowEl => rowEl.cells[columnMeta.index]).filter(Boolean);
    });

    function resolveInitialEvaluatorColumnIndex(role) {
        const desiredRole = role === 'student' ? 'supervisor' : role;
        const foundIndex = evaluatorColumns.findIndex(col => col.role === desiredRole);
        return foundIndex;
    }

    let currentEvaluatorColumnIndex = resolveInitialEvaluatorColumnIndex(currentUserThesisRole);

    function updateCurrentEvaluatorLabel(columnIndex) {
        currentEvaluatorLabel.textContent = evaluatorColumns[columnIndex]?.label || '-';
    }

    function updateNavigationButtonState() {
        previousEvaluatorButton.disabled = currentEvaluatorColumnIndex === 0;
        nextEvaluatorButton.disabled = currentEvaluatorColumnIndex === evaluatorColumns.length - 1;
    }

    function showOnlyEvaluatorColumn(columnIndex) {
        // Always keep the category column visible
        headerCellElements[0].classList.remove('hidden');
        tableBodyRows.forEach(rowEl => rowEl.cells[0]?.classList.remove('hidden'));

        // Hide all evaluator columns
        evaluatorColumns.forEach(columnMeta => {
            columnMeta.header.classList.add('hidden');
            columnMeta.cells.forEach(cellEl => cellEl.classList.add('hidden'));
        });

        // Reveal selected evaluator column
        const selectedColumnMeta = evaluatorColumns[columnIndex];
        if (selectedColumnMeta) {
            selectedColumnMeta.header.classList.remove('hidden');
            selectedColumnMeta.cells.forEach(cellEl => cellEl.classList.remove('hidden'));
        }
        updateCurrentEvaluatorLabel(columnIndex);
        updateNavigationButtonState();
    }

    const isMobileViewport = window.innerWidth <= 768;
    if (isMobileViewport) {
        mobileNavigationBar.style.display = 'flex';
        showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
    } else {
        mobileNavigationBar.style.display = 'none';
        headerCellElements.forEach(th => th.classList.remove('hidden'));
        tableBodyRows.forEach(rowEl => Array.from(rowEl.cells).forEach(cellEl => cellEl.classList.remove('hidden')));
    }

    previousEvaluatorButton.onclick = () => {
        if (currentEvaluatorColumnIndex > 0) {
            currentEvaluatorColumnIndex--;
            showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
        }
    };
    nextEvaluatorButton.onclick = () => {
        if (currentEvaluatorColumnIndex < evaluatorColumns.length - 1) {
            currentEvaluatorColumnIndex++;
            showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
        }
    };

    window.addEventListener('resize', () => {
        const isMobileViewport = window.innerWidth <= 768;
        if (isMobileViewport) {
            mobileNavigationBar.style.display = 'flex';
            showOnlyEvaluatorColumn(currentEvaluatorColumnIndex);
        } else {
            mobileNavigationBar.style.display = 'none';
            headerCellElements.forEach(th => th.classList.remove('hidden'));
            tableBodyRows.forEach(rowEl => Array.from(rowEl.cells).forEach(cellEl => cellEl.classList.remove('hidden')));
        }
    });
}

function updateStudentUploadButtonVisibility() {
    const btn = document.getElementById('student-upload-button');
    if (!btn) return; // not on student page or not needed
    const fileInput = document.getElementById('temporary-report-file');
    const hasFile = !!(fileInput && fileInput.files && fileInput.files.length > 0);
    let hasLink = false;
    const linksContainer = document.querySelector('.student-add-links .added-link-inputs');
    if (linksContainer) {
        // any finalized links
        hasLink = linksContainer.querySelectorAll('.final-link').length > 0;
        if (!hasLink) {
            // or any typed value in pending inputs
            hasLink = Array.from(linksContainer.querySelectorAll('input.link-input-field'))
                .some(i => i.value.trim().length > 0);
        }
    }
    // Show only if there are changes (new file chosen or link content)
    btn.style.display = (hasFile || hasLink) ? 'block' : 'none';
}

function initLinkAddition() {
    const wrapper = document.querySelector('.student-add-links');
    if (!wrapper) return; // not present
    if (wrapper.dataset.linksInit === 'true') return; // already initialized

    const inputsContainer = wrapper.querySelector('.added-link-inputs');
    const addBtn = wrapper.querySelector('.nav-arrow.add-link-input');
    const removeBtn = wrapper.querySelector('.nav-arrow.remove-link-input');
    if (!inputsContainer || !addBtn || !removeBtn) return;

    const MAX_LINKS = 4; // maximum finalized + pending inputs

    function countFinalized() {
        return inputsContainer.querySelectorAll('.final-link').length;
    }

    function workingCount() {
        return inputsContainer.children.length; // each child either input or finalized link block
    }

    function updateButtons() {
        addBtn.disabled = workingCount() >= MAX_LINKS;
        removeBtn.disabled = workingCount() === 0;
        updateStudentUploadButtonVisibility();
    }

    function ensureScheme(raw) {
        let v = (raw || '').trim();
        if (!v) return null;
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        try {
            return new URL(v).href;
        } catch {
            return null;
        }
    }

    function makeFinalLink(rawOriginal, normalizedHref) {
        const container = document.createElement('p');
        container.className = 'link-exist-container final-link';
        const a = document.createElement('a');
        a.href = normalizedHref;
        a.className = 'attachment-link';
        a.target = '_blank';
        const icon = document.createElement('span');
        icon.className = 'attachment-icon';
        icon.title = 'Link';
        icon.textContent = '\ud83d\udcce';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name-content';
        nameSpan.textContent = rawOriginal; // full original
        const typeSpan = document.createElement('span');
        typeSpan.className = 'attachment-type';
        typeSpan.textContent = 'LINK';
        a.appendChild(icon);
        a.appendChild(nameSpan);
        a.appendChild(typeSpan);
        const xIcon = document.createElement('button');
        xIcon.type = 'button';
        xIcon.className = 'x-icon';
        xIcon.textContent = '×';
        // Added: allow reverting back to an input when removing the link
        xIcon.addEventListener('click', (e) => {
            e.preventDefault();
            const input = document.createElement('input');
            input.type = 'url';
            input.placeholder = 'Προσθήκη συνδέσμου';
            input.className = 'link-input-field';
            input.value = rawOriginal;
            container.replaceWith(input);
            attachFinalizers(input);
            input.focus();
            updateButtons();
            updateStudentUploadButtonVisibility();
        });
        container.appendChild(a);
        container.appendChild(xIcon);
        return container;
    }

    function finalizeInput(inputEl) {
        if (!inputEl || !inputEl.isConnected) return;
        const rawOriginal = (inputEl.value || '').trim();
        if (!rawOriginal) {
            inputEl.classList.add('invalid-link');
            setTimeout(() => inputEl.classList.remove('invalid-link'), 1200);
            return;
        }
        const href = ensureScheme(rawOriginal);
        if (!href) {
            inputEl.classList.add('invalid-link');
            setTimeout(() => inputEl.classList.remove('invalid-link'), 1200);
            return;
        }
        const finalBlock = makeFinalLink(rawOriginal, href);
        inputEl.replaceWith(finalBlock);
        updateButtons();
        updateStudentUploadButtonVisibility();
    }

    function attachFinalizers(inputEl) {
        inputEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') {
                e.preventDefault();
                finalizeInput(inputEl);
            }
        });
        inputEl.addEventListener('blur', () => finalizeInput(inputEl));
        inputEl.addEventListener('input', () => updateStudentUploadButtonVisibility());
    }

    addBtn.addEventListener('click', e => {
        e.preventDefault();
        if (workingCount() >= MAX_LINKS) return;
        const input = document.createElement('input');
        input.type = 'url';
        input.placeholder = 'Προσθήκη συνδέσμου';
        input.className = 'link-input-field';
        inputsContainer.appendChild(input);
        attachFinalizers(input);
        input.focus();
        updateButtons();
        updateStudentUploadButtonVisibility();
    });

    removeBtn.addEventListener('click', e => {
        e.preventDefault();
        const last = inputsContainer.lastElementChild;
        if (last) last.remove();
        updateButtons();
        updateStudentUploadButtonVisibility();
    });

    wrapper.dataset.linksInit = 'true';
    updateButtons();
}

function initTemporaryReportFile() {
    const fileInput = document.getElementById('temporary-report-file');
    if (!fileInput) return;
    if (fileInput.dataset.init === 'true') return;

    function buildFileBlock(file) {
        const container = document.createElement('p');
        container.className = 'link-exist-container final-file';
        const a = document.createElement('span'); // not a link because it's not uploaded yet
        a.className = 'attachment-link';
        const icon = document.createElement('span');
        icon.className = 'attachment-icon';
        icon.textContent = '📄';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name-content';
        nameSpan.textContent = file.name;
        const typeSpan = document.createElement('span');
        typeSpan.className = 'attachment-type';
        const ext = (file.name.split('.').pop() || '').toUpperCase();
        typeSpan.textContent = ext || 'FILE';
        a.appendChild(icon);
        a.appendChild(nameSpan);
        a.appendChild(typeSpan);
        const xIcon = document.createElement('button');
        xIcon.type = 'button';
        xIcon.className = 'x-icon';
        xIcon.textContent = '×';
        xIcon.title = 'Αφαίρεση αρχείου';
        xIcon.addEventListener('click', (e) => {
            e.preventDefault();
            fileInput.value = '';
            fileInput.style.display = '';
            container.remove();
            updateStudentUploadButtonVisibility();
        });
        container.appendChild(a);
        container.appendChild(xIcon);
        return container;
    }

    fileInput.addEventListener('change', () => {
        const file = fileInput.files && fileInput.files[0];
        if (!file) return; // no selection
        // Basic type validation based on accept attribute (fallback)
        const allowed = ['pdf', 'doc', 'docx', 'txt'];
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (!allowed.includes(ext)) {
            // brief invalid flash
            fileInput.classList.add('invalid-link');
            setTimeout(() => fileInput.classList.remove('invalid-link'), 1200);
            fileInput.value = '';
            return;
        }
        const block = buildFileBlock(file);
        // Insert after input
        fileInput.parentNode.insertBefore(block, fileInput.nextSibling);
        fileInput.style.display = 'none';
        updateStudentUploadButtonVisibility();
    });

    fileInput.dataset.init = 'true';
}

function loadEvaluation() {
    if (evaluationLoaded || !getThesisId()) return;
    const table = document.querySelector('.evaluation-table');
    if (!table) {
        evaluationLoaded = true;
        return;
    }
    fetch(`/api/thesis/${getThesisId()}/evaluation`).then(r => {
        if (!r.ok) throw new Error('Network');
        return r.json();
    }).then(data => {
        if (!data.success || !data.evaluation) return;
        const evalData = data.evaluation;
        // For each input with data-role + data-metric fill value if present
        table.querySelectorAll('input.evaluation-input').forEach(inp => {
            const role = inp.getAttribute('data-role');
            const metric = inp.getAttribute('data-metric');
            if (role && metric && evalData[role] && evalData[role][metric] != null) {
                inp.value = evalData[role][metric];
            }
        });
        evaluationLoaded = true;
    }).catch(err => {
        console.error('Failed to load evaluation', err);
        evaluationLoaded = true; // avoid infinite retries for now
    });
}

function loadProtocol() {
    if (protocolLoaded || !getThesisId()) return;
    const container = document.querySelector('.protocol-container.get-protocol-api');
    if (!container) {
        protocolLoaded = true;
        return;
    }
    fetch(`/api/thesis/${getThesisId()}/protocol`).then(r => {
        if (!r.ok) throw new Error('Network');
        return r.json();
    }).then(data => {
        if (!data.success || !data.exists || !data.protocol) {
            protocolLoaded = true;
            return;
        }
        const p = data.protocol;
        const byId = id => document.getElementById(id);
        const studentNameEl = byId('protocol-student-name');
        const studentIdEl = byId('protocol-student-id');
        const dateTimeEl = byId('protocol-date-time');
        const placeEl = byId('protocol-place');
        const numberEl = byId('protocol-assignment-number');
        const suggestedEl = byId('protocol-suggested-grade');
        const finalEl = byId('protocol-final-grade');
        if (studentNameEl) studentNameEl.textContent = p.studentName || '-';
        if (studentIdEl) studentIdEl.textContent = p.studentIdNumber || '-';
        if (dateTimeEl) {
            dateTimeEl.textContent = p.protocolDate ? formatDate(p.protocolDate) : '-';
        }
        if (placeEl) placeEl.textContent = p.protocolPlace || '-';
        if (numberEl) numberEl.textContent = p.protocolNumberAssignment || '-';
        if (suggestedEl) suggestedEl.textContent = p.suggestedGrade != null ? p.suggestedGrade : '-';
        if (finalEl) finalEl.textContent = p.finalGrade != null ? p.finalGrade : '-';
        const membersWrapper = document.getElementById('protocol-professors');
        if (membersWrapper) {
            // Remove existing member rows (keep header)
            membersWrapper.querySelectorAll('.info-member').forEach(el => el.remove());
            const members = Array.isArray(p.members) ? p.members : [];
            if (members.length === 0) {
                const emptyDiv = document.createElement('div');
                emptyDiv.className = 'info-member';
                const nm = document.createElement('p');
                nm.className = 'member-name';
                nm.textContent = '-';
                emptyDiv.appendChild(nm);
                membersWrapper.appendChild(emptyDiv);
            } else {
                members.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'info-member';
                    const nameP = document.createElement('p');
                    nameP.className = 'member-name';
                    nameP.textContent = m.name;
                    const roleP = document.createElement('p');
                    roleP.className = 'info-badge';
                    roleP.textContent = m.role;
                    div.appendChild(nameP);
                    div.appendChild(roleP);
                    membersWrapper.appendChild(div);
                });
            }
        }
        protocolLoaded = true;
    }).catch(err => {
        console.error('Failed to load protocol', err);
        protocolLoaded = true; // avoid infinite retries for now
    });
}

function initNemertesLinkInput() {
    const input = document.getElementById('nemertes-link-input');
    const saveBtn = document.getElementById('nemertes-upload-button');
    if (!input || !saveBtn) return;

    function ensureScheme(raw) {
        let v = (raw || '').trim();
        if (!v) return null;
        if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
        try {
            new URL(v);
            return v;
        } catch {
            return null;
        }
    }

    function updateSaveButton() {
        const val = input.value.trim();
        const valid = !!ensureScheme(val);
        saveBtn.style.display = valid ? 'inline-flex' : 'none';
    }

    function buildFinalNemertesLink(original, normalized) {
        const container = document.createElement('p');
        container.className = 'link-exist-container final-link nemertes-final-link';
        const a = document.createElement('a');
        a.href = normalized;
        a.className = 'attachment-link';
        a.target = '_blank';
        const icon = document.createElement('span');
        icon.className = 'attachment-icon';
        icon.title = 'Link';
        icon.textContent = '\ud83d\udcce';
        const nameSpan = document.createElement('span');
        nameSpan.className = 'name-content';
        nameSpan.textContent = original;
        const typeSpan = document.createElement('span');
        typeSpan.className = 'attachment-type';
        typeSpan.textContent = 'LINK';
        a.appendChild(icon);
        a.appendChild(nameSpan);
        a.appendChild(typeSpan);
        const xIcon = document.createElement('button');
        xIcon.type = 'button';
        xIcon.className = 'x-icon';
        xIcon.textContent = '×';
        xIcon.title = 'Αφαίρεση συνδέσμου';
        xIcon.addEventListener('click', e => {
            e.preventDefault();
            container.replaceWith(input);
            input.style.display = '';
            saveBtn.style.display = input.value.trim() ? 'inline-flex' : 'none';
            input.focus();
        });
        container.appendChild(a);
        container.appendChild(xIcon);
        return container;
    }

    function finalize() {
        const raw = input.value.trim();
        const norm = ensureScheme(raw);
        if (!norm) {
            input.classList.add('invalid-link');
            setTimeout(() => input.classList.remove('invalid-link'), 1200);
            return;
        }
        const finalBlock = buildFinalNemertesLink(raw, norm);
        input.parentNode.insertBefore(finalBlock, saveBtn.parentNode); // before buttons group
        input.style.display = 'none';
        saveBtn.style.display = 'none';
    }

    input.addEventListener('input', updateSaveButton);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            e.preventDefault();
            finalize();
        }
    });
    saveBtn.addEventListener('click', e => {
        e.preventDefault();
        finalize();
    });
    input.addEventListener('blur', () => {
        const val = input.value.trim();
        if (val && !ensureScheme(val)) {
            input.classList.add('invalid-link');
            setTimeout(() => input.classList.remove('invalid-link'), 1200);
        }
        updateSaveButton();
    });
    updateSaveButton();
}

// Invite Professor Modal (moved out of DOMContentLoaded)
function openInviteModal() {
    const modalContainer = document.querySelector('.invite-professor-modal-container');
    const innerModal = document.querySelector('.invite-professor-modal');

    const rawProfessors = innerModal.getAttribute('data-thesis-professors');
    const professorData = rawProfessors ? JSON.parse(rawProfessors) : [];
    const searchInput = modalContainer.querySelector('.professor-search-bar');
    if (searchInput) setTimeout(() => searchInput.focus(), 40);

    if (innerModal) {
        let currentFetchController = null;
        fetchAvailableProfessors(JSON.stringify(professorData), currentFetchController);
        searchProfessor(innerModal, JSON.stringify(professorData), currentFetchController);
    }

    if (!modalContainer) return;
    modalContainer.classList.add('active');
    document.body.classList.add('no-scroll');

    if (!modalContainer.dataset.backdropBound) {
        modalContainer.dataset.backdropBound = 'true';
        modalContainer.addEventListener('mousedown', (e) => {
            if (e.target === modalContainer) closeInviteModal();
        });
    }
}

function debounce(fn, delay = 300) {
    let id;
    return (...args) => {
        clearTimeout(id);
        id = setTimeout(() => fn(...args), delay);
    };
}


function closeInviteModal() {
    const modalContainer = document.querySelector('.invite-professor-modal-container.active');
    if (!modalContainer) return;
    modalContainer.classList.remove('active');
    document.body.classList.remove('no-scroll');
    const searchInput = modalContainer.querySelector('.professor-search-bar');
    if (searchInput) searchInput.value = '';
}

function initInviteModal() {
    const newInvitationButton = document.getElementById('new-invitation-button');
    if (newInvitationButton && !newInvitationButton.dataset.inviteBound) {
        newInvitationButton.dataset.inviteBound = 'true';
        newInvitationButton.addEventListener('click', (e) => {
            e.preventDefault();
            openInviteModal();
        });
    }
    const inviteCloseBtn = document.querySelector('.invite-professor-modal .close-modal');
    if (inviteCloseBtn && !inviteCloseBtn.dataset.inviteBound) {
        inviteCloseBtn.dataset.inviteBound = 'true';
        inviteCloseBtn.addEventListener('click', (e) => {
            e.preventDefault();
            closeInviteModal();
        });
    }
    if (!document.body.dataset.inviteEscBound) {
        document.body.dataset.inviteEscBound = 'true';
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeInviteModal();
        });
    }
}

function selectProfessor(professorElelement) {
    if (!professorElelement) return;
    const rootList = professorElelement.closest('.professors-list');
    if (!rootList) return;
    if (professorElelement.classList.contains('selected')) {
        professorElelement.classList.remove('selected');
        return;
    }
    professorElelement.classList.add('selected');
}

function searchProfessor(innerModal, existingProfessors,currentFetchController) {
    const searchInput = innerModal.querySelector('.professor-search-bar');
    if (!searchInput || searchInput.dataset.bound) return;
    searchInput.dataset.bound = 'true';
    const runSearch = () => {
        fetchAvailableProfessors(existingProfessors, currentFetchController, searchInput.value.trim());
    };
    searchInput.addEventListener('input', debounce(runSearch, 300));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Escape') {
            searchInput.value = '';
            fetchAvailableProfessors(existingProfessors,currentFetchController, '');
        } else if (searchInput.value === '') {
            fetchAvailableProfessors(existingProfessors,currentFetchController, '');
        }
    });
}


async function fetchAvailableProfessors(existingProfessors, currentFetchController, professorNameSearchTerm = '') {
    const professorListElement = document.querySelector('.professors-list');
    const noResultsElement = document.querySelector('.professors-no-results');
    const loadingElement = document.querySelector('.professors-loading');

    if (!professorListElement) {
        return;
    }
    if (currentFetchController) currentFetchController.abort();
    currentFetchController = new AbortController();


    if (noResultsElement) {
        noResultsElement.style.display = 'none';
        noResultsElement.classList.remove('error');
        noResultsElement.textContent = 'Δεν βρέθηκαν αποτελέσματα';
    }
    if (loadingElement) {
        loadingElement.style.display = 'block';
        loadingElement.classList.remove('error');
        loadingElement.textContent = 'Φόρτωση...';
    }

    professorListElement.style.display = 'none';
    professorListElement.innerHTML = '';

    const queryString = professorNameSearchTerm ? ('?professorNameSearch=' + encodeURIComponent(professorNameSearchTerm)) : '';


    try {
        const resp = await fetch(`/api/professors/available/${existingProfessors}${queryString}`, {signal: currentFetchController.signal});
        if (!resp.ok) throw new Error('Network');
        const data = await resp.json();
        if (currentFetchController.signal.aborted) return;
        const professors = data.professors || [];

        if (loadingElement) {
            loadingElement.style.display = 'none';
        }
        if (professors.length === 0) {
            professorListElement.innerHTML = '';
            professorListElement.style.display = 'none';
            if (noResultsElement) {
                noResultsElement.textContent = 'Δεν βρέθηκαν αποτελέσματα';
                noResultsElement.classList.remove('error');
                noResultsElement.style.display = 'block';
            }
            return;
        }
        professorListElement.innerHTML = '';
        professorListElement.style.display = 'block';
        professors.forEach(professor => {
            const li = document.createElement('li');
            li.className = 'professor-item';
            li.textContent = professor.fullName;
            li.dataset.userId = professor.userId;
            li.addEventListener('click', () => selectProfessor(li));
            professorListElement.appendChild(li);
        });
    } catch (err) {
        if (err.name === 'AbortError') return;
        professorListElement.innerHTML = '';
        professorListElement.style.display = 'none';
        if (loadingElement) loadingElement.style.display = 'none';
        if (noResultsElement) {
            noResultsElement.textContent = 'Σφάλμα φόρτωσης';
            noResultsElement.classList.add('error');
            noResultsElement.style.display = 'block';
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    getThesisId();
    document.querySelectorAll('.tab-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            if (location.hash !== '#' + tabId) history.replaceState(null, '', '#' + tabId);
            activateTab(tabId);
        });
    });
    window.addEventListener('hashchange', () => {
        const h = (location.hash || '').slice(1);
        activateTab(h);
    });

    const newNoteButton = document.getElementById('new-note-button');
    if (newNoteButton) newNoteButton.addEventListener('click', e => {
        e.preventDefault();
        showNewNote();
    });
    const cancelNewNoteButton = document.getElementById('cancel-new-note-button');
    if (cancelNewNoteButton) cancelNewNoteButton.addEventListener('click', e => {
        e.preventDefault();
        cancelNewNote();
    });

    const newMeetingButton = document.getElementById('new-meeting-button');
    if (newMeetingButton) newMeetingButton.addEventListener('click', e => {
        e.preventDefault();
        showNewMeeting();
    });
    const cancelNewMeetingButton = document.getElementById('cancel-new-meeting-button');
    if (cancelNewMeetingButton) cancelNewMeetingButton.addEventListener('click', e => {
        e.preventDefault();
        cancelNewMeeting();
    });

    const initial = (location.hash || '').slice(1);
    activateTab(initial || 'info');

    if (document.getElementById('evaluation')) {
        mobileGradeNavigation();
        initLinkAddition();
        initTemporaryReportFile();
        updateStudentUploadButtonVisibility();
        initNemertesLinkInput();
    }


});
