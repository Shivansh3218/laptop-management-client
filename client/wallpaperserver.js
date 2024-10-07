const express = require('express');
// const cors = require('cors');
const os = require('os');

const app = express();
// app.use(cors()); 

app.get('/wallpaper', (req, res) => {
    const wallpaperUrl = 'https://images.unsplash.com/photo-1542291026-7eec264c27ff'; 
    res.json({ wallpaper_url: wallpaperUrl });
});

const getLocalNetworkIP = () => {
    const interfaces = os.networkInterfaces();
    for (let iface in interfaces) {
        for (let alias of interfaces[iface]) {
            if (alias.family === 'IPv4' && !alias.internal) {
                return alias.address; 
            }
        }
    }
    return 'localhost';
};

const PORT = 5001;
app.listen(PORT, '0.0.0.0', () => {
    const localIP = getLocalNetworkIP();
    console.log(`Server is running:`);
    console.log(`- Local: http://localhost:${PORT}/wallpaper`);
    console.log(`- Network: http://${localIP}:${PORT}/wallpaper`);
});