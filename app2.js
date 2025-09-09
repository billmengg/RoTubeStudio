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

let movementBuffer = [];  // Buffer to store last four movement frames

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
    if (oscMessage.address === '/VMC/Ext/Bone/Pos') {
        const boneName = oscMessage.args[0];
        // Only update the listed bones
        if (boneName === 'Chest') {
            latestBoneData.chest = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        } else if (boneName === 'UpperChest') {
            latestBoneData.upperChest = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        } else if (boneName === 'LeftShoulder') {
            latestBoneData.leftShoulder = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        } else if (boneName === 'RightShoulder') {
            latestBoneData.rightShoulder = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        } else if (boneName === 'Neck') {
            latestBoneData.neck = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        } else if (boneName === 'LeftEye') {
            latestBoneData.leftEye = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        } else if (boneName === 'RightEye') {
            latestBoneData.rightEye = {
                rotation: oscMessage.args.slice(1),  // Get the rest of the values (rotation data)
            };
        }
    }

    // Deep copy snapshot
    const snapshot = {
        head: { ...latestHeadData },
        spine: { ...latestSpineData },
        bones: JSON.parse(JSON.stringify(latestBoneData))
    };

    // Small rolling buffer of last 8 snapshots
    if (!global.latestSnapshots) global.latestSnapshots = [];
    global.latestSnapshots.push(snapshot);
    if (global.latestSnapshots.length > 8) global.latestSnapshots.shift();

    // Update movementBuffer (for HTTP /osc-data)
    movementBuffer = global.latestSnapshots.slice();

    // No need to update labeledBuffer here; labeling will be done per request

});

udpPort.open();

// WebSocket Server
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });
wss.on('connection', (ws) => {
    console.log('WebSocket connected');
    ws.send(JSON.stringify({ message: "WebSocket connected!" }));

    // Send the last eight movement frames every 125ms, labeled 1-8
    setInterval(() => {
        if (global.latestSnapshots && global.latestSnapshots.length) {
            const labeled = global.latestSnapshots
                .slice(-8)
                .map((frame, idx) => ({ [idx + 1]: frame }));
            ws.send(JSON.stringify(labeled));
        }
    }, 125);
});

// Serve the index.html file correctly
app.get('/', (req, res) => {
    console.log('Received a request for /');
    const indexPath = path.join(__dirname, 'index.html');
    console.log(`Serving index.html from: ${indexPath}`);
    res.sendFile(indexPath);
});

// Route to return the last eight frames of movement data in JSON format, labeled 1-8
app.get('/osc-data', (req, res) => {
    console.log('Received a request for /osc-data');
    if (global.latestSnapshots && global.latestSnapshots.length) {
        const labeled = global.latestSnapshots
            .slice(-8)
            .map((frame, idx) => ({ [idx + 1]: frame }));
        res.json(labeled);
    } else {
        res.json([]);
    }
});

app.listen(3000, '0.0.0.0', () => {
    console.log('HTTP server running on http://192.168.0.113:3000');
});
