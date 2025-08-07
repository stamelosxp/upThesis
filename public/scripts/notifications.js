const notificationItems = document.querySelectorAll('.notification-content');
notificationItems.forEach(function (notificationItem) {
    notificationItem.onclick = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (notificationItem.classList.contains('collapsed')) {
            notificationItem.classList.remove('collapsed');
            notificationItem.add('expanded');
        } else {
            notificationItem.classList.remove('expanded');
            notificationItem.classList.add('collapsed');
        }

    }

});