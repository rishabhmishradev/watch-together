const socket = io();
let player;
let isPlayerReady = false;

// YouTube API ready callback
function onYouTubeIframeAPIReady() {
  // This will be called when YouTube API loads
}

// Load YouTube API
if (!window.YT) {
  const tag = document.createElement('script');
  tag.src = "https://www.youtube.com/iframe_api";
  const firstScriptTag = document.getElementsByTagName('script')[0];
  firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
}

// Load video
function loadVideo() {
  let url = document.getElementById("videoUrl").value;
  let videoId = extractVideoID(url);

  if (videoId) {
    socket.emit("loadVideo", videoId);
  } else {
    alert("Invalid YouTube URL!");
  }
}

// Receive load video
socket.on("loadVideo", function(videoId) {
  initializePlayer(videoId);
});

// Initialize YouTube player
function initializePlayer(videoId) {
  if (player) {
    player.destroy();
  }
  
  player = new YT.Player('player', {
    videoId: videoId,
    width: '800',
    height: '450',
    playerVars: {
      'enablejsapi': 1,
      'origin': window.location.origin
    },
    events: {
      'onReady': function(event) {
        isPlayerReady = true;
        console.log('Player ready');
      },
      'onStateChange': function(event) {
        // Prevent infinite loop by checking if this is a user action
        if (!socket.receivingSync) {
          if (event.data == YT.PlayerState.PLAYING) {
            const currentTime = player.getCurrentTime();
            socket.emit("videoSync", {
              action: "play",
              time: currentTime,
              timestamp: Date.now()
            });
          } else if (event.data == YT.PlayerState.PAUSED) {
            const currentTime = player.getCurrentTime();
            socket.emit("videoSync", {
              action: "pause",
              time: currentTime,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  });
}

// Manual controls
function controlVideo(action) {
  if (!isPlayerReady) {
    alert("Player not ready yet!");
    return;
  }
  
  const currentTime = player.getCurrentTime();
  socket.emit("videoSync", {
    action: action,
    time: currentTime,
    timestamp: Date.now()
  });
}

// Sync video with timestamp
socket.on("videoSync", function(data) {
  if (!isPlayerReady) return;
  
  socket.receivingSync = true; // Flag to prevent loop
  
  // Calculate time difference for network delay compensation
  const networkDelay = (Date.now() - data.timestamp) / 1000;
  let targetTime = data.time;
  
  if (data.action === "play") {
    // Compensate for network delay if playing
    targetTime += networkDelay;
    player.seekTo(targetTime, true);
    player.playVideo();
  } else if (data.action === "pause") {
    player.seekTo(data.time, true);
    player.pauseVideo();
  } else if (data.action === "seek") {
    player.seekTo(data.time, true);
  }
  
  // Reset flag after a short delay
  setTimeout(() => {
    socket.receivingSync = false;
  }, 1000);
});

// Seek function
function seekVideo() {
  const seekTime = parseFloat(document.getElementById("seekTime").value);
  if (isNaN(seekTime)) {
    alert("Enter valid time in seconds!");
    return;
  }
  
  socket.emit("videoSync", {
    action: "seek",
    time: seekTime,
    timestamp: Date.now()
  });
}

// Get current time (for debugging)
function getCurrentTime() {
  if (player && isPlayerReady) {
    console.log("Current time:", player.getCurrentTime());
  }
}

// Extract YT Video ID
function extractVideoID(url) {
  let regex = /(?:youtube\.com\/.*v=|youtu\.be\/|youtube\.com\/live\/)([^&?/]+)/;
  let match = url.match(regex);
  return match ? match[1] : null;
}

// Connection events
socket.on('connect', function() {
  console.log('Connected to server');
});

socket.on('disconnect', function() {
  console.log('Disconnected from server');
});

// Handle user count updates
socket.on('userCount', function(data) {
  console.log('User count received:', data);
  const userCountText = document.getElementById('userCountText');
  
  if (userCountText) {
    const count = data.count;
    
    // Update counter text with proper grammar
    if (count === 0) {
      userCountText.textContent = 'No one watching';
    } else if (count === 1) {
      userCountText.textContent = '1 person watching';
    } else {
      userCountText.textContent = `${count} people watching`;
    }
    
    console.log(`Users online: ${count}`);
  } else {
    console.error('userCountText element not found!');
  }
});