const WebSocket = require("ws");
const { exec } = require("child_process");
const os = require("os");

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

const macAddress = getMacAddress();
const url = "ws://localhost:8080";
const socket = new WebSocket(url);

socket.on("open", () => {
  console.log("Connected to the server");
});

socket.on("message", async (data) => {
  const { commands } = JSON.parse(data);

  if (!Array.isArray(commands)) {
    console.error("Invalid commands received from the server");
    return;
  }

  console.log("Commands received from the server:", commands);

  let output = "";

  // Function to execute a command and return a promise
  const executeCommand = (command) => {
    return new Promise((resolve, reject) => {
      console.log(`Executing command: ${command}`);
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error(
            `Error executing command "${command}": ${error.message}`
          );
          output += `Error executing command "${command}": ${error.message}\n`;
          reject(error);
        } else {
          console.log(`Output of "${command}":\n${stdout}`);
          output += `Output of "${command}": ${stdout}\n`;
          if (stderr) {
            console.warn(`Stderr of "${command}": ${stderr}`);
            output += `Stderr of "${command}": ${stderr}\n`;
          }
          resolve();
        }
      });
    });
  };

  // Execute each command in sequence
  try {
    for (const command of commands) {
      await executeCommand(command);
    }

    console.log("All commands executed. Sending results to the server.");
    socket.send(
      JSON.stringify({
        success: true,
        mac: macAddress,
        output,
      })
    );
  } catch (error) {
    console.error("An error occurred while executing commands:", error);

    socket.send(
      JSON.stringify({
        success: false,
        mac: macAddress,
        output,
      })
    );
  }
});

socket.on("close", () => {
  console.log("Disconnected from the server");
});

socket.on("error", (error) => {
  console.error("WebSocket error:", error);
});
