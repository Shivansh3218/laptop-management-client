# Documentation for Setting Up a Remote Ubuntu Management System

This documentation provides a comprehensive guide to setting up a Node.js application for remote management on an Ubuntu system. The steps include prerequisites, installation of necessary tools, and configuration of the application to run automatically on system boot.

## Prerequisites

Before setting up the application, ensure that the following software is installed on your Ubuntu system:

1. **Git**: A version control system to manage your code.
   - Install Git with:
     ```bash
     sudo apt-get install git
     ```

2. **Node.js**: A JavaScript runtime used to execute your application.
   - Install Node.js via NodeSource or using the package manager:
     ```bash
     curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
     sudo apt-get install -y nodejs
     ```

3. **npm**: Node Package Manager, which comes with Node.js, is used to manage application dependencies.
   - Install npm with:
     ```bash
     sudo apt install npm 
     ```

4. **PM2**: A process manager for Node.js applications that enables you to keep your application running continuously.
   - Install PM2 globally with:
     ```bash
     sudo npm install pm2 -g
     ```

5. **Installing Required Packages**: Ensure all necessary packages are installed:
   ```bash
   sudo apt-get install build-essential curl openssl libssl-dev

Cloning the Repository
To obtain the source code for your application, clone the repository from GitHub:
bash
git clone https://github.com/navgurukul/laptop-management-client.git

Installing Dependencies
Navigate into the cloned directory and install the required dependencies specified in package.json:
bash
cd laptop-management-client
npm install

Starting the Application with PM2
Once dependencies are installed, start your application using PM2:
bash
pm2 start index.js --name laptop_management

Configuring PM2 to Start on Boot
To ensure that your application starts automatically when the system boots up, configure PM2 as follows:
bash
pm2 startup systemd
pm2 save

Allowing Commands to Run Without Password
To allow specific commands to run without requiring a password, edit the sudoers file:
bash
sudo visudo

Add the following line (replace alpana with your username):
text
alpana ALL=(ALL) NOPASSWD: /usr/bin/node /home/alpana/laptop-management-client/index.js /path/to/your/command

Creating a Systemd Service
For better management of your application as a service, create a custom systemd service file:
Open a new service file in the systemd directory:
bash
sudo nano /etc/systemd/system/laptop-management.service

Add the following configuration:
text
[Unit]
Description=Laptop Management Node Application
After=network.target

[Service]
ExecStart=/usr/bin/node /home/alpana/laptop_management-client/index.js
Restart=always
User=alpana
Environment=HOME=/home/alpana

[Install]
WantedBy=multi-user.target

Reload systemd to recognize the new service:
bash
sudo systemctl daemon-reload

Enable and start the service:
bash
sudo systemctl enable laptop-management.service
sudo systemctl start laptop-management.service

Managing the Service
You can manage your application using systemd commands:
To check the status of your service:
bash
sudo systemctl status laptop-management.service

To restart the service:
bash
sudo systemctl restart laptop-management.service

To stop the service:
bash
sudo systemctl stop laptop-management.service

Setting Up a Cron Job to Run a Node.js Script
Open the crontab file:
bash
crontab -e

Add the cron job:
text
* * * * * cd /home/alpana/laptop_management && /usr/bin/node index.js 

Example of another cron job:
text
* * * * * /usr/bin/node /home/alpana/laptop-management-client/updatescript.js 

Verify Cron Jobs:
bash
crontab -l 

Subscribe to Channel
Run subscribechannel.js script:
bash
node subscribechannel.js 

Example:
text
channel1, channel2, channel3 

After subscribing to the respective channel and running node index.js, you will receive commands for installing software and changing wallpaper.
Important Notes
tracking.js: This script should run every time the system boots up.
dbsync.js: This process needs to be executed as a cron job.
subscribeChannel: This should be initiated the first time the application is installed.
index.js: Ensure this runs with the necessary privileges.
Conclusion
By following these steps, you have successfully set up a Node.js application for remote management on an Ubuntu machine, configured it to run automatically on startup, and created a custom systemd service for enhanced management. This setup ensures that your management system operates smoothly and can recover from failures automatically
