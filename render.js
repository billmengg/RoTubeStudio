const WebSocket = require('ws');
const osc = require('osc');
const axios = require('axios'); // To send HTTP requests

// Replace this with your Render deployment URL
const PUBLIC_SERVER_URL = 'https://rotubestudio.onrender.com/receive-osc';

let latestHeadData = {};
let latestSpineData = {};
let latestBoneData = {
    chest: {},
    upperChest: {},
    leftShoulder: {},
    rightShoulder: {},
    neck: {},
    leftEye: {},
    rightEye: {}
};

let movementBuffer = []; // Keep last 4 frames

// OSC UDP Setup
const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 39539
});

udpPort.on('message', async (oscMessage) => {
    // Update local movement data
    if (oscMessage.address === '/VMC/Ext/Tra/Pos' && oscMessage.args[0] === 'Head') {
        latestHeadData = { position: oscMessage.args.slice(1) };
    }
    if (oscMessage.address === '/VMC/Ext/Tra/Pos' && oscMessage.args[0] === 'Spine') {
        latestSpineData = { position: oscMessage.args.slice(1) };
    }
    if (oscMessage.address === '/VMC/Ext/Bone/Pos') {
        const bone = oscMessage.args[0];
        const rotation = oscMessage.args.slice(1);
        if (bone === 'Chest') latestBoneData.chest = { rotation };
        else if (bone === 'UpperChest') latestBoneData.upperChest = { rotation };
        else if (bone === 'LeftShoulder') latestBoneData.leftShoulder = { rotation };
        else if (bone === 'RightShoulder') latestBoneData.rightShoulder = { rotation };
        else if (bone === 'Neck') latestBoneData.neck = { rotation };
        else if (bone === 'LeftEye') latestBoneData.leftEye = { rotation };
        else if (bone === 'RightEye') latestBoneData.rightEye = { rotation };
    }

    // Push to buffer
    const frame = { head: latestHeadData, spine: latestSpineData, bones: latestBoneData };
    movementBuffer.push(frame);
    if (movementBuffer.length > 4) movementBuffer.shift();

    // Send latest frame to public server
    try {
        await axios.post(PUBLIC_SERVER_URL, frame);
    } catch (err) {
        console.error('Failed to send OSC frame to public server:', err.message);
    }
});

udpPort.open();

// Optional: WebSocket server locally if needed
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });
wss.on('connection', (ws) => {
    console.log('Local WebSocket connected');
    ws.send(JSON.stringify({ message: "Local WebSocket connected!" }));
    setInterval(() => ws.send(JSON.stringify(movementBuffer)), 125);
});

console.log('Local OSC sender running, forwarding frames to public server...');
