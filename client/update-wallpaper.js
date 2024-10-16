const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Set the DISPLAY environment variable for GUI applications
process.env.DISPLAY = ":0"; // Adjust this if necessary; use 'echo $DISPLAY' in terminal to find the correct value

// Path to the JSON file
const channelFilePath = path.join(__dirname, "channel.json");

// Function to read current channel from JSON file
function getCurrentChannel() {
  try {
    const data = fs.readFileSync(channelFilePath, "utf8");
    const parsedData = JSON.parse(data);
    return parsedData.currentChannel || []; // Return an empty array if no channels exist
  } catch (error) {
    console.error("Error reading channel data:", error);
    return [];
  }
}

// Fetch wallpaper commands from API
function fetchWallpaper(channel) {
  return new Promise((resolve, reject) => {
    const apiUrl = `https://rms.thesama.in/wallpaper/${channel}`;

    https
      .get(apiUrl, (response) => {
        let data = "";

        response.on("data", (chunk) => {
          data += chunk;
        });

        response.on("end", () => {
          try {
            const jsonResponse = JSON.parse(data);
            if (
              jsonResponse["channel1-wallpaper"] &&
              jsonResponse["channel1-wallpaper"].commands
            ) {
              resolve(jsonResponse["channel1-wallpaper"].commands); // Return all commands for setting wallpaper
            } else {
              reject(new Error("Invalid response structure"));
            }
          } catch (error) {
            reject(error);
          }
        });
      })
      .on("error", (error) => {
        reject(error);
      });
  });
}

// Apply the wallpaper using the command directly
function applyWallpaper(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error) => {
      if (error) {
        console.error("Error setting wallpaper:", error);
        reject(error);
      } else {
        console.log("Wallpaper set successfully using command:", command);
        resolve();
      }
    });
  });
}

// Main function to execute the process
async function main() {
  const channelNames = getCurrentChannel(); // Expecting an array of channels
  console.log(`Initial Channel Names loaded: ${channelNames.join(", ")}`);

  try {
    for (const channel of channelNames) {
      const commands = await fetchWallpaper(channel); // Fetch wallpaper commands for each channel
      for (const command of commands) {
        await applyWallpaper(command); // Execute each command to set wallpaper
      }
    }

    console.log("All wallpapers processed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Start the process
main();
