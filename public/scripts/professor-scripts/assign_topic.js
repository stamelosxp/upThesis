document.addEventListener('DOMContentLoaded', () => {
    // AbortController to cancel in-flight fetches when new search starts
    let currentFetchController = null;

    function openAssignModal(modalContainer) {
        if (!modalContainer) return;
        modalContainer.classList.add('active');
        document.body.classList.add('no-scroll');
        const searchInput = modalContainer.querySelector('.student-search-bar');
        if (searchInput) setTimeout(() => searchInput.focus(), 40);
        const innerModal = modalContainer.querySelector('.assign-student-modal');
        if (innerModal) {
            fetchAvailableStudents(innerModal); // initial full load
            wireSearch(innerModal);
        }
        // Backdrop (outside click) close support; bind once
        if (!modalContainer.dataset.backdropBound) {
            modalContainer.dataset.backdropBound = 'true';
            modalContainer.addEventListener('mousedown', (e) => {
                // If click strictly on the container (backdrop), not inside actual modal content
                if (e.target === modalContainer) {
                    closeAssignModal(modalContainer);
                }
            });
        }
    }

    function closeAssignModal(modalContainer) {
        if (!modalContainer) return;
        modalContainer.classList.remove('active');
        document.body.classList.remove('no-scroll');
        const searchInput = modalContainer.querySelector('.student-search-bar');
        const selected = modalContainer.querySelector('.student-item.selected');
        if (searchInput) searchInput.value = '';
        if (selected) selected.classList.remove('selected');
    }

    function selectStudent(studentEl) {
        if (!studentEl) return;
        const rootList = studentEl.closest('.student-list');
        if (!rootList) return;
        const prev = rootList.querySelector('.student-item.selected');
        if (prev && prev !== studentEl) prev.classList.remove('selected');
        studentEl.classList.add('selected');
    }

    function wireSearch(innerModal) {
        const searchInput = innerModal.querySelector('.student-search-bar');
        if (!searchInput || searchInput.dataset.bound) return;
        searchInput.dataset.bound = 'true';
        const runSearch = () => {
            fetchAvailableStudents(innerModal, searchInput.value.trim());
        };
        searchInput.addEventListener('input', debounce(runSearch, 300));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                fetchAvailableStudents(innerModal, '');
            } else if (searchInput.value === '') {
                fetchAvailableStudents(innerModal, '');
            }
        });
    }

    async function fetchAvailableStudents(innerModal, studentNameSearchTerm = '') {
        const listEl = innerModal.querySelector('.student-list');
        const noResultsEl = innerModal.querySelector('.student-no-results');
        if (!listEl) return;

        if (currentFetchController) currentFetchController.abort();
        currentFetchController = new AbortController();

        // Reset visibility
        if (noResultsEl) {
            noResultsEl.style.display = 'none';
            noResultsEl.classList.remove('error');
            noResultsEl.textContent = 'Δεν βρέθηκαν αποτελέσματα';
        }
        listEl.style.display = 'block';
        listEl.innerHTML = '<li class="student-item loading">Φόρτωση...</li>';

        const queryString = studentNameSearchTerm ? ('?studentNameSearch=' + encodeURIComponent(studentNameSearchTerm)) : '';

        try {
            const resp = await fetch(`/professor/students/available${queryString}`, { signal: currentFetchController.signal });
            if (!resp.ok) throw new Error('Network');
            const data = await resp.json();
            if (currentFetchController.signal.aborted) return;
            const students = data.students || [];
            if (students.length === 0) {
                listEl.innerHTML = '';
                listEl.style.display = 'none';
                if (noResultsEl) {
                    noResultsEl.textContent = 'Δεν βρέθηκαν αποτελέσματα';
                    noResultsEl.classList.remove('error');
                    noResultsEl.style.display = 'block';
                }
                return;
            }
            listEl.innerHTML = '';
            listEl.style.display = 'block';
            if (noResultsEl) {
                noResultsEl.style.display = 'none';
                noResultsEl.classList.remove('error');
                noResultsEl.textContent = 'Δεν βρέθηκαν αποτελέσματα'; // reset to default
            }
            students.forEach(st => {
                const li = document.createElement('li');
                li.className = 'student-item';
                li.textContent = st.fullName;
                li.dataset.userId = st.userId;
                li.addEventListener('click', () => selectStudent(li));
                listEl.appendChild(li);
            });
        } catch (err) {
            if (err.name === 'AbortError') return;
            listEl.innerHTML = '';
            listEl.style.display = 'none';
            if (noResultsEl) {
                noResultsEl.textContent = 'Σφάλμα φόρτωσης';
                noResultsEl.classList.add('error');
                noResultsEl.style.display = 'block';
            }
        }
    }

    function debounce(fn, delay = 300) {
        let id; return (...args) => { clearTimeout(id); id = setTimeout(() => fn(...args), delay); };
    }

    document.querySelectorAll('.topic-item-expanded').forEach(expanded => {
        const assignmentInput = expanded.querySelector('.assignment');
        const modalContainer = expanded.querySelector('.assign-student-modal-container');
        if (!assignmentInput || !modalContainer) return;

        assignmentInput.addEventListener('click', (e) => {
            e.preventDefault();
            openAssignModal(modalContainer);
        });

        const closeBtn = modalContainer.querySelector('.close-modal');
        if (closeBtn) closeBtn.addEventListener('click', () => closeAssignModal(modalContainer));

        const assignBtn = modalContainer.querySelector('.modal-footer .standard-button');
        if (assignBtn) {
            assignBtn.addEventListener('click', () => {
                const selected = modalContainer.querySelector('.student-item.selected');
                if (!selected) {
                    alert('Παρακαλώ επιλέξτε φοιτητή.');
                    return;
                }
                assignmentInput.value = selected.textContent.trim();
                closeAssignModal(modalContainer);
            });
        }
    });

    // Global ESC key closes any active assign modals
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.assign-student-modal-container.active').forEach(container => closeAssignModal(container));
        }
    });
});
