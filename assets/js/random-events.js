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
    eventElement.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(function () {
      eventElement.classList.remove("highlight");
    }, 4000);
  } else {
    alert(`Event #${eventNumber} not found.`);
  }
}

document.addEventListener("DOMContentLoaded", function () {
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
});
