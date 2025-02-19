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
  if (document.getElementById("40k-quote")) {
    const quotes = [
      {
        quote: "Ork technology works basically because they believe it does.",
      },
      {
        quote:
          "Early Blizzard developers were HUGE fans of Warhammer. The original Warcraft game was going to be a Warhammer game, but the licensing never really happened.",
      },
      {
        quote:
          "The first named inquisitor character was called Obiwan Sherlock Clousseau...",
      },
      {
        quote:
          "Genestealers are fully capable of infiltrating Ork society just like they do humans. However the resulting hybrid offspring are very quickly found out because they are significantly calmer and less disruptive than normal Orks.",
      },
      {
        quote:
          "In the 41st Millennium, the ocean seals of today are known as blubber dogs.",
      },
      {
        quote:
          "You may know about the Litany of Hate and the Unbreakable Litany but do you know of the Litany of Percussive Maintence? Techpriests solve all their problems by chanting this litany while using a sacred repair method!",
      },
      {
        quote:
          "The Mechnicus dug up Nikoli Tesla's skull to use as a weapon against vehicles they don't like. The skull of Elder Nikolas is a relic that will emit an electric halo when the correct psalm is sung to it, disrupting enemy war machines.",
      },
    ];

    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    document.getElementById("40k-quote").textContent = randomQuote.quote;
  }
}

// Initialize all page elements after DOM is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  setExternalLinks();
  if (document.getElementById("error-code")) {
    document.getElementById("error-code").textContent = generateRandomCode();
  }
  setRandomQuote();
});
