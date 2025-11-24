🎓 STUDENTFLY - Student Travel Booking platform

📋 Project Overview

Studentfly is a web application that helps students find affordable flights by leveraging real-time flight data from the AeroDataBox API sourced from RAPIDAPI. This application features a lilac-themed interface with emoji-enhanced user experience to bring a little bit of a smile to student's face.

🏗 APP ARCHITECTURE

studentfly-project/
├── frontend/             # Corresponds to /var/www/studentfly/
│   ├── index.html
│   ├── style.css
│   └── script.js
└── backend/              # Corresponds to ~/backend/
    ├── app.py
    ├── requirements.txt  
    └── .gitignore

🚀 DEPLOYMENT GUIDE

PREREQUISITES

-Three Ubuntu servers: Web-01, Web-02, Lb-02
-Python 3.x installed on all servers
-Nginx installed on all servers
-RapidAPI account with AeroDataBox subscription

The application is deployed in a three-tier setup:

-Public Access: Traffic enters via the Load Balancer (Lb-01), which is configured with the domain www.ruthqueen.tech.
-Web Servers: Traffic is distributed to web01 (Backend ip: web01_ip) and web02 (Backend ip: web02_ip)
-Application Stack on each Server:
   * Frontend: Served by Nginx (Static files)
   * Backend: Python application running on port 5000, managed by systemd.
   * Reverse Proxy: Nginx forwards /api/ requests to python backend on 127.0.0.1:5000.

I. Application Deployment on Web Servers (Web01 & Web02)

The following steps were repeated identically on both 6913-web-01 and 6913-web-02

1. Frontend Setup (Nginx Web Root)

The static frontend files were copied to the Nginx web root and permissions were secured:

#1. Create the target directory
sudo mkdir -p /var/www/studentfly/

#2. Copy all frontend files
sudo cp -rv ~/studentfly-project_summative/frontend/* /var/www/studentfly/

#3. Set ownership for Nginx to access files
sudo chown -R www-data:www-data /var/www/studentfly/

#4. Secure permissions
cd /var/www/studentfly/
sudo find . -type d -exec chmod 755 {} \;
sudo find . -type f -exec chmod 644 {} \;

2. Backend Environment and Configuraion
 
The python backend was configured using a virtual environment and a dedicated .env file for secrets.

# Navigate to backend directory
cd ~/studentfly-project_summative/backend/

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate

# Create and populate the secret .env file
nano .env 
# (Contents: RAPIDAPI_KEY=..., RAPIDAPI_HOST=...)
chmod 600 .env # Restrict access to secrets

# Finalize and exit
deactivate
chmod +x app.py

3. Systemd Service Configuration
A systemd service was created to ensure the Python application runs persistently and restarts automatically if it crashes.

File: /etc/systemd/system/studentfly-backend.service

[Unit]
Description=StudentFly http.server Backend Application
After=network.target

[Service]
User=ubuntu
Group=www-data
WorkingDirectory=/home/ubuntu/studentfly-project_summative/backend
ExecStart=/home/ubuntu/studentfly-project_summative/backend/venv/bin/python app.py
Restart=always

[Install]
WantedBy=multi-user.target


Commands to Activate:

sudo systemctl daemon-reload
sudo systemctl start studentfly-backend.service
sudo systemctl enable studentfly-backend.service
sudo systemctl status studentfly-backend.service # Must show active (running)


4. Nginx Reverse Proxy Setup

Nginx was configured to handle public traffic on Port 80, serve the static frontend, and proxy API requests internally to the Python service running on port 5000.

File: /etc/nginx/sites-available/studentfly

Key Configuration Points:

server_name: Set to the server's public IP (e.g., 52.90.187.27).

location /: Serves static files from /var/www/studentfly.

location /api/: Routes dynamic API traffic to the local backend using proxy_pass http://127.0.0.1:5000.

Commands to Activate:

sudo ln -s /etc/nginx/sites-available/studentfly /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx


II. Load Balancer Configuration (LB01)

The Load Balancer (6913-lb-01) was configured via the cloud provider's console to ensure incoming public traffic is distributed between the two healthy web servers.

1. Security Group (Firewall) Adjustment

Since Web01 and Web02 are internal, the cloud's external firewall was blocking direct access. The Security Group rules were adjusted to ensure connectivity:

Load Balancer (LB01): Inbound rule opened for Port 80 from 0.0.0.0/0 (The Internet).

Web Servers (Web01 & Web02): Inbound rule opened for Port 80 from the Load Balancer's Private Network Range (allowing the LB to communicate with the servers).

2. Target Group Configuration

A Target Group was created to define the pool of servers available to receive traffic:

Setting

Value

Protocol/Port

HTTP / 80

Targets Registered

Web01 (52.90.187.27) and Web02 (52.87.176.209)

Health Check Path

/ (Checks Nginx is alive)

3. Listener Configuration

The Load Balancer's Listener was configured to intercept public traffic and forward it to the server pool:

Setting                             Value

Incoming Traffic                   HTTP (Port 80)

HTTP (Port 80)

Action                              Forward traffic to the Target Group created above.

CONCLUSION

This configuration successfully directs users accessing the application via: https://www.ruthqueen.tech/ to the Load Balancer, which then seamlessly distributes the traffic between the fully operational Web01 and Web02 instances. This achieves the required high availability and redundancy.

**** LINKS FOR WEBSITE AND DEMO VIDEO ****
-Website: https://www.ruthqueen.tech/#
-Demo Video (filmed using Loom): https://www.loom.com/share/a9cf151b62ef43078b87f0b070bec9c7


    

