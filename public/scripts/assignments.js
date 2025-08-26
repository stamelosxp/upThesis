document.addEventListener('DOMContentLoaded', function() {
    var filtersIcon = document.querySelector('.filters-icon');
    var filtersContainer = document.getElementById('assignments-filters-container');
    var closeBtn = document.getElementById('close-mobile-filters');

    function updateMobileFloating() {
        if (window.innerWidth <= 1350) {
            filtersContainer.classList.add('mobile-floating');
            filtersContainer.classList.remove('show'); // Hide by default on resize
        } else {
            filtersContainer.classList.remove('mobile-floating');
            filtersContainer.classList.remove('show');
        }
    }

    updateMobileFloating();
    window.addEventListener('resize', updateMobileFloating);

    if (filtersIcon && filtersContainer && closeBtn) {
        filtersIcon.addEventListener('click', function() {
            if (filtersContainer.classList.contains('mobile-floating')) {
                // Get icon position relative to viewport
                var iconRect = filtersIcon.getBoundingClientRect();
                // Calculate top position (add scroll offset)
                var topPos = iconRect.top + window.scrollY;
                filtersContainer.style.top = topPos + 'px';
                filtersContainer.classList.add('show');
            }
        });
        closeBtn.addEventListener('click', function() {
            filtersContainer.classList.remove('show');
            filtersContainer.style.top = '';
        });
        document.addEventListener('mousedown', function(e) {
            if (
                filtersContainer.classList.contains('mobile-floating') &&
                filtersContainer.classList.contains('show') &&
                !filtersContainer.contains(e.target) &&
                e.target !== filtersIcon
            ) {
                filtersContainer.classList.remove('show');
                filtersContainer.style.top = '';
            }
        });
    }
});
