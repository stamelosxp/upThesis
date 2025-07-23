// Meetings functionality
document.addEventListener("DOMContentLoaded", function () {
  const meetingItems = document.querySelectorAll(".meeting-item");
  const addMeetingBtn = document.querySelector(".add-meeting-btn");
  const addInvitationBtn = document.querySelector(".add-invitation-btn");
  const cancelMeetingBtns = document.querySelectorAll(".cancel-meeting-btn");

  // Handle meeting item clicks
  meetingItems.forEach((item) => {
    item.addEventListener("click", function (e) {
      // Don't open modal if cancel button was clicked
      if (e.target.closest(".cancel-meeting-btn")) {
        return;
      }

      e.preventDefault();
      const meetingId = this.dataset.meetingId;
      if (meetingId) {
        openMeetingModal(meetingId);
      }
    });
  });

  // Handle cancel meeting button clicks
  cancelMeetingBtns.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation(); // Prevent triggering the meeting item click

      const meetingId = this.dataset.meetingId;
      if (meetingId) {
        cancelMeetingFromList(meetingId);
      }
    });
  });

  // Function to cancel meeting from list view
  async function cancelMeetingFromList(meetingId) {
    if (!confirm("Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτή τη συνάντηση;")) {
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel meeting");
      }

      // Refresh the page to show updated data
      location.reload();
    } catch (error) {
      console.error("Error cancelling meeting:", error);
      alert("Σφάλμα κατά την ακύρωση της συνάντησης");
    }
  }

  // Handle add meeting button click
  if (addMeetingBtn) {
    addMeetingBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showAddMeetingModal();
    });
  }

  // Handle add invitation button click
  if (addInvitationBtn) {
    addInvitationBtn.addEventListener("click", function (e) {
      e.preventDefault();
      showAddInvitationModal();
    });
  }

  // Function to show add meeting modal
  function showAddMeetingModal() {
    const modalHtml = `
      <div id="addMeetingModal" class="note-overlay active">
        <div class="note-modal">
          <div class="note-modal-header">
            <h3>Προσθήκη Νέας Συνάντησης</h3>
            <button class="close-modal" id="closeAddMeetingModal">&times;</button>
          </div>
          <div class="note-modal-body">
            <form id="addMeetingForm" class="new-note-container">
              <label for="meetingDate">Ημερομηνία</label>
              <input
                id="meetingDate"
                class="input-note"
                type="date"
                name="meetingDate"
                required
              />

              <label for="meetingTime">Ώρα</label>
              <input
                id="meetingTime"
                class="input-note"
                type="time"
                name="meetingTime"
                required
              />

              <label for="studentId">ID Φοιτητή</label>
              <input
                id="studentId"
                class="input-note"
                type="number"
                name="studentId"
                placeholder="Εισάγετε ID φοιτητή"
                required
              />

              <label for="professorId">ID Καθηγητή</label>
              <input
                id="professorId"
                class="input-note"
                type="number"
                name="professorId"
                placeholder="Εισάγετε ID καθηγητή"
                required
              />

              <div class="button-group">
                <button type="button" class="clear-button" id="clearMeetingForm">Καθαρισμός</button>
                <button type="submit" class="green-button">Προσθήκη</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById("addMeetingModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Add event listeners
    const closeBtn = document.getElementById("closeAddMeetingModal");
    const modal = document.getElementById("addMeetingModal");
    const form = document.getElementById("addMeetingForm");
    const clearBtn = document.getElementById("clearMeetingForm");

    closeBtn.addEventListener("click", () => {
      modal.remove();
      document.body.style.overflow = "auto";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        document.body.style.overflow = "auto";
      }
    });

    clearBtn.addEventListener("click", () => {
      form.reset();
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleAddMeeting(form);
    });

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }

  // Function to handle adding new meeting
  async function handleAddMeeting(form) {
    try {
      const formData = new FormData(form);
      const meetingDate = formData.get("meetingDate");
      const meetingTime = formData.get("meetingTime");
      const studentId = parseInt(formData.get("studentId"));
      const professorId = parseInt(formData.get("professorId"));

      // Combine date and time
      const dateTime = new Date(
        `${meetingDate}T${meetingTime}:00.000Z`,
      ).toISOString();

      const meetingData = {
        thesisId: parseInt(window.location.pathname.split("/").pop()), // Get thesis ID from URL
        dateTime: dateTime,
        participants: {
          student: studentId,
          professor: professorId,
        },
        status: "scheduled",
      };

      const response = await fetch("/api/meetings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(meetingData),
      });

      if (!response.ok) {
        throw new Error("Failed to create meeting");
      }

      // Close modal and refresh page
      document.getElementById("addMeetingModal").remove();
      document.body.style.overflow = "auto";
      location.reload();
    } catch (error) {
      console.error("Error creating meeting:", error);
      alert("Σφάλμα κατά τη δημιουργία της συνάντησης");
    }
  }

  // Function to show add invitation modal
  function showAddInvitationModal() {
    const modal = document.createElement("div");
    modal.id = "addInvitationModal";
    modal.className = "modal-overlay active";

    const currentDate = new Date();
    const minDate = currentDate.toISOString().slice(0, 16);

    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Νέα Πρόσκληση</h3>
          <button class="close-btn" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = 'auto';">&times;</button>
        </div>
        <div class="modal-body">
          <form id="addInvitationForm">
            <div class="form-group">
              <label for="invitationDescription">Περιγραφή Πρόσκλησης:</label>
              <textarea id="invitationDescription" name="description" required placeholder="Περιγράψτε τον σκοπό της πρόσκλησης..."></textarea>
            </div>
            
            <div class="form-group">
              <label for="invitationDeadline">Καταληκτική Ημερομηνία:</label>
              <input type="datetime-local" id="invitationDeadline" name="deadline" min="${minDate}" required>
            </div>
            
            <div class="form-group">
              <label for="invitationType">Τύπος Πρόσκλησης:</label>
              <select id="invitationType" name="type" required>
                <option value="">Επιλέξτε τύπο...</option>
                <option value="meeting">Πρόσκληση για Συνάντηση</option>
                <option value="presentation">Πρόσκληση για Παρουσίαση</option>
                <option value="review">Πρόσκληση για Αξιολόγηση</option>
                <option value="discussion">Πρόσκληση για Συζήτηση</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="invitationPriority">Προτεραιότητα:</label>
              <select id="invitationPriority" name="priority" required>
                <option value="normal">Κανονική</option>
                <option value="high">Υψηλή</option>
                <option value="urgent">Επείγουσα</option>
              </select>
            </div>
            
            <div class="form-group">
              <label for="invitationNotes">Επιπλέον Σημειώσεις:</label>
              <textarea id="invitationNotes" name="notes" placeholder="Προαιρετικές σημειώσεις..."></textarea>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" onclick="this.closest('.modal-overlay').remove(); document.body.style.overflow = 'auto';">Ακύρωση</button>
              <button type="submit" class="btn-primary">Αποστολή Πρόσκλησης</button>
            </div>
          </form>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    document.body.style.overflow = "hidden";

    // Add form submit handler
    document
      .getElementById("addInvitationForm")
      .addEventListener("submit", handleAddInvitation);
  }

  // Function to handle invitation submission
  async function handleAddInvitation(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const invitationData = {
      thesisId: new URLSearchParams(window.location.search).get("id"),
      description: formData.get("description"),
      deadline: formData.get("deadline"),
      type: formData.get("type"),
      priority: formData.get("priority"),
      notes: formData.get("notes"),
      status: "pending",
      createdAt: new Date().toISOString(),
    };

    try {
      const response = await fetch("/api/invitations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invitationData),
      });

      if (!response.ok) {
        throw new Error("Failed to create invitation");
      }

      // Close modal and refresh page
      document.getElementById("addInvitationModal").remove();
      document.body.style.overflow = "auto";
      location.reload();
    } catch (error) {
      console.error("Error creating invitation:", error);
      alert("Σφάλμα κατά την αποστολή της πρόσκλησης");
    }
  }

  // Function to open meeting modal
  async function openMeetingModal(meetingId) {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch meeting details");
      }

      const meeting = await response.json();
      showMeetingDetails(meeting);
    } catch (error) {
      console.error("Error fetching meeting:", error);
      alert("Σφάλμα κατά τη φόρτωση των στοιχείων της συνάντησης");
    }
  }

  // Function to show meeting details in modal
  function showMeetingDetails(meeting) {
    const modalHtml = `
      <div id="meetingModal" class="note-overlay active">
        <div class="note-modal">
          <div class="note-modal-header">
            <h3>Στοιχεία Συνάντησης</h3>
            <button class="close-modal" id="closeMeetingModal">&times;</button>
          </div>
          <div class="note-modal-body">
            <div class="meeting-details-modal">
              <div class="detail-row">
                <strong>Ημερομηνία:</strong> 
                <span>${new Date(meeting.dateTime).toLocaleDateString("el-GR")}</span>
              </div>
              <div class="detail-row">
                <strong>Ώρα:</strong> 
                <span>${new Date(meeting.dateTime).toLocaleTimeString("el-GR", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
              <div class="detail-row">
                <strong>ID Φοιτητή:</strong> 
                <span>${meeting.participants.student}</span>
              </div>
              <div class="detail-row">
                <strong>ID Καθηγητή:</strong> 
                <span>${meeting.participants.professor}</span>
              </div>
              <div class="detail-row">
                <strong>Κατάσταση:</strong> 
                <span class="status-badge status-${meeting.status}">
                  ${
                    meeting.status === "scheduled"
                      ? "Προγραμματισμένη"
                      : meeting.status === "completed"
                        ? "Ολοκληρωμένη"
                        : meeting.status === "cancelled"
                          ? "Ακυρωμένη"
                          : meeting.status
                  }
                </span>
              </div>
            </div>
            <div class="meeting-actions">
              ${
                meeting.status === "scheduled"
                  ? `
                <button class="green-button" onclick="completeMeeting(${meeting.id})">
                  Σήμανση ως Ολοκληρωμένη
                </button>
                <button class="clear-button" onclick="cancelMeeting(${meeting.id})">
                  Ακύρωση
                </button>
              `
                  : ""
              }
            </div>
          </div>
        </div>
      </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById("meetingModal");
    if (existingModal) {
      existingModal.remove();
    }

    // Add modal to body
    document.body.insertAdjacentHTML("beforeend", modalHtml);

    // Add close functionality
    const closeBtn = document.getElementById("closeMeetingModal");
    const modal = document.getElementById("meetingModal");

    closeBtn.addEventListener("click", () => {
      modal.remove();
      document.body.style.overflow = "auto";
    });

    modal.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.remove();
        document.body.style.overflow = "auto";
      }
    });

    // Prevent body scroll
    document.body.style.overflow = "hidden";
  }

  // Function to complete a meeting
  window.completeMeeting = async function (meetingId) {
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!response.ok) {
        throw new Error("Failed to update meeting");
      }

      // Close modal and refresh the page to show updated data
      const modal = document.getElementById("meetingModal");
      if (modal) {
        modal.remove();
        document.body.style.overflow = "auto";
      }
      location.reload();
    } catch (error) {
      console.error("Error updating meeting:", error);
      alert("Σφάλμα κατά την ενημέρωση της συνάντησης");
    }
  };

  // Function to cancel a meeting
  window.cancelMeeting = async function (meetingId) {
    if (!confirm("Είστε σίγουροι ότι θέλετε να ακυρώσετε αυτή τη συνάντηση;")) {
      return;
    }

    try {
      const response = await fetch(`/api/meetings/${meetingId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "cancelled" }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel meeting");
      }

      // Close modal and refresh the page to show updated data
      const modal = document.getElementById("meetingModal");
      if (modal) {
        modal.remove();
        document.body.style.overflow = "auto";
      }
      location.reload();
    } catch (error) {
      console.error("Error cancelling meeting:", error);
      alert("Σφάλμα κατά την ακύρωση της συνάντησης");
    }
  };

  // Restore body scroll when modal is closed
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        const hasModal = document.getElementById("meetingModal");
        if (!hasModal) {
          document.body.style.overflow = "auto";
        }
      }
    });
  });

  observer.observe(document.body, { childList: true });
});

// API helper functions for meetings
const MeetingsAPI = {
  // Get all meetings
  async getAll(filters = {}) {
    const params = new URLSearchParams(filters);
    const response = await fetch(`/api/meetings?${params}`);
    if (!response.ok) throw new Error("Failed to fetch meetings");
    return response.json();
  },

  // Get single meeting
  async getById(id) {
    const response = await fetch(`/api/meetings/${id}`);
    if (!response.ok) throw new Error("Failed to fetch meeting");
    return response.json();
  },

  // Create new meeting
  async create(meetingData) {
    const response = await fetch("/api/meetings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(meetingData),
    });
    if (!response.ok) throw new Error("Failed to create meeting");
    return response.json();
  },

  // Update meeting
  async update(id, updates) {
    const response = await fetch(`/api/meetings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    if (!response.ok) throw new Error("Failed to update meeting");
    return response.json();
  },

  // Delete meeting
  async delete(id) {
    const response = await fetch(`/api/meetings/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("Failed to delete meeting");
    return response.json();
  },
};
