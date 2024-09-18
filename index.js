const Html5WebSocket = require("html5-websocket");
const ReconnectingWebSocket = require("reconnecting-websocket");
const { exec } = require("child_process");
const os = require("os");

const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const axios = require("axios");

// WebSocket initialization
let ws_host = "localhost"; // Replace with your EC2 IP or hostname
let ws_port = "3000";

// Ensure that the valid WebSocket class is passed into the options
const options = { WebSocket: Html5WebSocket };

const rws = new ReconnectingWebSocket(
  // "ws://" + ws_host + ":" + ws_port + "/ws",
  "ws://websocket.merakilearn.org/ws",
  undefined,
  options
);

rws.timeout = 1000; // Timeout duration

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

// Function to install software
function installSoftware(packageName) {
  console.log(`[Client] Installing software: ${packageName}`);
  exec(`sudo apt install -y ${packageName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`[Client] Installation error: ${error.message}`);
      rws.send(`[Client] Installation error: ${error.message}`);
      return;
    }

    // Ignore "apt does not have a stable CLI" warning
    const aptWarning =
      "WARNING: apt does not have a stable CLI interface. Use with caution in scripts.";
    if (stderr && !stderr.includes(aptWarning)) {
      console.error(`[Client] Installation stderr: ${stderr}`);
      rws.send(`[Client] Installation error: ${stderr}`);
      return;
    }

    console.log(`[Client] Installation stdout: ${stdout}`);

    // Get MAC address
    const macAddress = getMacAddress();

    // Send success message to the server including MAC address and installed status
    rws.send(
      `[Client] ${macAddress}: Software installed successfully: ${packageName}`
    );
  });
}

// WebSocket event listeners
rws.addEventListener("open", () => {
  console.log("[Client] Connected to WebSocket server.");
});

rws.addEventListener("message", (e) => {
  const command = e.data.trim();
  console.log(`[Client] Command received from server: ${command}`);

  // Check if the command is for installing software
  if (command.startsWith("install")) {
    const packageName = "openbox"; // Extract package name (dynamic extraction can be implemented)

    console.log("[Client] Package name: " + packageName);
    if (packageName) {
      installSoftware(packageName);
    } else {
      rws.send("[Client] Error: No package name specified for installation.");
    }
  } else {
    // Handle other commands (non-installation commands)
    exec(command, (error, stdout, stderr) => {
      if (error) {
        console.error(`[Client] Error executing command: ${error.message}`);
        rws.send(`[Client] Error: ${error.message}`);
        return;
      }

      if (stderr) {
        console.error(`[Client] Command executed with errors: ${stderr}`);
        rws.send(`[Client] Error: ${stderr}`);
        return;
      }

      console.log(`[Client] Sending command output to server: ${stdout}`);
      // Send the command output back to the server
      rws.send(stdout);
    });
  }
});



rws.addEventListener("close", () => {
  console.log("[Client] Connection closed.");
});

// Error handling
rws.onerror = (err) => {
  console.log("[Client] Error: " + err.message);
};

// Database path
const dbPath = path.join(__dirname, "system_tracking.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database:", err.message);
  } else {
    console.log("Connected to the database.");
  }
});

// Enable foreign key support and create the table
db.serialize(() => {
  db.run(`PRAGMA foreign_keys = ON;`); // Enable foreign key support in SQLite
  db.run(`DROP TABLE IF EXISTS system_tracking;`);
  db.run(`
    CREATE TABLE system_tracking (
      id INTEGER PRIMARY KEY AUTOINCREMENT, 
      mac_address VARCHAR(17) NOT NULL,
      active_time TEXT,
      date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      location TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
  `);
});

// Function to get MAC address (unique identifier)
let lastKnownUniqueId = null;
function getUniqueId() {
  const networkInterfaces = os.networkInterfaces();
  for (const iface in networkInterfaces) {
    for (const address of networkInterfaces[iface]) {
      if (address.family === "IPv4" && !address.internal) {
        lastKnownUniqueId = address.mac;
        return address.mac;
      }
    }
  }
  return lastKnownUniqueId || "UNKNOWN_ID";
}

// Function to check if system is online
function isOnline() {
  const networkInterfaces = os.networkInterfaces();
  let hasValidInterface = false;
  for (const iface in networkInterfaces) {
    for (const address of networkInterfaces[iface]) {
      if (address.family === "IPv4" && !address.internal) {
        hasValidInterface = true;
        break;
      }
    }
  }
  return hasValidInterface;
}

// Function to get location based on IP address
async function getLocation() {
  try {
    const response = await axios.get("http://ip-api.com/json/");
    const { city, regionName, country } = response.data;
    return `${city}, ${regionName}, ${country}`;
  } catch (error) {
    console.error("Error fetching location:", error.message);
    return "Unknown Location";
  }
}

// Function to log system status
async function logStatus() {
  const uniqueId = getUniqueId();
  const timestamp = new Date().toISOString();
  const status = "active";
  const location = await getLocation();
  const date = new Date().toISOString().split("T")[0]; // Get the date

  db.get(
    `SELECT * FROM system_tracking WHERE mac_address = ?`,
    [uniqueId],
    (err, row) => {
      if (err) {
        console.error("Error selecting from database:", err);
      } else if (row) {
        const activeTime = parseInt(row.active_time) + 1; // Increment active time by 1 minute
        db.run(
          `UPDATE system_tracking SET active_time = ?, location = ?, date = ? WHERE mac_address = ?`,
          [activeTime, location, date, uniqueId],
          (err) => {
            if (err) {
              console.error("Error updating database:", err);
            } else {
              console.log(
                `Status updated: ${timestamp} - "${uniqueId}" active for ${activeTime} minutes at ${location} on ${date}`
              );
            }
          }
        );
      } else {
        db.run(
          `INSERT INTO system_tracking (mac_address, date, active_time, location) VALUES (?, ?, ?, ?)`,
          [uniqueId, date, 1, location],
          (err) => {
            if (err) {
              console.error("Error inserting into database:", err);
            } else {
              console.log(
                `Status logged: ${timestamp} - "${uniqueId}" active for 1 minute at ${location}`
              );
            }
          }
        );
      }
    }
  );
}

// Log the system status every 1 minute (60000 milliseconds)
logStatus();
setInterval(logStatus, 10000);

