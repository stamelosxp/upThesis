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