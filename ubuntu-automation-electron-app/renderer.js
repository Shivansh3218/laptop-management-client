const WebSocket = require("ws");
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

let channelNames = getCurrentChannel(); // Expecting an array of channels
console.log(`Initial Channel Names loaded: ${channelNames.join(", ")}`);
let ws_host = "localhost";
let ws_port = "8080";

// const rws = new WebSocket(`ws://${ws_host}:${ws_port}`);
const rws = new WebSocket("wss://rms.thesama.in");

rws.on("open", () => {
  console.log("[Client] Connected to WebSocket server.");

  // Prepare the subscription message
  const message = JSON.stringify({
    type: "subscribe",
    channels: channelNames,
  });

  console.log("Sending message to server:", message);
  rws.send(message); // Send subscription message on connection open
});

rws.on("message", async (data) => {
  const dataObj = JSON.parse(data);
  const commands = dataObj.commands;
  console.log(`[Client] Command received from server: ${typeof commands}`);
  const macAddress = getMacAddress(); // Get the MAC address

  if (!Array.isArray(commands)) {
    console.error("Received commands is not an array:", commands);

    // Send an error message back to the server
    rws.send(
      JSON.stringify({
        success: false,
        mac: macAddress,
        error: "Commands is not an array",
      })
    );
    return; // Exit early if commands is not an array
  }

  try {
    for (const command of commands) {
      await executeCommand(command);
    }

    console.log("All commands executed. Sending results to the server.");
    rws.send(
      JSON.stringify({
        success: true,
        mac: macAddress,
      })
    );
  } catch (error) {
    console.error("An error occurred while executing commands:", error);

    rws.send(
      JSON.stringify({
        success: false,
        mac: macAddress,
      })
    );
  }
});

rws.on("close", (event) => {
  console.log("[Client] Connection closed.");
  console.log(`Close code: ${event.code}, reason: ${event.reason}`);
});

rws.on("error", (error) => {
  console.error("[Client] Error: " + error.message);
});

// Function to get MAC address
function getMacAddress() {
  const networkInterfaces = os.networkInterfaces();
  for (let interfaceName in networkInterfaces) {
    const networkDetails = networkInterfaces[interfaceName];
    for (let i = 0; i < networkDetails.length; i++) {
      if (
        networkDetails[i].mac &&
        networkDetails[i].mac !== "00:00:00:00:00:00"
      ) {
        return networkDetails[i].mac;
      }
    }
  }
  return "Unknown MAC Address";
}

