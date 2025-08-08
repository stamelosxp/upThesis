const invitationItems = document.querySelectorAll('.topic-item');
invitationItems.forEach(function (invitationItem) {
    const collapsedContent = invitationItem.querySelector(".topic-item-collapsed");
    const expandedContent = invitationItem.querySelector(".topic-item-expanded");
    const expandButton = invitationItem.querySelector(".expand-button");
    const collapseButton = invitationItem.querySelector(".collapse-button");
    const liItem = invitationItem; // Use the root element itself

    if (collapsedContent && expandedContent && expandButton && collapseButton) {

        expandButton.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            collapsedContent.style.display = "none";
            expandedContent.style.display = "flex";
            liItem.style.padding = "0";
        };

        collapseButton.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            collapsedContent.style.display = "flex";
            expandedContent.style.display = "none";
            liItem.style.padding = "1.5rem 2rem";
        };
    }
});