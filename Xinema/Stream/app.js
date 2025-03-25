const WebSocket = require('ws');
const osc = require('osc');

// Set up WebSocket server
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });

// OSC UDP Port Setup (where Protokol or VSeeFace sends OSC messages)
const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',  // Listen on all IP addresses
    localPort: 39539           // Port to listen for OSC messages (should match with your OSC sender)
});

// Forward OSC message over WebSocket when received
udpPort.on('message', (oscMessage) => {
    // When an OSC message is received, forward it over WebSocket
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            // Send the OSC message to the connected WebSocket client (Roblox)
            client.send(JSON.stringify(oscMessage));
        }
    });
});

// Start the UDP listener
udpPort.open();

// WebSocket server setup
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');  // Log when a WebSocket connection is made

  // Send a confirmation message when a new WebSocket client connects
  ws.send(JSON.stringify({ message: "WebSocket connected!" }));

  // Handle incoming WebSocket messages from Roblox
  ws.on('message', (message) => {
      console.log('Received from Roblox:', message);  // Log when a message is received from Roblox
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
      console.error('WebSocket Error:', error);
  });

  // Handle WebSocket closure
  ws.on('close', () => {
      console.log('WebSocket connection closed');
  });
});

console.log('WebSocket server running on ws://192.168.0.114:8080');
