// index.js
const express = require('express');
const WebSocket = require('ws');
const osc = require('osc');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// --------------------
// Middleware
// --------------------
app.use(cors());
app.use(express.json()); // Parse JSON POST bodies

// --------------------
// Movement Data Storage
// --------------------
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

let movementBuffer = [];

// --------------------
// Optional OSC UDP Setup (local UDP receiver)
// --------------------
const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 39539
});

udpPort.on('message', (oscMessage) => {
    if (oscMessage.address === '/VMC/Ext/Tra/Pos') {
        if (oscMessage.args[0] === 'Head') latestHeadData = { position: oscMessage.args.slice(1) };
        if (oscMessage.args[0] === 'Spine') latestSpineData = { position: oscMessage.args.slice(1) };
    }

    if (oscMessage.address === '/VMC/Ext/Bone/Pos') {
        const boneName = oscMessage.args[0];
        const rotationData = { rotation: oscMessage.args.slice(1) };
        switch (boneName) {
            case 'Chest': latestBoneData.chest = rotationData; break;
            case 'UpperChest': latestBoneData.upperChest = rotationData; break;
            case 'LeftShoulder': latestBoneData.leftShoulder = rotationData; break;
            case 'RightShoulder': latestBoneData.rightShoulder = rotationData; break;
            case 'Neck': latestBoneData.neck = rotationData; break;
            case 'LeftEye': latestBoneData.leftEye = rotationData; break;
            case 'RightEye': latestBoneData.rightEye = rotationData; break;
        }
    }

    const frame = { head: latestHeadData, spine: latestSpineData, bones: latestBoneData };
    movementBuffer.push(frame);
    if (movementBuffer.length > 4) movementBuffer.shift();

    // Broadcast immediately to all WS clients
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
    });
});

udpPort.open();

// --------------------
// WebSocket Server for clients
// --------------------
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    // Send last 4 frames immediately to new client
    ws.send(JSON.stringify(movementBuffer));

    ws.on('close', () => console.log('WebSocket client disconnected'));
});

// --------------------
// Express Routes
// --------------------
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.get('/osc-data', (req, res) => res.json(movementBuffer));

// Receive OSC frames via POST from local sender
app.post('/receive-osc', (req, res) => {
    const frame = req.body;
    if (!frame) return res.status(400).send('No frame data received');

    movementBuffer.push(frame);
    if (movementBuffer.length > 4) movementBuffer.shift();

    // Broadcast immediately
    wss.clients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(frame));
    });

    res.sendStatus(200);
});

// --------------------
// HTTP + WebSocket Upgrade
// --------------------
const server = app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
