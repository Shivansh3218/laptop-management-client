const WebSocket = require("ws");
const { exec } = require("child_process");
const os = require("os");
const fs = require("fs");
const path = require("path");

function createDesktopShortcut(softwareName) {
    softwareName="Google Chrome"
    const desktopPath = path.join(os.homedir(), "Desktop", `${softwareName}`);
    console.log(`Attempting to create shortcut at: ${desktopPath}`);
  
    const shortcutContent = `[Desktop Entry]
  Type=Application
  Name=${softwareName}
  Exec=${softwareName}
  Icon=/usr/share/icons/hicolor/48x48/apps/${softwareName}.png
  Terminal=false
  Categories=Utility;`;
  console.log()
  
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
createDesktopShortcut()