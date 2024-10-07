const fs = require("fs");
const path = "./system_tracking.db";

// Function to delete the SQLite database file
function deleteDatabase() {
  fs.unlink(path, (err) => {
    if (err) {
      return console.error(`Error deleting the database file: ${err.message}`);
    }
    console.log("Database file deleted successfully.");
  });
}

// Run the delete function
deleteDatabase();
