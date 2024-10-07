const { exec } = require('child_process');

const command = "gsettings set org.gnome.desktop.background picture-uri 'https://images.pexels.com/photos/28292149/pexels-photo-28292149/free-photo-of-a-black-and-white-photo-of-many-boats-in-the-water.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2'";

exec(command, (error, stdout, stderr) => {
    if (error) {
        console.error(`Error: ${error.message}`);
        return
    }
    if (stderr) {
        console.error(`Stderr: ${stderr}`);
        return;
    }
    console.log(`Wallpaper changed successfully: ${stdout}`);
});

