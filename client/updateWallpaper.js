const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");
const https = require("https");

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

// Fetch wallpaper URL from API
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
              resolve(jsonResponse["channel1-wallpaper"].commands[0]); // Return the command for setting wallpaper
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

// Set wallpaper based on command
function setWallpaper(command) {
  return new Promise((resolve, reject) => {
    const url = command.match(/'([^']+)'/)[1]; // Extract URL from command
    const wallpaperDir = path.join(os.homedir(), ".wallpapers");
    const wallpaperFileName = path.basename(url);
    const wallpaperPath = path.join(wallpaperDir, wallpaperFileName);

    // Ensure wallpaper directory exists
    if (!fs.existsSync(wallpaperDir)) {
      fs.mkdirSync(wallpaperDir, { recursive: true });
    }

    // Check if the wallpaper already exists
    if (fs.existsSync(wallpaperPath)) {
      console.log("Wallpaper already exists locally. Skipping download.");
      applyWallpaper(wallpaperPath, resolve, reject);
    } else {
      // Download the wallpaper
      console.log("Downloading wallpaper...");
      exec(`curl -o "${wallpaperPath}" "${url}"`, (error) => {
        if (error) {
          console.error("Error downloading wallpaper:", error);
          reject(error);
          return;
        }
        console.log("Wallpaper downloaded successfully.");
        applyWallpaper(wallpaperPath, resolve, reject);
      });
    }
  });
}

// Apply the downloaded wallpaper
function applyWallpaper(wallpaperPath, resolve, reject) {
  exec(
    `DISPLAY=:0 gsettings set org.gnome.desktop.background picture-uri "file://${wallpaperPath}"`,
    (error) => {
      if (error) {
        console.error("Error setting wallpaper:", error);
        reject(error);
      } else {
        console.log("Wallpaper set successfully");
        resolve();
      }
    }
  );
}

// Main function to execute the process
async function main() {
  const channelNames = getCurrentChannel(); // Expecting an array of channels
  console.log(`Initial Channel Names loaded: ${channelNames.join(", ")}`);

  try {
    for (const channel of channelNames) {
      const command = await fetchWallpaper(channel); // Fetch wallpaper command for each channel
      await setWallpaper(command); // Execute the command to set wallpaper
    }

    console.log("All wallpapers processed successfully.");
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

// Start the process
main();
