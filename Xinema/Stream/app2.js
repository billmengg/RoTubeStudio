const WebSocket = require('ws');
const osc = require('osc');
const express = require('express');
const path = require('path');  // Import the path module
const app = express();

let latestHeadData = {};  // Store the most recent head movement data (translation)
let latestSpineData = {};  // Store the most recent spine movement data (translation)
let latestBoneData = {     // Store bone rotation data
    chest: {},
    upperChest: {},
    leftShoulder: {},
    rightShoulder: {},
    neck: {},
    leftEye: {},            // Add left eye bone tracker
    rightEye: {}            // Add right eye bone tracker
};

// OSC UDP Setup
const udpPort = new osc.UDPPort({
    localAddress: '0.0.0.0',
    localPort: 39539
});

// Listen for incoming OSC messages and update the most recent movement data for head, spine, and bones
udpPort.on('message', (oscMessage) => {
    console.log('OSC:', oscMessage);

    // Check if the message is for "Head" and the address matches (Translation)
    if (oscMessage.address === '/VMC/Ext/Tra/Pos' && oscMessage.args[0] === 'Head') {
        latestHeadData = {
            position: oscMessage.args.slice(1),  // Get the rest of the values (position data)
        };
    }

    // Check if the message is for "Spine" and the address matches (Translation)
    if (oscMessage.address === '/VMC/Ext/Tra/Pos' && oscMessage.args[0] === 'Spine') {
        latestSpineData = {
            position: oscMessage.args.slice(1),  // Get the rest of the values (position data)
        };
    }

    // Check if the message is for "Bone" and the address matches (Rotation)
    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'Chest') {
        latestBoneData.chest = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }

    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'UpperChest') {
        latestBoneData.upperChest = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }

    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'LeftShoulder') {
        latestBoneData.leftShoulder = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }

    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'RightShoulder') {
        latestBoneData.rightShoulder = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }

    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'Neck') {
        latestBoneData.neck = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }

    // Add bone tracking for Left and Right Eye
    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'LeftEye') {
        latestBoneData.leftEye = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }

    if (oscMessage.address === '/VMC/Ext/Bone/Pos' && oscMessage.args[0] === 'RightEye') {
        latestBoneData.rightEye = {
            rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
        };
    }
});

udpPort.open();

// WebSocket Server
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });
wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({ message: "WebSocket connected!" }));

    // Send the most recent movement data (head, spine, bones) every 125ms (1/8 second)
    setInterval(() => {
        const data = {
            head: latestHeadData,
            spine: latestSpineData,
            bones: latestBoneData
        };
        ws.send(JSON.stringify(data));  // Send the most recent movement data to the client
    }, 125);  // 125ms = 1/8 second
});

// Serve the index.html file correctly
app.get('/', (req, res) => {
    console.log('Received a request for /');
    const indexPath = path.join(__dirname, 'index.html');
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
});

// Your other routes (e.g., /osc-data) remain the same
app.get('/osc-data', (req, res) => {
    console.log('Received a request for /osc-data');
    res.json({
        head: latestHeadData,
        spine: latestSpineData,
        bones: latestBoneData
    });  // Send the most recent movement data for head, spine, and bones
});

app.listen(3000, '0.0.0.0', () => {
    console.log('HTTP server running on http://192.168.0.113:3000');
});
