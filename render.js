const WebSocket = require('ws');
const osc = require('osc');

// Replace this with your Render WebSocket server URL
const PUBLIC_WS_URL = 'wss://rotubestudio.onrender.com';

// Movement storage
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

// Connect to public server via WebSocket
let wsPublic = new WebSocket(PUBLIC_WS_URL);

wsPublic.on('open', () => {
    console.log('Connected to public WebSocket server!');
});

wsPublic.on('close', () => {
    console.log('Public WebSocket closed, reconnecting in 2s...');
    setTimeout(() => {
        wsPublic = new WebSocket(PUBLIC_WS_URL);
    }, 2000);
});

wsPublic.on('error', (err) => {
    console.error('WebSocket error:', err.message);
});

// Handle incoming OSC messages
udpPort.on('message', (oscMessage) => {
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
        const bone = oscMessage.args[0];
        const rotation = oscMessage.args.slice(1);
        switch (bone) {
            case 'Chest': latestBoneData.chest = { rotation }; break;
            case 'UpperChest': latestBoneData.upperChest = { rotation }; break;
            case 'LeftShoulder': latestBoneData.leftShoulder = { rotation }; break;
            case 'RightShoulder': latestBoneData.rightShoulder = { rotation }; break;
            case 'Neck': latestBoneData.neck = { rotation }; break;
            case 'LeftEye': latestBoneData.leftEye = { rotation }; break;
            case 'RightEye': latestBoneData.rightEye = { rotation }; break;
        }
    }

    // Push to buffer
    const frame = { head: latestHeadData, spine: latestSpineData, bones: latestBoneData };
    movementBuffer.push(frame);
    if (movementBuffer.length > 4) movementBuffer.shift();

    // Send to public WebSocket if connected
    if (wsPublic.readyState === WebSocket.OPEN) {
        wsPublic.send(JSON.stringify(frame));
    }
});

udpPort.open();

// Optional: local WebSocket for local clients
const wss = new WebSocket.Server({ host: '0.0.0.0', port: 8080 });
wss.on('connection', (ws) => {
    console.log('Local WebSocket connected');
    ws.send(JSON.stringify({ message: "Local WebSocket connected!" }));

    const interval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(movementBuffer));
        }
    }, 125);

    ws.on('close', () => clearInterval(interval));
});

console.log('Local OSC sender running, forwarding frames to public WebSocket server...');
