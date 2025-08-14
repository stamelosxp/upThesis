const topicItems = document.querySelectorAll('.topic-item');
topicItems.forEach(function (topicItem) {
    const collapsedContent = topicItem.querySelector(".topic-item-collapsed");
    const expandedContent = topicItem.querySelector(".topic-item-expanded");
    const expandButton = topicItem.querySelector(".expand-button");
    const collapseButton = topicItem.querySelector(".collapse-button");
    const liItem = topicItem; // Use the root element itself

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
