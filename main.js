// main.js

// Global references to DOM elements
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const joinBtn = document.getElementById('joinBtn');
const roomInput = document.getElementById('roomInput');

// We'll store these so we can reuse them
let localStream = null;
let peer = null;
let currentCall = null;

// On 'Create or Join' button click, set up the Peer and attempt a call
joinBtn.addEventListener('click', async () => {
  const roomCode = roomInput.value.trim();
  if (!roomCode) {
    alert('Please enter a room code!');
    return;
  }
  await initLocalStream();

  // Initialize a Peer instance with the roomCode as the ID 
  // (If that ID is taken, PeerJS will throw an error and we handle that)
  peer = new Peer(roomCode, {
    debug: 2
  });

  peer.on('open', (id) => {
    console.log('Peer opened with ID:', id);
    // If a second user arrives with same ID, they will call us,
    // or we might try to call them. We decide approach in 'error' event below.
  });

  // If someone calls this peer, automatically answer with our local stream
  peer.on('call', (call) => {
    console.log('Received a call, answering...');
    currentCall = call;
    call.answer(localStream);
    setupCallEvents(call);
  });

  // Handle peer connection errors (e.g., if ID is already in use).
  // Often you want to fallback to a random ID in that case.
  peer.on('error', (err) => {
    console.error(err);
    if (err.type === 'unavailable-id') {
      alert('Room code is already in use. Trying to join that room...');
      // If the ID is in use, it likely means there's already a host,
      // so let's create a new Peer with a random ID but then dial the room code.
      peer = new Peer(null, { debug: 2 });
      peer.on('open', () => {
        console.log('New random peer ID created, now calling existing peer with code:', roomCode);
        callPeer(roomCode);
      });
      peer.on('call', (call) => {
        // The existing peer might try calling us too; answer that
        currentCall = call;
        call.answer(localStream);
        setupCallEvents(call);
      });
    }
  });
});

// Calls a peer (the 'roomCode' which is the peer's ID)
function callPeer(roomCode) {
  const call = peer.call(roomCode, localStream);
  currentCall = call;
  setupCallEvents(call);
}

// Common call events so we can see the remote stream
function setupCallEvents(call) {
  call.on('stream', (remoteStream) => {
    console.log('Received remote stream');
    remoteVideo.srcObject = remoteStream;
  });

  call.on('close', () => {
    console.log('Call ended');
    remoteVideo.srcObject = null;
  });

  call.on('error', (err) => {
    console.error('Call error:', err);
    remoteVideo.srcObject = null;
  });
}

// Grabs local camera/microphone stream and shows it
async function initLocalStream() {
  if (localStream) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    localVideo.srcObject = localStream;
  } catch (err) {
    console.error('Failed to get local stream', err);
    alert('Could not access camera/microphone. Check permissions!');
  }
}
