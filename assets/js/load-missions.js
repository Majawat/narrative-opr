document.addEventListener("DOMContentLoaded", () => {
  const jsonURL = "assets/campaign.json";

  fetch(jsonURL)
    .then((response) => response.json())
    .then((data) => {
      const processedData = processMissions(data);
      displayMissions(processedData);
    });
});

function processMissions(data) {
  const processedData = [];

  for (const mission of data.missions) {
    processedData.push({
      number: mission.number,
      name: mission.title,
      overview: mission.overview,
      objective: mission.objective,
      victory: mission.victory,
      datetime: new Date(mission.datetime),
      month: mission.month,
      points: mission.points,
    });
  }
  console.log(processedData);
  return processedData;
}

function displayMissions(missions) {
  const mission1Date = document.getElementById("mission1-date");
  mission1Date.innerHTML = formatDateHTML(missions[0].datetime);
  missions.forEach((mission) => {});
}

// Helper function to add ordinal suffix to day numbers
function getOrdinalSuffix(n) {
  if (n >= 11 && n <= 13) return "th";
  switch (n % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

function formatDateHTML(date) {
  // Get abbreviated weekday (e.g., "Sat")
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  // Get full month name (e.g., "February")
  const month = date.toLocaleDateString("en-US", { month: "long" });
  // Get the day of the month (e.g., 22)
  const day = date.getDate();
  // Get the ordinal suffix (e.g., "nd")
  const ordinalSuffix = getOrdinalSuffix(day);
  // Format the time (e.g., "10:00 AM")
  const time = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Return a string that includes the day and the ordinal suffix wrapped in <sup> tags.
  return `${weekday}. ${month} ${day}<sup>${ordinalSuffix}</sup> at ${time}`;
}
