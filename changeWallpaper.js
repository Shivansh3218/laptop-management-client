// (async () => {
//     const wallpaper = await import('wallpaper');

//     if (wallpaper.setWallpaper) {
//         await wallpaper.setWallpaper('pic.jpeg');
//         // await wallpaper.setWallpaper('pic.jpeg');
//         console.log('Wallpaper changed!');
//     } else {
//         console.error('Failed to set the wallpaper.');
//     }
// })();

const { exec } = require('child_process');

const wallpaperPath = '/home/alpana/Downloads/wallpaper.jpeg';

exec(`gsettings set org.gnome.desktop.background picture-uri-dark file://${wallpaperPath}`, (error, stdout, stderr) => {
    if (error) {
        console.error(`exec error: ${error}`);
        return;
    }
    console.log(`Wallpaper changed successfully!`);
});