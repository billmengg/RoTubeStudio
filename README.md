# RoTubeStudio: VSeeFace Face Tracking to Roblox

This project streams VSeeFace face tracking data to a public HTTP endpoint, allowing Roblox to read VTubing movement data in real time.

## How It Works
- `app2.js` receives OSC (Open Sound Control) data from VSeeFace.
- The data is served at `http://<your-public-ip>:3000/osc-data`.
- Your Roblox app fetches this data to animate your avatar.

## Prerequisites
- Node.js (v14 or newer recommended)
- VSeeFace (with OSC output enabled)
- Roblox Studio (for the client script)

## Setup Instructions

1. **Clone this repository**
   ```sh
   git clone https://github.com/billmengg/RoTubeStudio.git
   cd RoTubeStudio
   ```

2. **Install dependencies**
   ```sh
   npm install
   ```

3. **Configure VSeeFace**
   - In VSeeFace, go to `Settings > General`.
   - Enable OSC output.
   - Set the OSC output IP to your computer's local IP (e.g., `127.0.0.1`) and port (default: `39539`).

4. **Start the server**
   ```sh
   node app2.js
   ```
   - The server will listen on port 3000 by default.
   - Access the OSC data at: `http://<your-public-ip>:3000/osc-data`

5. **Roblox Integration**
   - In Roblox Studio, use an HTTP request script to fetch and parse the data from the above URL.
   - Make sure HTTP requests are enabled in your Roblox game settings.


## Port Forwarding (for Public Access)
If you want Roblox or other devices outside your local network to access the OSC data server, you must set up port forwarding on your router:

1. Log in to your router's admin page (usually at `192.168.1.1` or `192.168.0.1`).
2. Find the Port Forwarding section.
3. Forward TCP port **3000** to the local IP address of the computer running this server.
4. Save and apply the changes.
5. Your server will now be accessible at `http://<your-public-ip>:3000/osc-data`.

**Warning:** Exposing your computer to the internet can have security risks. Only port forward if necessary and consider using a firewall.

For local testing, use `http://localhost:3000/osc-data`.
Do not share your public IP unless necessary.

## Troubleshooting
- If you see CORS errors, adjust the CORS settings in `app2.js`.
- If Roblox cannot fetch the data, check your firewall and Roblox HTTP permissions.

## License
MIT
