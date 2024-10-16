// const fs = require("fs");
// const path = require("path");

// const wallpapersDirectory = path.join(__dirname, "wallpapers");

// // Function to delete all files in the 'wallpapers' directory
// function deleteAllWallpapers() {
//   fs.readdir(wallpapersDirectory, (err, files) => {
//     if (err) {
//       return console.error(`Error reading directory: ${err.message}`);
//     }

//     // Loop through all the files and delete them
//     files.forEach((file) => {
//       const filePath = path.join(wallpapersDirectory, file);
//       fs.unlink(filePath, (err) => {
//         if (err) {
//           return console.error(`Error deleting file ${file}: ${err.message}`);
//         }
//         console.log(`${file} deleted successfully.`);
//       });
//     });
//   });
// }

// // Run the delete function
// deleteAllWallpapers();


const fs = require("fs");
const path = require("path");

const wallpapersDirectory = path.join(__dirname, "wallpapers");

// Function to delete all files except the most recently modified one
function deleteAllExceptRecentWallpaper() {
  fs.readdir(wallpapersDirectory, (err, files) => {
    if (err) {
      return console.error(`Error reading directory: ${err.message}`);
    }

    if (files.length === 0) {
      return console.log("No files found in the directory.");
    }

    let latestFile = null;
    let latestMtime = 0;

    // Check each file's modification time
    files.forEach((file) => {
      const filePath = path.join(wallpapersDirectory, file);
      const fileStats = fs.statSync(filePath);

      if (fileStats.mtimeMs > latestMtime) {
        latestMtime = fileStats.mtimeMs;
        latestFile = file;
      }
    });

    // Delete all files except the most recent one
    files.forEach((file) => {
      if (file !== latestFile) {
        const filePath = path.join(wallpapersDirectory, file);
        fs.unlink(filePath, (err) => {
          if (err) {
            return console.error(`Error deleting file ${file}: ${err.message}`);
          }
          console.log(`${file} deleted successfully.`);
        });
      }
    });

    console.log(`The most recent file '${latestFile}' was kept.`);
  });
}

// Run the delete function
deleteAllExceptRecentWallpaper();
