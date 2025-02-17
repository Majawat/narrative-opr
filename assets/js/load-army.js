document.addEventListener("DOMContentLoaded", async () => {
  const localJsonURL = "assets/json/campaign.json";
  const armyForgeId = document.getElementById("army-forge-id").textContent;
  const remoteJsonURL = `https://army-forge.onepagerules.com/api/tts?id=${armyForgeId}`; // replace with the specific URL
  const refreshButton = document.getElementById("refresh-button");

  refreshButton.addEventListener("click", handleRefreshData);

  const localData = await fetchLocalData(localJsonURL);
  displayArmyDetails(localData);

  async function fetchLocalData(localJsonURL) {
    // Load from campaign.json
    // Return parsed data
    try {
      const localResponse = await fetch(localJsonURL);
      const campaignData = await localResponse.json();
      console.log("Campaign data:", campaignData);
      return campaignData;
    } catch (error) {
      console.error("Error fetching data:", error);
      return error;
    }
  }

  function displayArmyDetails(campaignData) {
    for (const army of campaignData.armies) {
      console.log("checking Army:", army.armyForgeID, armyForgeId);
      if (army.armyForgeID === armyForgeId) {
        console.log("Army data found:", army);
        document.getElementById("army-name").textContent = army.armyName;
        document.getElementById("army-image").src = army.image;
        document.getElementById(
          "army-image"
        ).style.addProperty = `object-position: ${army.imagePosition}`;
        document.getElementById("tagline");
        break;
      }
    }
  }

  function handleRefreshData() {
    console.log("Refreshing data...");
    clearCachedData(currentArmyId);
    initializeArmy(currentArmyId);
  }
});

/* 
  
    

    const remoteResponse = await fetch(remoteJsonURL);
    const remoteData = await remoteResponse.json();

    
    console.log(campaignData);

}
} catch (error) {
console.error("Error fetching data:", error);
} */
