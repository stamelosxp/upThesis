// Topic expand/collapse functionality
function toggleTopic(topicItem) {
  const collapsedContent = topicItem.querySelector(".topic-content.collapsed");
  const expandedContent = topicItem.querySelector(".topic-content.expanded");

  if (collapsedContent && expandedContent) {
    if (collapsedContent.style.display === "none") {
      collapsedContent.style.display = "flex";
      expandedContent.style.display = "none";
      topicItem.classList.remove("expanded");
      topicItem.classList.add("collapsed");
    } else {
      // Currently collapsed, switch to expanded
      collapsedContent.style.display = "none";
      expandedContent.style.display = "flex";
      topicItem.classList.remove("collapsed");
      topicItem.classList.add("expanded");
    }
  }
}

// Add new topic functionality
function addNewTopic() {
  fetch("/professor/topics/new-topic-template")
    .then((response) => response.json())
    .then((data) => {
      // Create a new topic item element
      const newTopicItem = document.createElement("li");
      newTopicItem.className = "topic-item expanded"; // Start in expanded mode
      newTopicItem.innerHTML = data.html; // The new_topic.ejs template

      // Insert at the top of the topics list
      const topicsList = document.querySelector(".topics-list");
      topicsList.insertBefore(newTopicItem, topicsList.firstChild);

      // Scroll to the new topic
      newTopicItem.scrollIntoView({ behavior: "smooth" });
    });
}

// Toggle edit mode for existing topics
function toggleEditMode(topicItem, topicId, editButton) {
  //get with querySelector instead because we have topic item
  const titleInput = topicItem.querySelector(`#topic-input-title-${topicId}`);
  const descriptionTextarea = topicItem.querySelector(
    `#topic-description-form-${topicId}`,
  );
  const fileInput = topicItem.querySelector(`#topic-attachments-${topicId}`);
  const deleteButton = topicItem.querySelector(
    `#delete-topic-button-${topicId}`,
  );

  if (titleInput.hasAttribute("readonly")) {
    //make input and textarea editable
    titleInput.removeAttribute("readonly");
    descriptionTextarea.removeAttribute("readonly");

    // set css classes for editable appearance like new topic
    titleInput.classList.remove("topic-input-class");
    titleInput.classList.add("new-topic-input-class");
    descriptionTextarea.classList.remove("topic-description");
    descriptionTextarea.classList.add("new-topic-description");

    // enable file input
    fileInput.classList.remove("attachment-file");
    fileInput.classList.add("new-attachment-file");

    // change button to save instead of edit
    editButton.textContent = "Αποθήκευση";
    editButton.classList.remove("edit-button");
    editButton.classList.add("green-button");

    // change cancel button instead of delete button
    deleteButton.textContent = "Ακύρωση";
    deleteButton.setAttribute("data-original-text", "Διαγραφή");

    // add edit class to add ΕΠΕΞΕΡΓΑΣΙΑ
    topicItem.classList.add("edit-mode");
  } else {
    // if is editable, switch back to readonly mode
    titleInput.setAttribute("readonly", true);
    descriptionTextarea.setAttribute("readonly", true);

    titleInput.classList.remove("new-topic-input-class");
    titleInput.classList.add("topic-input-class");
    descriptionTextarea.classList.remove("new-topic-description");
    descriptionTextarea.classList.add("topic-description");

    fileInput.classList.remove("new-attachment-file");
    fileInput.classList.add("attachment-file");

    editButton.textContent = "Επεξεργασία";
    editButton.classList.remove("green-button");
    editButton.classList.add("edit-button");

    deleteButton.textContent =
      deleteButton.getAttribute("data-original-text") || "Διαγραφή";
    deleteButton.removeAttribute("data-original-text");

    topicItem.classList.remove("edit-mode");
  }
}

document.addEventListener("DOMContentLoaded", function () {
  const topicItems = document.querySelectorAll(".topic-item");

  //initialize all topics to collapsed state
  topicItems.forEach(function (topicItem) {
    const collapsedContent = topicItem.querySelector(
      ".topic-content.collapsed",
    );
    const expandedContent = topicItem.querySelector(".topic-content.expanded");

    if (collapsedContent && expandedContent) {
      collapsedContent.style.display = "flex";
      expandedContent.style.display = "none";
      topicItem.classList.add("collapsed");
      topicItem.classList.remove("expanded");
    }
  });

  const topicsContainer = document.getElementById("topics-container-list");
  // collapse and expand functionality
  if (topicsContainer) {
    topicsContainer.addEventListener("click", function (event) {
      if (
        event.target.classList.contains("expand-indicator") ||
        event.target.classList.contains("collapse-indicator")
      ) {
        event.preventDefault();
        const topicItem = event.target.closest(".topic-item");
        if (topicItem) {
          toggleTopic(topicItem);
        }
      }

      // cancel topic creation
      if (event.target.id === "cancel-topic-button") {
        event.preventDefault();
        const topicItem = event.target.closest(".topic-item");
        if (topicItem) {
          // Remove the new topic item from the DOM
          topicItem.remove();
        }
      }

      // make topic editable
      if (event.target.id && event.target.id.startsWith("edit-topic-button-")) {
        event.preventDefault();
        const topicId = event.target.id.split("-")[3]; //get topic ID
        const topicItem = event.target.closest(".topic-item");

        if (topicItem) {
          toggleEditMode(topicItem, topicId, event.target);
        }
      }

      // Handle delete/cancel button click
      if (
        event.target.id &&
        event.target.id.startsWith("delete-topic-button-")
      ) {
        event.preventDefault();
        const topicId = event.target.id.split("-")[3]; // Extract topic ID
        const topicItem = event.target.closest(".topic-item");
        const deleteButton = event.target;

        if (topicItem) {
          // Check if we're in edit mode (button shows "Ακύρωση")
          if (deleteButton.textContent === "Ακύρωση") {
            // Cancel edit mode - revert to readonly without saving
            const editButton = topicItem.querySelector(
              `#edit-topic-button-${topicId}`,
            );

            // Reset form to original values
            const titleInput = topicItem.querySelector(
              `#topic-input-title-${topicId}`,
            );
            const descriptionTextarea = topicItem.querySelector(
              `#topic-description-form-${topicId}`,
            );

            // You might want to store original values when entering edit mode
            // For now, we'll just toggle back to readonly mode
            toggleEditMode(topicItem, topicId, editButton);
          } else {
            // Normal delete functionality
            if (
              confirm("Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το θέμα;")
            ) {
              topicItem.remove();
              console.log("Deleting topic:", topicId);
            }
          }
        }
      }
    });
  }
});

// Add event listener for the create topic button
document
  .getElementById("create-topic-btn")
  .addEventListener("click", function () {
    // Fetch the new topic template from the server
    fetch("/professor/topics/new-topic-template")
      .then((response) => response.json())
      .then((data) => {
        // Create a new topic item element
        const newTopicItem = document.createElement("li");
        newTopicItem.className = "topic-item expanded new-topic"; // Add new-topic class for styling
        newTopicItem.innerHTML = data.html; // The new_topic.ejs template

        // Insert at the top of the topics list
        const topicsList = document.querySelector(".topics-list");
        topicsList.insertBefore(newTopicItem, topicsList.firstChild);
      });
  });
