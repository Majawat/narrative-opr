function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function rollDiceAndHighlight() {
  const die1 = rollDice();
  const die2 = rollDice();
  const eventNumber = `${die1}${die2}`;
  const eventId = `event-${eventNumber}`;
  const eventElement = document.getElementById(eventId);

  document.querySelectorAll(".highlight").forEach(function (event) {
    event.classList.remove("highlight");
  });

  // Highlight and scroll to the selected event
  if (eventElement) {
    eventElement.classList.add("highlight");
    eventElement.scrollIntoView({ behavior: "smooth", block: "center" });
  } else {
    alert(`Event #${eventNumber} not found.`);
  }
}

document.addEventListener("DOMContentLoaded", function () {
  var tooltipTriggerList = [].slice.call(
    document.querySelectorAll('[data-bs-toggle="tooltip"]')
  );
  var tooltipList = tooltipTriggerList.map(function (tooltipTriggerEl) {
    return new bootstrap.Tooltip(tooltipTriggerEl);
  });
});
