// Dice rolling functions
function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

// Keep track of loaded events to avoid duplicate fetching
let eventsLoaded = false;
let eventsData = null;

// Load events from JSON file
async function loadEvents() {
  if (eventsLoaded) return eventsData;

  try {
    const response = await fetch("/assets/json/random-events.json");
    eventsData = await response.json();
    eventsLoaded = true;

    // Populate the event container
    populateEventContainer();

    return eventsData;
  } catch (error) {
    console.error("Error loading random events:", error);
    return null;
  }
}

// Generate HTML for an event
function createEventHTML(event) {
  const eventId = event.id;

  // Create the event div
  const eventDiv = document.createElement("div");
  eventDiv.className = "random-event";
  eventDiv.id = `event-${eventId}`;

  // Add the title
  const titleElement = document.createElement("h3");
  titleElement.textContent = `${eventId} - ${event.title}`;
  eventDiv.appendChild(titleElement);

  // Add the description (flavor text)
  const descriptionP = document.createElement("p");
  const descriptionEm = document.createElement("em");
  descriptionEm.textContent = event.description;
  descriptionP.appendChild(descriptionEm);
  eventDiv.appendChild(descriptionP);

  // Add the effect text with dice notation buttons where needed
  const effectP = document.createElement("p");
  effectP.classList.add("allow-definitions");

  // Process the effect text to find and replace dice notation
  let effectText = event.effect;

  // Replace dice notation (like D3, D6) with buttons
  const diceRegex = /\b(D\d+(?:\+\d+)?)/g;
  let lastIndex = 0;
  let match;

  const effectFragments = [];

  while ((match = diceRegex.exec(effectText)) !== null) {
    // Add text before the dice notation
    if (match.index > lastIndex) {
      effectFragments.push(
        document.createTextNode(effectText.substring(lastIndex, match.index))
      );
    }

    // Create dice button
    const diceButton = document.createElement("button");
    diceButton.type = "button";
    diceButton.className = "btn dice-notation btn-primary";
    diceButton.textContent = match[1];
    diceButton.addEventListener("click", handleDiceNotationClick);
    effectFragments.push(diceButton);

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text
  if (lastIndex < effectText.length) {
    effectFragments.push(
      document.createTextNode(effectText.substring(lastIndex))
    );
  }

  // Add all fragments to the effect paragraph
  effectFragments.forEach((fragment) => effectP.appendChild(fragment));
  eventDiv.appendChild(effectP);

  // For event 66 (Time Warp), add the extra list elements
  if (eventId === "66") {
    const ul = document.createElement("ul");

    const li1 = document.createElement("li");
    li1.textContent =
      "If the Time Beast wins then the unit is dead and removed from the army sheet.";
    ul.appendChild(li1);

    const li2 = document.createElement("li");
    li2.textContent =
      "If the unit wins then it gets +3 XP and scavenges 150pts. The unit may then join its army again at the end of the mission.";
    ul.appendChild(li2);

    eventDiv.appendChild(ul);
  }

  return eventDiv;
}

// Populate the event container with all events from JSON
function populateEventContainer() {
  if (!eventsData) return;

  const eventContainer = document.getElementById("eventContainer");
  if (!eventContainer) return;

  // Clear existing content
  eventContainer.innerHTML = "";

  // Add each event in order
  eventsData.events.forEach((event) => {
    const eventHTML = createEventHTML(event);
    eventContainer.appendChild(eventHTML);
  });

  // Initialize tooltips after populating events
  initializeTooltips();
}

// Roll dice and highlight the selected event
function rollDiceAndHighlight() {
  const die1 = rollDice();
  const die2 = rollDice();
  const eventNumber = `${die1}${die2}`;
  const eventId = `event-${eventNumber}`;

  document.querySelectorAll(".highlight").forEach(function (event) {
    event.classList.remove("highlight");
  });

  // Ensure events are loaded
  if (!eventsLoaded) {
    loadEvents().then(() => {
      highlightEvent(eventId, eventNumber);
    });
  } else {
    highlightEvent(eventId, eventNumber);
  }
}

// Helper function to highlight the specific event
function highlightEvent(eventId, eventNumber) {
  const eventElement = document.getElementById(eventId);

  // Highlight and scroll to the selected event
  if (eventElement) {
    eventElement.classList.add("highlight");
    eventElement.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () {
      eventElement.classList.remove("highlight");
    }, 4000);
  } else {
    alert(`Event #${eventNumber} not found.`);
  }
}

// Initialize tooltips
function initializeTooltips() {
  let tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );

  let tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    let tooltip = new bootstrap.Tooltip(tooltipTriggerEl);

    tooltipTriggerEl.addEventListener("click", function () {
      setTimeout(function () {
        tooltip.hide();
      }, 2000); // 2-second delay before hiding
    });

    return tooltip;
  });
}

// When the DOM is loaded, initialize the application
document.addEventListener("DOMContentLoaded", function () {
  // Load events from JSON
  loadEvents();

  // Initialize tooltips
  initializeTooltips();
});
