document.addEventListener("DOMContentLoaded", async () => {
  const localJsonURL = "assets/json/campaign.json";
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const remoteJsonURL = `https://army-forge.onepagerules.com/api/tts?id=${armyForgeId}`; // replace with the specific URL

  try {
    const localResponse = await fetch(localJsonURL);
    const campaignData = await localResponse.json();

    const remoteResponse = await fetch(remoteJsonURL);
    const remoteData = await remoteResponse.json();

    console.log(remoteData);
    console.log(campaignData);

    for (const army of campaignData.armies) {
      if (army.armyForgeID === armyForgeId) {
        document.getElementById("army-name").textContent = army.armyName;
        document.getElementById("army-image").src = army.image;
        document.getElementById(
          "army-image"
        ).style.addProperty = `object-position: ${army.imagePosition}`;
        document.getElementById("tagline");
        break;
      }
    }
  } catch (error) {
    console.error("Error fetching data:", error);
  }
});
