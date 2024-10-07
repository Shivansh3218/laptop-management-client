const fs = require("fs");
const https = require("https");
const path = require("path");
const currentVersion = "1.0.0"; // This is the version of the currently running script
const scriptFilePath = path.join(__dirname, "script.js"); // Path to the current script

// URL of the server hosting the latest script and version file
const updateServerUrl = "https://your-server.com/updates/";

// Function to check for updates
function checkForUpdates() {
  https
    .get(updateServerUrl + "version.txt", (res) => {
      let versionData = "";
      res.on("data", (chunk) => {
        versionData += chunk;
      });

      res.on("end", () => {
        const latestVersion = versionData.trim();
        if (latestVersion !== currentVersion) {
          console.log(`Update available: ${latestVersion}. Downloading...`);
          downloadLatestScript(latestVersion);
        } else {
          console.log("You are using the latest version.");
        }
      });
    })
    .on("error", (e) => {
      console.error(`Failed to check for updates: ${e.message}`);
    });
}

// Function to download the latest version of the script
function downloadLatestScript(latestVersion) {
  const scriptUrl = updateServerUrl + "script.js";

  https
    .get(scriptUrl, (res) => {
      const fileStream = fs.createWriteStream(scriptFilePath);
      res.pipe(fileStream);

      fileStream.on("finish", () => {
        fileStream.close(() => {
          console.log(`Updated to version ${latestVersion}.`);
          // Optionally, you can restart the script here
        });
      });
    })
    .on("error", (e) => {
      console.error(`Failed to download the latest script: ${e.message}`);
    });
}

// Periodically check for updates (e.g., every 1 hour)
setInterval(checkForUpdates, 3600000); // Check every 1 hour

// Or check for updates at script startup
checkForUpdates();