const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    const macAddress = getMacAddress(); // Get the MAC address

    console.log(`Executing command: ${command}`);

    // Check if the command is to set a wallpaper
    if (
      command.startsWith(
        "gsettings set org.gnome.desktop.background picture-uri"
      )
    ) {
      // const urlMatch = command.match(/'(https?:\/\/[^']+)'/);
      // const permanentDirectory = path.join(process.env.HOME, 'laptop-management-client', 'wallpapers'); // Create a 'wallpapers' folder in laptop-management-client

      // // Ensure the permanent directory exists
      // if (!fs.existsSync(permanentDirectory)) {
      //   fs.mkdirSync(permanentDirectory, { recursive: true });
      // }

      // if (urlMatch) {
      //   const wallpaperUrl = urlMatch[1];
      //   const wallpaperPath = path.join(
      //     permanentDirectory, // Save to the 'wallpapers' folder in your project
      //     path.basename(wallpaperUrl)
      //   ); // Save to specified permanent directory
      //   // Continue with downloading the wallpaper and executing the command...

      const fs = require("fs");
      const path = require("path");

      const urlMatch = command.match(/'(https?:\/\/[^']+)'/);
      const permanentDirectory = path.join(process.env.HOME, "wallpapers"); // Create a 'wallpapers' folder outside of laptop-management-client

      // Ensure the permanent directory exists
      if (!fs.existsSync(permanentDirectory)) {
        fs.mkdirSync(permanentDirectory, { recursive: true });
      }

      if (urlMatch) {
        const wallpaperUrl = urlMatch[1];
        const wallpaperPath = path.join(
          permanentDirectory, // Save to the 'wallpapers' folder outside of your project
          path.basename(wallpaperUrl)
        ); // Save to specified permanent directory

        // Continue with downloading the wallpaper and executing the command...

        // Download the new wallpaper
        downloadImage(wallpaperUrl, wallpaperPath)
          .then(() => {
            // Update command to use the local file
            const localCommand = `gsettings set org.gnome.desktop.background picture-uri "file://${wallpaperPath}"`;

            // Execute the command to set the wallpaper
            exec(localCommand, (error, stdout, stderr) => {
              if (error) {
                console.error(
                  `Error executing command "${localCommand}": ${error.message}`
                );
                rws.send(JSON.stringify({ mac: macAddress, success: false }));
                reject(error);
              } else {
                console.log(
                  `Wallpaper set successfully using: ${wallpaperPath}`
                );
                rws.send(JSON.stringify({ mac: macAddress, success: true }));
                resolve();
              }
            });
          })
          .catch((error) => {
            console.error(`Error downloading wallpaper: ${error.message}`);
            rws.send(JSON.stringify({ mac: macAddress, success: false }));
            reject(error);
          });
      } else {
        console.error("No valid URL found in wallpaper command.");
        rws.send(
          JSON.stringify({
            mac: macAddress,
            success: false,
            error: "No valid URL in command",
          })
        );
        reject(new Error("No valid URL in command"));
      }
    } else if (
      command.startsWith("sudo apt install") ||
      command.startsWith("apt install")
    ) {
      // Handle software installation and create shortcuts
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error executing command "${command}": ${error.message}`
          );
          rws.send(JSON.stringify({ mac: macAddress, success: false }));
          reject(error);
        } else {
          console.log(`Output of "${command}":\n${stdout}`);
          rws.send(JSON.stringify({ mac: macAddress, success: true }));

          // Extract software names from the installation command
          const commandParts = command.split(" ");
          const installIndex = commandParts.indexOf("install");
          if (installIndex !== -1) {
            const softwareNames = commandParts
              .slice(installIndex + 1)
              .filter((part) => !part.startsWith("-"))
              .join(" ");
            const softwareList = softwareNames.split(" ");

            // Create desktop shortcuts for each installed software
            softwareList.forEach((software) => {
              const trimmedSoftware = software.trim();
              if (trimmedSoftware !== "curl") {
                createDesktopShortcut(trimmedSoftware); // Exclude curl and create shortcuts for other software
              }
            });
          }

          resolve();
        }
      });
    } else {
      // Execute other commands as usual
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error executing command "${command}": ${error.message}`
          );
          rws.send(JSON.stringify({ mac: macAddress, success: false }));
          reject(error);
        } else {
          console.log(`Output of "${command}":\n${stdout}`);
          rws.send(JSON.stringify({ mac: macAddress, success: true }));
          resolve();
        }
      });
    }
  });
};

// Function to download the image
function downloadImage(url, destination) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destination);

    https
      .get(url, (response) => {
        if (response.statusCode === 200) {
          response.pipe(file);

          file.on("finish", () => {
            file.close(() => resolve());
          });
        } else {
          reject(
            new Error(
              `Failed to download image. Status code: ${response.statusCode}`
            )
          );
        }
      })
      .on("error", (error) => {
        fs.unlink(destination); // Delete the file on error
        reject(error);
      });
  });
}

// Function to create desktop shortcut for installed software
function createDesktopShortcut(softwareName) {
  const desktopPath = path.join(
    os.homedir(),
    "Desktop",
    `${softwareName}.desktop`
  );
  const execPath = `/usr/bin/${softwareName}`; // Path to the executable

  const defaultIconPath =
    "/usr/share/icons/hicolor/48x48/apps/utilities-terminal.png"; // Default icon
  const softwareIconPath = `/usr/share/icons/hicolor/48x48/apps/${softwareName}.png`;

  // Check if the software-specific icon exists, else use the default icon
  let iconPath = fs.existsSync(softwareIconPath)
    ? softwareIconPath
    : defaultIconPath;

  const shortcutContent = `[Desktop Entry]
Type=Application
Name=${softwareName}
Exec=${execPath}
Icon=${iconPath}
Terminal=false
Categories=Utility;
X-GNOME-Autostart-enabled=true
`;

  console.log(`Creating shortcut for ${softwareName} at ${desktopPath}`);
  console.log(`Using executable path: ${execPath}`);
  console.log(`Using icon path: ${iconPath}`);

  // Write the shortcut file
  fs.writeFile(desktopPath, shortcutContent, (err) => {
    if (err) {
      console.error(
        `Error creating shortcut for ${softwareName}: ${err.message}`
      );
    } else {
      console.log(`Shortcut for ${softwareName} created successfully.`);
    }
  });
}
