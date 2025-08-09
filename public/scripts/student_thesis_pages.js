document.querySelectorAll(".tab-link").forEach((link) => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        // Remove 'active' from all links and all tab contents
        document
            .querySelectorAll(".tab-link")
            .forEach((l) => l.classList.remove("active"));
        document
            .querySelectorAll(".tab-content")
            .forEach((c) => c.classList.remove("active"));
        // Add 'active' to clicked link and its content
        this.classList.add("active");
        const tabId = this.attributes["data-tab"].value;
        document.getElementById(tabId).classList.add("active");
    });
});