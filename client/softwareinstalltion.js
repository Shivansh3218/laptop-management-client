const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");

const applicationName = "Install Software";
const shortcutPath = path.join(process.env.HOME, "Desktop", "openbox.desktop");
const iconPath = "/usr/share/icons/hicolor/48x48/apps/openbox.png";

function installSoftware(packageName, callback) {
  exec(`sudo apt install -y ${packageName}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`exec error: ${error}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
    console.error(`stderr: ${stderr}`);
    if (callback) callback();
  });
}

function createShortcut() {
  const scriptPath = path.join(process.env.HOME, "openbox-start.sh");

  // Create a shell script that runs Openbox in a new X session
  const scriptContent = `#!/bin/bash
xinit /usr/bin/openbox-session`;

  // Write the script
  fs.writeFile(scriptPath, scriptContent, (err) => {
    if (err) {
      console.error("Error creating script:", err);
      return;
    }

    // Make the script executable
    fs.chmod(scriptPath, "755", (err) => {
      if (err) {
        console.error("Error setting script permissions:", err);
        return;
      }

      const shortcutContent = `[Desktop Entry]
Name=Openbox
Comment=Launch Openbox in a new X session
Exec=${scriptPath}
Icon=${iconPath}
Terminal=false
Type=Application
Categories=Utility;`;

      // Create the .desktop shortcut
      fs.writeFile(shortcutPath, shortcutContent, (err) => {
        if (err) {
          console.error("Error creating shortcut:", err);
        } else {
          console.log("Shortcut created at:", shortcutPath);

          // Make the shortcut executable
          fs.chmod(shortcutPath, "755", (err) => {
            if (err) {
              console.error("Error setting shortcut permissions:", err);
            } else {
              console.log("Shortcut is now executable.");
            }
          });
        }
      });
    });
  });
}

function main() {
  const packageName = "openbox";

  console.log(`Running ${applicationName}...`);
  installSoftware(packageName, createShortcut);
  console.log(`${applicationName} completed.`);
}

main();
