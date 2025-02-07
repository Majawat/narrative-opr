// Function to roll a die and return the result
function rollDie(sides) {
  return Math.floor(Math.random() * sides) + 1;
}

// Function to display a toast message
function showToast(message) {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) {
    toastContainer = document.createElement("div");
    toastContainer.id = "toast-container";
    toastContainer.style.position = "fixed";
    toastContainer.style.bottom = "10px";
    toastContainer.style.right = "10px";
    toastContainer.style.zIndex = "9999";
    document.body.appendChild(toastContainer);
  }

  const toast = document.createElement("div");
  toast.className = "toast align-items-center text-bg-primary border-0";
  toast.role = "alert";
  toast.ariaLive = "assertive";
  toast.ariaAtomic = "true";
  toast.style.marginBottom = "10px";
  toast.innerHTML = `
        <div class="d-flex">
          <div class="toast-body" style="font-size:2em">🎲 ${message}</div>
          <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      `;

  toastContainer.appendChild(toast);
  const bsToast = new bootstrap.Toast(toast);
  bsToast.show();

  setTimeout(function () {
    bsToast.hide();
    toastContainer.removeChild(toast);
  }, 4000);
}

// Function to handle dice notation clicks
function handleDiceNotationClick(event) {
  let notation = event.target.textContent;
  let dicePattern = /(\d*)d(\d+)([+-]\d+)?/i;
  let match = notation.match(dicePattern);

  if (match) {
    let numDice = parseInt(match[1]) || 1; // Default to 1 if no number is specified
    let sides = parseInt(match[2], 10);
    let modifier = match[3] ? parseInt(match[3], 10) : 0;

    let total = 0;
    let rolls = [];
    for (let i = 0; i < numDice; i++) {
      let roll = rollDie(sides);
      rolls.push(roll);
      total += roll;
    }
    total += modifier;

    let resultMessage = rolls
      .map(
        (roll) => `<span class="btn btn-outline-light shadow-lg no-interaction">${roll}</span>`
      )
      .join(" + ");
    if (modifier !== 0) {
      if (modifier > 0) {
        resultMessage += ` + ${modifier}`;
      } else if (modifier < 0) {
        resultMessage += ` - ${modifier}`;
      }
      resultMessage += ` = ${total}`;
    }

    showToast(resultMessage);
  }
}
window.addEventListener("DOMContentLoaded", () => {
  let diceNotations = document.querySelectorAll(".dice-notation");
  diceNotations.forEach(function (notation) {
    notation.addEventListener("click", handleDiceNotationClick);
    notation.classList.add("btn-primary");
  });
});
