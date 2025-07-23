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

// Add this to your JavaScript file or in a <script> tag
document.addEventListener("DOMContentLoaded", function () {
  const noteItems = document.querySelectorAll(".note-item");
  const noteOverlay = document.getElementById("noteOverlay");
  const closeModal = document.getElementById("closeNoteModal");
  const modalTitle = document.getElementById("modalNoteTitle");
  const modalContent = document.getElementById("modalNoteContent");

  // Function to open modal
  function openModal(title, content, date) {
    modalTitle.textContent = title || "Χωρίς Τίτλο";
    modalContent.textContent = content || "Δεν υπάρχει περιεχόμενο";
    noteOverlay.classList.add("active");
    // Prevent body scroll when modal is open
    document.body.style.overflow = "hidden";
  }

  // Function to close modal
  function closeModalFunction() {
    noteOverlay.classList.remove("active");
    // Restore body scroll
    document.body.style.overflow = "auto";
  }

  // Open modal when clicking on note item
  noteItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      const title = this.dataset.noteTitle;
      const content = this.dataset.noteContent;
      const date = this.dataset.noteDate;

      openModal(title, content, date);
    });
  });

  // Close modal when clicking close button
  if (closeModal) {
    closeModal.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      closeModalFunction();
    });
  }

  // Close modal when clicking outside the modal content
  noteOverlay.addEventListener("click", function (e) {
    if (e.target === noteOverlay) {
      closeModalFunction();
    }
  });

  // Close modal when pressing Escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && noteOverlay.classList.contains("active")) {
      closeModalFunction();
    }
  });

  // Handle note form submission (if you need to add new notes)
  const noteForm = document.querySelector(".new-note-container form");
  if (noteForm) {
    noteForm.addEventListener("submit", function (e) {
      e.preventDefault();

      const titleInput = document.getElementById("noteTitle");
      const contentInput = document.getElementById("noteContent");

      if (titleInput.value.trim() && contentInput.value.trim()) {
        // Add your form submission logic here
        console.log("New note:", {
          title: titleInput.value.trim(),
          content: contentInput.value.trim(),
        });

        // Clear form after submission
        titleInput.value = "";
        contentInput.value = "";
      }
    });

    // Handle clear button
    const clearButton = noteForm.querySelector(".clear-button");
    if (clearButton) {
      clearButton.addEventListener("click", function (e) {
        e.preventDefault();
        document.getElementById("noteTitle").value = "";
        document.getElementById("noteContent").value = "";
      });
    }
  }
});

document.querySelectorAll(".delete-note-icon").forEach((icon) => {
  icon.addEventListener("click", function (e) {
    e.stopPropagation();
    // Your delete logic here
  });
});
