function popUpAlert(message, type) {
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

function initDatePicker() {
    const datePicker = document.querySelector(".events-date-picker");
    if (datePicker) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const todayStr = `${yyyy}-${mm}-${dd}`;
        // Set value and min attribute
        datePicker.value = todayStr;
        datePicker.setAttribute("min", todayStr);
        const eventsList = document.getElementById("events-list");
        const noEventsData = eventsList.querySelector('.no-data');
        if (noEventsData) {
            const spanDate = noEventsData.querySelector('#chosen-date');
            if (spanDate) {
                //will be removed when events are added
                spanDate.textContent = `${dd}/${mm}/${yyyy}`;
            }
        }

        datePicker.onchange = function () {
            const selectedDate = new Date(this.value);
            const yyyy = selectedDate.getFullYear();
            const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
            const dd = String(selectedDate.getDate()).padStart(2, "0");
            // Fetch and display events for the selected date
            // For now, just update the no events message
            if (noEventsData) {
                const spanDate = noEventsData.querySelector('#chosen-date');
                if (!spanDate) return;
                //will be removed when events are added
                spanDate.textContent = `${dd}/${mm}/${yyyy}`;
            }
        }
    }
}

function toggleNotificationsView() {
    const notificationItems = document.querySelectorAll('.notification-item');
    notificationItems.forEach(function (notificationItem) {
        notificationItem.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            const content = notificationItem.querySelector('.notification-content');
            if (!content) return;
            if (content.classList.contains('collapsed')) {
                content.classList.remove('collapsed');
                content.classList.add('expanded');
            } else {
                content.classList.remove('expanded');
                content.classList.add('collapsed');
            }
        }

    });
}

function clearNotifications() {
    const notificationList = document.getElementById('notification-list');
    const hasNoData = !!notificationList.querySelector('.no-data');

    if (hasNoData) {
        return;
    }
    if (notificationList && notificationList.children.length > 0) {
        notificationList.innerHTML = '';
    }

    const noData = document.createElement('p');
    noData.textContent = 'Δεν υπάρχουν ειδοποιήσεις';
    noData.className = 'no-data';
    notificationList.appendChild(noData);

    const message = 'Όλες οι ειδοποιήσεις διαγράφηκαν';
    popUpAlert(message, 'green');

    //send request to server to clear notifications
}

document.addEventListener("DOMContentLoaded", function () {
    initDatePicker();
    toggleNotificationsView();

    const clearNotificationsBtn = document.getElementById('clear-notifications');
    if (clearNotificationsBtn) {
        clearNotificationsBtn.addEventListener('click', clearNotifications);
    }

});
