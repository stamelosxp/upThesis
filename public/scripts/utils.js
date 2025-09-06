export function formatDate(dateString) {
    if (!dateString) {
        return '';
    }
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return '';
    const day = String(dateObj.getDate()).padStart(2, '0');
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const year = dateObj.getFullYear();
    return `${day}/${month}/${year}`;
}

// Debounce utility
export function debounce(fn, delay) {
    let timer = null;
    return function (...args) {
        clearTimeout(timer);
        timer = setTimeout(() => fn.apply(this, args), delay);
    };
}

export function alertPopUP(message, type) {
    const notificationPopUp = document.createElement('div');
    notificationPopUp.classList.add('popup-notification-message-container', type);

    const messageP = document.createElement('p');
    messageP.className = 'popup-notification-message';
    messageP.textContent = message;

    const closePopUp = document.createElement('button');
    closePopUp.id = 'popup-close'
    closePopUp.classList.add('close-modal', 'popup');
    closePopUp.innerHTML = '&times;';

    closePopUp.addEventListener('click', () => {
        notificationPopUp.classList.remove('show');
        messageP.textContent = '';
    })

    notificationPopUp.appendChild(messageP);
    notificationPopUp.appendChild(closePopUp);
    document.body.appendChild(notificationPopUp);

    // Show the popup
    setTimeout(() => {
        notificationPopUp.classList.add('show');
    }, 100); // Slight delay to allow for CSS transition

    // Hide the popup after 5 seconds
    setTimeout(() => {
        notificationPopUp.classList.remove('show');
        messageP.textContent = '';
        // Remove the popup from the DOM after the transition
        setTimeout(() => {
            document.body.removeChild(notificationPopUp);
        }, 300); // Match this duration with your CSS transition duration
    }, 3000);

}

export function toggleExpandCollapseView(collapsedContent, collapseButton, expandedContent, expandButton, checkEditMode = false) {
    if (collapsedContent && expandedContent && expandButton && collapseButton) {
        expandButton.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            collapsedContent.classList.add("hidden");
            expandedContent.classList.remove("hidden");

        };

        collapseButton.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            if (checkEditMode) {
                if (collapseButton.classList.contains('edit-mode')) {
                    alert('Δεν έχετε ολοκληρώσει την επεξεργασία του θέματος. Παρακαλώ αποθηκεύστε ή ακυρώστε την επεξεργασία πριν προσπαθήσετε να κλείσετε το θέμα.');
                    return;
                }
            }
            collapsedContent.classList.remove("hidden");
            expandedContent.classList.add("hidden");
        };
    }
}
