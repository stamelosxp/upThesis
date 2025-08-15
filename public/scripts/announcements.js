function formatDate(rawDate) {
    const date = new Date(rawDate);
    if (isNaN(date.getTime())) return rawDate;
    return String(date.getDate()).padStart(2, '0') + '/' + String(date.getMonth() + 1).padStart(2, '0') + '/' + date.getFullYear();
}

function formatDateTime(rawDate) {
    const d = new Date(rawDate);
    if (isNaN(d.getTime())) return rawDate || '';
    const date = String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear();
    const time = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    return date + ' ' + time;
}

function buildAnnouncementItem(announcement) {
    const createdDateFormatted = formatDate(announcement.createdDate);
    const li = document.createElement('li');
    li.className = 'announcement-item';
    li.dataset.id = announcement.id;
    const wrapper = document.createElement('div');
    wrapper.className = 'announcement-item-collapsed';
    const header = document.createElement('div');
    header.className = 'announcement-collapsed-header';
    const title = document.createElement('h3');
    title.className = 'announcement-header';
    title.textContent = announcement.thesisTitle || '';
    if (announcement.hasModified) {
        const badge = document.createElement('span');
        badge.className = 'status-badge pending';
        badge.textContent = 'Τροποποιήθηκε';
        title.appendChild(badge);
    }
    const dateEl = document.createElement('p');
    dateEl.className = 'simple-badge';
    dateEl.textContent = createdDateFormatted;
    header.appendChild(title);
    header.appendChild(dateEl);
    const expand = document.createElement('small');
    expand.className = 'expand-button';
    expand.textContent = 'Κλικ για άνοιγμα';
    wrapper.appendChild(header);
    wrapper.appendChild(expand);
    li.appendChild(wrapper);
    return li;
}

