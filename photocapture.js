const prompt = require("prompt-sync")();
const NodeWebcam = require("node-webcam");

// Set up webcam options
const opts = {
  width: 1280,
  height: 720,
  quality: 100,
  delay: 0,
  saveShots: true,
  output: "jpeg",
  device: false,
  callbackReturn: "location",
  verbose: false,
};

// Create webcam instance
const Webcam = NodeWebcam.create(opts);

// Prompt user for permission
const userResponse = prompt(
  "Are you okay with me taking a picture? (y/no): "
);

if (userResponse.toLowerCase() === "y") {
  // Capture photo
  Webcam.capture("photo", function (err, data) {
    if (err) {
      console.error("Error capturing photo:", err);
    } else {
      console.log("Photo captured successfully:", data);
    }
  });
} else {
  console.log("Photo capture canceled.");
}
