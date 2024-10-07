// const WebSocket = require("ws");
// const { exec } = require("child_process");
// const os = require("os");

// // Function to get the MAC address
// function getMacAddress() {
//   const networkInterfaces = os.networkInterfaces();
//   for (let interfaceName in networkInterfaces) {
//     const networkDetails = networkInterfaces[interfaceName];
//     for (let i = 0; i < networkDetails.length; i++) {
//       if (
//         networkDetails[i].mac &&
//         networkDetails[i].mac !== "00:00:00:00:00:00"
//       ) {
//         return networkDetails[i].mac;
//       }
//     }
//   }
//   return "Unknown MAC Address";
// }

// const macAddress = getMacAddress();
// const url = "ws://localhost:8080";
// const socket = new WebSocket(url);

// socket.on("open", () => {
//   console.log("Connected to the server");
// });

// socket.on("message", (data) => {
//   const { commands } = JSON.parse(data);

//   if (!Array.isArray(commands)) {
//     console.error("Invalid commands received from the server");
//     return;
//   }

//   console.log("Commands received from the server:", commands);

//   let output = "";
//   let completedCommands = 0;

//   // Execute each command and collect results
//   commands.forEach((command) => {
//     console.log(`Executing command: ${command}`);

//     exec(command, (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error executing command "${command}": ${error.message}`);
//         output += `Error executing command "${command}": ${error.message}\n`;
//       } else {
//         console.log(`Output of "${command}":\n${stdout}`);
//         output += `Output of "${command}": ${stdout}\n`;
//       }

//       if (stderr) {
//         console.warn(`Stderr of "${command}": ${stderr}`);
//         output += `Stderr of "${command}": ${stderr}\n`;
//       }

//       completedCommands++;
//       // Once all commands are executed, send the output and MAC address back to the server
//       if (completedCommands === commands.length) {
//         console.log("All commands executed. Sending results to the server.");

//         socket.send(
//           JSON.stringify({
//             success: true,
//             mac: macAddress,
//             output,
//           })
//         );
//       }
//     });
//   });
// });

// socket.on("close", () => {
//   console.log("Disconnected from the server");
// });

// socket.on("error", (error) => {
//   console.error("WebSocket error:", error);
// });

const WebSocket = require("ws");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

// Function to get the MAC address
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

// Function to create a desktop shortcut
function createDesktopShortcut(softwareName) {
  const desktopPath = path.join(os.homedir(), "Desktop", `${softwareName}.desktop`);
  console.log(`Attempting to create shortcut at: ${desktopPath}`);

  const shortcutContent = `[Desktop Entry]
Type=Application
Name=${softwareName}
Exec=${softwareName}
Icon=/usr/share/icons/hicolor/48x48/apps/${softwareName}.png
Terminal=false
Categories=Utility;`;

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
        }
      });
    }
  });
}

// Helper function to find the actual executable path
function findExecutable(softwareName, callback) {
  exec(`which ${softwareName}`, (err, stdout) => {
    if (err) {
      console.warn(`Executable for ${softwareName} not found in PATH. Fallback to software name.`);
      callback(softwareName); // Fallback to using just the name
    } else {
      callback(stdout.trim()); // Return the executable path
    }
  });
}

const macAddress = getMacAddress();
const url = "ws://localhost:8080";
const socket = new WebSocket(url);

socket.on("open", () => {
  console.log("Connected to the server");
});

socket.on("message", (data) => {
  const { commands } = JSON.parse(data);

  if (!Array.isArray(commands)) {
    console.error("Invalid commands received from the server");
    return;
  }

  console.log("Commands received from the server:", commands);

  let output = "";
  let completedCommands = 0;

  // Execute each command and collect results
  commands.forEach((command) => {
    console.log(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command "${command}": ${error.message}`);
        output += `Error executing command "${command}": ${error.message}\n`;
      } else {
        console.log(`Output of "${command}":\n${stdout}`);
        output += `Output of "${command}": ${stdout}\n`;

        // Check if the command is installing a software
        if (command.includes("apt install")) {
          // Use regex to extract the software name from the command
          const softwareMatch = command.match(/apt install\s+(-y\s+)?([^\s]+)/);
          if (softwareMatch) {
            const softwareName = softwareMatch[2]; // Extract the software name (second capturing group)
            findExecutable(softwareName, (execPath) => {
              createDesktopShortcut(softwareName, execPath);
            });
          } else {
            console.warn(`Could not extract software name from command: ${command}`);
          }
        }
      }

      if (stderr) {
        console.warn(`Stderr of "${command}": ${stderr}`);
        output += `Stderr of "${command}": ${stderr}\n`;
      }

      completedCommands++;
      // Once all commands are executed, send the output and MAC address back to the server
      if (completedCommands === commands.length) {
        console.log("All commands executed. Sending results to the server.");

        socket.send(
          JSON.stringify({
            success: true,
            mac: macAddress,
            output,
          })
        );
      }
    });
  });
});

socket.on("close", () => {
  console.log("Disconnected from the server");
});

socket.on("error", (error) => {
  console.error("WebSocket error:", error);
});
