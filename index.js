const WebSocket = require("ws");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

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

const rws = new WebSocket("ws://websocket.merakilearn.org/ws");

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

// // Function to execute a command
// const executeCommand = (command) => {
//   return new Promise((resolve, reject) => {
//     const macAddress = getMacAddress(); // Get the MAC address

//     console.log(`Executing command: ${command}`);
//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error executing command "${command}": ${error.message}`);
//         // rws.send(
//         //   `[MAC: ${macAddress}] Error executing command "${command}": ${error.message}\n`
//         // );
//         reject(error);
//       } else {
//         console.log(`Output of "${command}":\n${stdout}`);
//         // rws.send(`[MAC: ${macAddress}] Output of "${command}": ${stdout}\n`);
//         if (stderr) {
//           console.warn(`Stderr of "${command}": ${stderr}`);
//           // rws.send(`[MAC: ${macAddress}] Stderr of "${command}": ${stderr}\n`);
//         }
//         resolve();
//       }
//     });
//   });
// };
const executeCommand = (command) => {
  return new Promise((resolve, reject) => {
    console.log(`Executing command: ${command}`);
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command "${command}": ${error.message}`);
        reject(error);
      } else {
        console.log(`Output of "${command}":\n${stdout}`);
        if (stderr) {
          console.warn(`Stderr of "${command}": ${stderr}`);
        }

        // Check if the command is an installation command
        if (command.startsWith("sudo apt install") || command.startsWith("apt install")) {
          const commandParts = command.split(' ');
          const installIndex = commandParts.indexOf('install');
          if (installIndex !== -1) {
            // Extract the software name(s)
            const softwareNames = commandParts.slice(installIndex + 1).filter(part => !part.startsWith('-')).join(' ');
            const softwareList = softwareNames.split(' ');

            // Create shortcuts for each software in the installation command
            softwareList.forEach(software => {
              const trimmedSoftware = software.trim();
              if (trimmedSoftware !== 'curl') { // Exclude curl
                createDesktopShortcut(trimmedSoftware); // Trim to remove any extra whitespace
              }
            });
          }
        }

        resolve();
      }
    });
  });
};

function createDesktopShortcut(softwareName) {
  const desktopPath = path.join(os.homedir(), "Desktop", `${softwareName}.desktop`);
  const execPath = `/usr/bin/${softwareName}`; // Path to the executable
  
  const defaultIconPath = "/usr/share/icons/hicolor/48x48/apps/utilities-terminal.png"; // Default icon
  const softwareIconPath = `/usr/share/icons/hicolor/48x48/apps/${softwareName}.png`;

  // Check if the software-specific icon exists, else use the default icon
  let iconPath = fs.existsSync(softwareIconPath) ? softwareIconPath : defaultIconPath;

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
      console.error(`Error creating shortcut for ${softwareName}: ${err.message}`);
    } else {
      console.log(`Shortcut for ${softwareName} created on the desktop at ${desktopPath}.`);
      // Make the .desktop file executable
      exec(`chmod +x "${desktopPath}"`, (error) => {
        if (error) {
          console.error(`Error making the shortcut executable: ${error.message}`);
        } else {
          console.log(`Shortcut for ${softwareName} made executable.`);

          // Allow launching the shortcut by marking it trusted
          exec(`gio set "${desktopPath}" metadata::trusted true`, (error) => {
            if (error) {
              console.error(`Error allowing launching of shortcut: ${error.message}`);
            } else {
              console.log(`Shortcut for ${softwareName} is now trusted and can be launched.`);
            }
          });
        }
      });
    }
  });
}
