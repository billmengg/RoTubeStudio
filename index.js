// index.js
const express = require('express');
const WebSocket = require('ws');
const osc = require('osc');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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
// OSC UDP Setup
// --------------------
const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 39539
});

udpPort.on('message', (oscMessage) => {
    console.log('OSC:', oscMessage);

    // Head
    if (oscMessage.address === '/VMC/Ext/Tra/Pos' && oscMessage.args[0] === 'Head') {
        latestHeadData = { position: oscMessage.args.slice(1) };
    }

    // Spine
    if (oscMessage.address === '/VMC/Ext/Tra/Pos' && oscMessage.args[0] === 'Spine') {
        latestSpineData = { position: oscMessage.args.slice(1) };
    }

    // Bones
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

    // Buffer last 4 frames
    movementBuffer.push({
        head: latestHeadData,
        spine: latestSpineData,
        bones: latestBoneData
    });
    if (movementBuffer.length > 4) movementBuffer.shift();
});

udpPort.open();

// --------------------
// WebSocket Server
// --------------------
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({ message: "WebSocket connected!" }));

    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(movementBuffer));
        }
    }, 125);

    ws.on('close', () => clearInterval(interval));
});

// --------------------
// Express Routes
// --------------------

// Serve index.html
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    res.sendFile(indexPath);
});

// Serve last 4 frames of OSC data as JSON
app.get('/osc-data', (req, res) => {
    res.json(movementBuffer);
});

// Upgrade HTTP server to handle WebSocket connections
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`HTTP server running on port ${PORT}`);
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
