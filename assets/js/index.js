// Set external links to open in a new tab
function setExternalLinks() {
  const links = document.querySelectorAll('a[href^="http"]');
  links.forEach((link) => {
    link.setAttribute("target", "_blank");
  });
}

// Generate a random error code
function generateRandomCode() {
  const prefixes = [
    "OMEGA",
    "EXCOMMUNICATUS",
    "INQUISITORIAL",
    "LEGION",
    "PRIMARIS",
    "REDEMPTION",
    "ADEPTO",
  ];
  const middles = [
    "REX",
    "THETA",
    "AUXILIA",
    "HERETICUS",
    "CRUSADE",
    "ASTARTES",
    "MECHANICUS",
  ];
  const suffixes = [
    "404",
    "00M42",
    "XVIII",
    "M31",
    "M41",
    "XVI",
    "1011",
    "VOID",
  ];

  return `${prefixes[Math.floor(Math.random() * prefixes.length)]}-${
    middles[Math.floor(Math.random() * middles.length)]
  }-${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
}

// Set a random quote to the page
function setRandomQuote() {
  const quotes = [
    {
      quote: "Success is measured in blood; yours or your enemy's.",
      author: "Imperial Guard motto",
    },
    {
      quote: "Trazyn, you fool! You got us front row seats to a coup!",
      author: "Orikan the Divine",
    },
    {
      quote: "Sorry, I prefer blondes.",
      author:
        "Commissar Ciaphas Cain, shortly before shooting a Slaaneshi Succubus",
    },
  ];

  const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

  document.getElementById("40k-quote").textContent = randomQuote.quote;
  document.getElementById("40k-author").textContent = randomQuote.author;
}

// Initialize all page elements after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  setExternalLinks();
  document.getElementById("error-code").textContent = generateRandomCode();
  setRandomQuote();
});
