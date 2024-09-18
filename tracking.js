const fs = require("fs");
const os = require("os");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const axios = require("axios");

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
        const activeTime = row.active_time + 1; // Increment active time by 1 minute
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
setInterval(logStatus, 60000);

// Handle system exit
process.on("SIGINT", () => {
  const uniqueId = getUniqueId();
  const timestamp = new Date().toISOString();
  db.run(
    `UPDATE system_tracking SET active_time = ?, location = ? WHERE mac_address = ?`,
    ["OFFLINE", null, uniqueId],
    (err) => {
      if (err) {
        console.error("Error updating database on exit:", err);
      } else {
        console.log(
          `Status updated: ${timestamp} - "${uniqueId}" System is offline`
        );
      }
      db.close(); // Close the database connection
      process.exit();
    }
  );
});