document.addEventListener('DOMContentLoaded', () => {
    const announcementsListElement = document.getElementById('announcements-list');
    const paginationNavElement = document.getElementById('pagination');
    const paginationListElement = document.getElementById('pagination-list');
    const emptyStateElement = document.getElementById('announcements-empty');

    // Modal elements
    const modalContainer = document.querySelector('.announcement-item-modal-container');
    const modalCloseBtn = modalContainer ? modalContainer.querySelector('.close-modal') : null;
    const modalBody = modalContainer ? modalContainer.querySelector('.modal-body') : null;

    function openModal(announcement) {
        if (!modalContainer || !modalBody || !announcement) return;
        const setValue = (el, value) => {
            if (!el) return;
            el.style.display = '';
            el.textContent = value || '';
        };

        const groupTitle = modalBody.querySelector('.modal-content-group.title');
        const groupDescription = modalBody.querySelector('.modal-content-group.description');
        const groupDate = modalBody.querySelector('.modal-content-group.date');
        const groupPlace = modalBody.querySelector('.modal-content-group.place');
        const groupStudent = modalBody.querySelector('.modal-content-group.student');
        const groupProfessors = modalBody.querySelector('.modal-content-group.professors');

        if (groupTitle) setValue(groupTitle.querySelector('.modal-group-value, .modal-content-value'), announcement.thesisTitle);
        if (groupDescription) setValue(groupDescription.querySelector('.modal-group-value, .modal-content-value'), announcement.description);
        if (groupDate) {
            const dateEl = groupDate.querySelector('.modal-group-value, .modal-content-value');
            const formatted = announcement.presentationDateTime ? formatDateTime(announcement.presentationDateTime) : '';
            setValue(dateEl, formatted);
        }
        if (groupPlace) {
            const physicalEl = groupPlace.querySelector('.modal-group-value.physical, .modal-content-value.physical');
            const onlineEl = groupPlace.querySelector('.modal-group-value.online, .modal-content-value.online');
            if (announcement.physicalPlace) {
                setValue(physicalEl, announcement.physicalPlace);
            } else {
                physicalEl.style.display = 'none';
            }
            if (onlineEl) {
                const onlineVal = announcement.onlinePlace;
                if (!onlineVal) {
                    onlineEl.style.display = 'none';
                } else {
                    const a = document.createElement('a');
                    a.href = onlineVal;
                    a.target = '_blank';
                    a.rel = 'noopener noreferrer';
                    a.textContent = onlineVal;
                    onlineEl.appendChild(a);
                }
            }
        }
        if (groupStudent) setValue(groupStudent.querySelector('.modal-group-value, .modal-content-value'), announcement.studentName);
        if (groupProfessors) {
            const supervisorEl = groupProfessors.querySelector('.supervisor');
            const memberAEl = groupProfessors.querySelector('.member-a');
            const memberBEl = groupProfessors.querySelector('.member-b');
            const members = Array.isArray(announcement.members) ? announcement.members : [];
            setValue(supervisorEl, announcement.supervisorName);
            setValue(memberAEl, members[0]);
            setValue(memberBEl, members[1]);
            groupProfessors.querySelectorAll('.announcement-member').forEach(row => row.style.display = '');
        }
        modalContainer.classList.add('active');
    }

    function closeModal() {
        if (!modalContainer || !modalBody) return;
        modalContainer.classList.remove('active');
        modalBody.querySelectorAll('.modal-content-group').forEach(group => {
            group.style.display = '';
            group.querySelectorAll('.modal-group-value, .modal-content-value, .announcement-member p:not(.simple-badge)').forEach(val => {
                val.textContent = '';
                val.style.display = '';
            });
            group.querySelectorAll('.announcement-member').forEach(row => row.style.display = '');
        });
    }

    // Backdrop click to close
    if (modalContainer) {
        modalContainer.addEventListener('mousedown', (e) => {
            if (e.target === modalContainer) closeModal();
        });
    }
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);

    // expose to inner functions
    // (Using function declarations in same scope so they are accessible below)
    if (!announcementsListElement || !paginationNavElement) return;
    if (emptyStateElement) emptyStateElement.style.display = 'none';

    let currentPageNumber = 0;
    let totalPagesCount = 1;
    const basePath = window.location.pathname;
    let loading = false;
    const pageCache = new Map(); // page -> announcements array

    function renderAnnouncements(items) {
        if (!Array.isArray(items)) items = [];
        if (!items.length) {
            announcementsListElement.innerHTML = '';
            if (emptyStateElement) emptyStateElement.style.display = 'block';
            return;
        }
        if (emptyStateElement) emptyStateElement.style.display = 'none';
        announcementsListElement.innerHTML = '';
        for (const a of items) announcementsListElement.appendChild(buildAnnouncementItem(a));
        attachExpandHandlers(items);
    }

    function createPageLink(pageNumber, label, extraClass) {
        const li = document.createElement('li');
        li.className = 'page-item' + (extraClass ? ' ' + extraClass : '');
        const link = document.createElement('a');
        link.href = `${basePath}?page=${pageNumber}`;
        link.dataset.page = pageNumber;
        link.textContent = label;
        if (pageNumber === currentPageNumber) {
            link.setAttribute('aria-current', 'page');
            li.classList.add('active');
        }
        li.appendChild(link);
        return li;
    }

    function renderPagination() {
        if (totalPagesCount <= 1) {
            paginationNavElement.style.display = 'none';
            return;
        }
        paginationNavElement.style.display = 'flex';
        paginationListElement.innerHTML = '';
        const windowSize = 3;
        let start = Math.max(1, currentPageNumber - Math.floor(windowSize / 2));
        let end = start + windowSize - 1;
        if (end > totalPagesCount) {
            end = totalPagesCount;
            start = Math.max(1, end - windowSize + 1);
        }
        if (currentPageNumber > 1) paginationListElement.appendChild(createPageLink(currentPageNumber - 1, 'Προηγούμενη', 'prev'));
        if (start > 1) {
            paginationListElement.appendChild(createPageLink(1, '1'));
            if (start > 2) {
                const ell = document.createElement('li');
                ell.className = 'page-item ellipsis';
                ell.innerHTML = '<span>…</span>';
                paginationListElement.appendChild(ell);
            }
        }
        for (let p = start; p <= end; p++) paginationListElement.appendChild(createPageLink(p, String(p), p === currentPageNumber ? 'active' : ''));
        if (end < totalPagesCount) {
            if (end < totalPagesCount - 1) {
                const ell2 = document.createElement('li');
                ell2.className = 'page-item ellipsis';
                ell2.innerHTML = '<span>…</span>';
                paginationListElement.appendChild(ell2);
            }
            paginationListElement.appendChild(createPageLink(totalPagesCount, String(totalPagesCount)));
        }
        if (currentPageNumber < totalPagesCount) paginationListElement.appendChild(createPageLink(currentPageNumber + 1, 'Επόμενη', 'next'));
    }

    function attachExpandHandlers(items) {
        announcementsListElement.querySelectorAll('.announcement-item .expand-button').forEach(btn => {
            btn.addEventListener('click', () => {
                const parentLi = btn.closest('.announcement-item');
                if (!parentLi) return;
                const id = parentLi.dataset.id;
                const found = items.find(a => String(a.id) === id);
                if (found) openModal(found);
            });
        });
    }

    async function fetchPage(pageNumber) {
        if (loading) return;
        if (pageNumber < 1) pageNumber = 1;
        loading = true;
        try {
            if (pageCache.has(pageNumber)) {
                const cached = pageCache.get(pageNumber);
                currentPageNumber = pageNumber;
                renderAnnouncements(cached.items);
                totalPagesCount = cached.totalPages;
                renderPagination();
            } else {
                const response = await fetch(`/api/announcements?page=${pageNumber}`);
                if (!response.ok) throw new Error('network');
                const payload = await response.json();
                if (!payload.success) throw new Error('api');
                currentPageNumber = payload.pagination.currentPage;
                totalPagesCount = payload.pagination.totalPages;
                pageCache.set(currentPageNumber, {items: payload.announcements, totalPages: totalPagesCount});
                renderAnnouncements(payload.announcements);
                renderPagination();
            }
            const url = new URL(window.location.href);
            url.searchParams.set('page', currentPageNumber);
            window.history.pushState({page: currentPageNumber}, '', url);
        } catch (e) {
            console.error('Failed page load', e);
            renderAnnouncements([]);
        } finally {
            loading = false;
        }
    }

    paginationNavElement.addEventListener('click', e => {
        const anchor = e.target.closest('a[data-page]');
        if (!anchor) return;
        e.preventDefault();
        const pageNumber = parseInt(anchor.dataset.page, 10);
        if (!isNaN(pageNumber)) fetchPage(pageNumber);
    });

    window.addEventListener('popstate', () => {
        const pageNumber = parseInt(new URL(window.location.href).searchParams.get('page') || '1', 10);
        if (pageNumber !== currentPageNumber) fetchPage(pageNumber);
    });


    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeModal();
    });

    const initialPage = parseInt(new URL(window.location.href).searchParams.get('page') || '1', 10);
    fetchPage(initialPage);
});
