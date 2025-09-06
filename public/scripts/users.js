let searchFetchController = null;


function openImportModal() {
    const modalContainer = document.querySelector('.modal-container');
    if (!modalContainer) return;
    modalContainer.classList.add('active');
    document.body.classList.add('no-scroll');


    const closeButton = modalContainer.querySelector('.close-modal');
    if (closeButton && !closeButton.dataset.bound) {
        closeButton.dataset.bound = 'true';
        closeButton.addEventListener('click', () => closeImportModal(modalContainer));
    }
}

function closeImportModal(modalContainer) {
    if (!modalContainer) return;
    modalContainer.classList.remove('active');
    document.body.classList.remove('no-scroll');
}

function greekBadge(userBadge) {
    let badgeText = '';
    switch (userBadge) {
        case 'student':
            badgeText = 'Φοιτητής';
            break;
        case 'professor':
            badgeText = 'Καθηγητής';
            break;
        case 'secretary':
            badgeText = 'Γραμματεία';
            break;
    }
    return badgeText;
}

function renderUser(user) {
    const userItem = document.createElement('a');
    userItem.href = `/user/${user.username}`;
    userItem.className = 'user-item';

    const divContent = document.createElement('div');
    divContent.className = 'user-item-content';

    const profilePreview = document.createElement('div');
    profilePreview.className = 'profile-photo-preview';

    const profileImg = document.createElement('img');
    profileImg.src = user.profilePhoto;
    profileImg.alt = 'Profile Photo';
    profileImg.className = 'profile-photo-img';

    profilePreview.appendChild(profileImg);

    const groupItemInfo = document.createElement('div');
    groupItemInfo.className = 'group-item-info';

    const nameP = document.createElement('p');
    nameP.className = 'user-item-name';
    nameP.textContent = `${user.lastName} ${user.firstName}`;
    groupItemInfo.appendChild(nameP);

    const badgeP = document.createElement('p');
    badgeP.className = 'info-badge';
    badgeP.textContent = greekBadge(user.role);

    groupItemInfo.appendChild(badgeP);

    divContent.appendChild(profilePreview);
    divContent.appendChild(groupItemInfo);

    userItem.appendChild(divContent);

    return userItem;

}

function userSearch(inputValue) {
    if (searchFetchController) searchFetchController.abort();
    searchFetchController = new AbortController();
    const signal = searchFetchController.signal;
    fetchUsers(inputValue, signal)
        .then((data) => {
            const usersList = document.getElementById('users-list');
            if (usersList) {
                usersList.innerHTML = '';
                if (data && data.length > 0) {
                    data.forEach(user => {
                        usersList.appendChild(renderUser(user));
                    });
                } else {
                    usersList.innerHTML = '';
                    const noData = document.createElement('p');
                    noData.textContent = 'Δεν βρέθηκαν χρήστες';
                    noData.className = 'no-data';
                    usersList.appendChild(noData);
                }
            }

        })
        .catch((err) => {
            if (err.name === 'AbortError') return;
            const thesesList = document.getElementById('users-list');
            if (thesesList) {
                thesesList.innerHTML = '<p class="no-data error">Σφάλμα φόρτωσης δεδομένων. Προσπαθήστε ξανά</p>';
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

async function fetchUsers(inputValue, signal) {
    try {
        const response = await fetch(`/api/users?q=${encodeURIComponent(inputValue)}`, {signal});

        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const data = await response.json();

        return data.users;
    } catch (err) {
        if (err.name !== 'AbortError') {
            throw err;
        }
    }
}


document.addEventListener('DOMContentLoaded', () => {
    const importUsersButton = document.getElementById('import-users');
    if (importUsersButton) {
        importUsersButton.addEventListener('click', openImportModal);
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            document.querySelectorAll('.modal-container.active').forEach(container => closeImportModal(container));
        }
    });

    const searchInput = document.getElementById('search-users');
    if (searchInput && !searchInput.dataset.bound) {
        searchInput.dataset.bound = 'true';
        const runSearch = () => {
            userSearch(searchInput.value.trim());
        };
        searchInput.addEventListener('input', debounce(runSearch, 300));
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                userSearch(searchInput.value);
            } else if (searchInput.value === '') {
                searchInput.value = '';
                userSearch(searchInput.value);
            }
        });
    }
})