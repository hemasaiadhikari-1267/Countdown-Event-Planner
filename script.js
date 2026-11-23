const eventForm = document.getElementById("event-form");
const nameInput = document.getElementById("event-name");
const dateInput = document.getElementById("event-date");
const eventList = document.getElementById("event-list");
const eventCount = document.getElementById("event-count");
const formTitle = document.getElementById("form-title");
const saveButton = document.getElementById("save-button");
const cancelButton = document.getElementById("cancel-edit");
const formMessage = document.getElementById("form-message");

let events = loadEvents();
let editingEventId = null;
let countdownInterval = null;

// Read saved events from the browser.
function loadEvents() {
    const savedEvents = localStorage.getItem("countdownEvents");

    if (!savedEvents) {
        return [];
    }

    try {
        return JSON.parse(savedEvents);
    } catch (error) {
        return [];
    }
}

// Save the latest event list in LocalStorage.
function saveEvents() {
    localStorage.setItem("countdownEvents", JSON.stringify(events));
}

// Convert a date into a format that is easy to read.
function formatDate(dateValue) {
    return new Date(dateValue).toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

// Create the countdown boxes for one event.
function createTimeBox(value, label) {
    return `
        <div class="time-box">
            <span class="time-number">${value}</span>
            <span class="time-label">${label}</span>
        </div>
    `;
}

// Update the countdown values for every event.
function updateCountdowns() {
    const now = new Date().getTime();

    events.forEach((event) => {
        const eventTime = new Date(event.date).getTime();
        const remainingTime = eventTime - now;
        const card = document.querySelector(`[data-event-id="${event.id}"]`);

        if (!card) {
            return;
        }

        const countdown = card.querySelector(".countdown");
        const status = card.querySelector(".event-status");

        if (remainingTime <= 0) {
            countdown.classList.add("hidden");
            status.textContent = "This event has started or has passed.";
            status.classList.add("passed");
            return;
        }

        const days = Math.floor(remainingTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((remainingTime / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((remainingTime / (1000 * 60)) % 60);
        const seconds = Math.floor((remainingTime / 1000) % 60);

        countdown.innerHTML = [
            createTimeBox(days, "Days"),
            createTimeBox(hours, "Hours"),
            createTimeBox(minutes, "Minutes"),
            createTimeBox(seconds, "Seconds")
        ].join("");

        status.textContent = "Time remaining until your event.";
        status.classList.remove("passed");
    });
}

// Display all events on the page.
function displayEvents() {
    eventCount.textContent = events.length;

    if (events.length === 0) {
        eventList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🗓️</div>
                <h3>No events added yet</h3>
                <p>Add your first event above and start counting down!</p>
            </div>
        `;
        return;
    }

    // Show upcoming events first, followed by events that have started.
    const sortedEvents = [...events].sort((first, second) => {
        return new Date(first.date) - new Date(second.date);
    });

    eventList.innerHTML = sortedEvents.map((event) => `
        <article class="event-card" data-event-id="${event.id}">
            <div class="event-top">
                <div>
                    <h3 class="event-name">${escapeHTML(event.name)}</h3>
                    <p class="event-date">${formatDate(event.date)}</p>
                </div>
                <div class="event-actions">
                    <button class="small-button edit-button" data-action="edit" data-id="${event.id}">Edit</button>
                    <button class="small-button delete-button" data-action="delete" data-id="${event.id}">Delete</button>
                </div>
            </div>
            <div class="countdown"></div>
            <p class="event-status"></p>
        </article>
    `).join("");

    updateCountdowns();
}

// Keep user-entered event names from being treated as HTML.
function escapeHTML(value) {
    return value.replace(/[&<>"']/g, (character) => {
        const characters = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        };

        return characters[character];
    });
}

// Reset the form after adding, updating or cancelling an event.
function resetForm() {
    eventForm.reset();
    editingEventId = null;
    formTitle.textContent = "Add a new event";
    saveButton.textContent = "＋ Add Event";
    cancelButton.classList.add("hidden");
    formMessage.textContent = "";
}

// Add a new event or update the event currently being edited.
eventForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const eventName = nameInput.value.trim();
    const eventDate = new Date(dateInput.value);

    if (!eventName) {
        formMessage.textContent = "Please enter an event name.";
        return;
    }

    if (!dateInput.value || Number.isNaN(eventDate.getTime())) {
        formMessage.textContent = "Please choose a valid date and time.";
        return;
    }

    if (eventDate.getTime() <= Date.now()) {
        formMessage.textContent = "Please choose a date and time in the future.";
        return;
    }

    if (editingEventId !== null) {
        const eventToUpdate = events.find((item) => item.id === editingEventId);
        eventToUpdate.name = eventName;
        eventToUpdate.date = eventDate.toISOString();
    } else {
        events.push({
            id: Date.now().toString(),
            name: eventName,
            date: eventDate.toISOString()
        });
    }

    saveEvents();
    displayEvents();
    resetForm();
});

// Handle Edit and Delete clicks from the event cards.
eventList.addEventListener("click", (event) => {
    const button = event.target.closest("button");

    if (!button) {
        return;
    }

    const eventId = button.dataset.id;
    const action = button.dataset.action;

    if (action === "edit") {
        editEvent(eventId);
    }

    if (action === "delete") {
        deleteEvent(eventId);
    }
});

// Fill the form with an event's details so the user can edit it.
function editEvent(eventId) {
    const selectedEvent = events.find((item) => item.id === eventId);

    if (!selectedEvent) {
        return;
    }

    editingEventId = eventId;
    nameInput.value = selectedEvent.name;

    const localDate = new Date(selectedEvent.date);
    const timezoneOffset = localDate.getTimezoneOffset() * 60000;
    dateInput.value = new Date(localDate.getTime() - timezoneOffset)
        .toISOString()
        .slice(0, 16);

    formTitle.textContent = "Edit your event";
    saveButton.textContent = "Save Changes";
    cancelButton.classList.remove("hidden");
    formMessage.textContent = "";

    nameInput.focus();
    window.scrollTo({ top: 0, behavior: "smooth" });
}

// Remove an event after the user confirms the action.
function deleteEvent(eventId) {
    const shouldDelete = window.confirm("Are you sure you want to delete this event?");

    if (!shouldDelete) {
        return;
    }

    events = events.filter((item) => item.id !== eventId);
    saveEvents();
    displayEvents();

    if (editingEventId === eventId) {
        resetForm();
    }
}

cancelButton.addEventListener("click", resetForm);

// Start one timer for the page and clear the old timer before starting another.
function startCountdownTimer() {
    if (countdownInterval !== null) {
        clearInterval(countdownInterval);
    }

    updateCountdowns();
    countdownInterval = setInterval(updateCountdowns, 1000);
}

// Clean up the timer when the page is being left.
window.addEventListener("beforeunload", () => {
    if (countdownInterval !== null) {
        clearInterval(countdownInterval);
    }
});

// Show saved events when the page first opens.
displayEvents();
startCountdownTimer();
