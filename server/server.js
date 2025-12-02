const io = require("socket.io")(process.env.PORT || 3001, {
  cors: {
    origin: "*",
  },
});

let createdRooms = new Set(); // Track rooms that have been created
let roomVideoState = {}; // Store video state per room
let roomMessages = {}; // Store messages per room

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  // Handle room creation
  socket.on("create-room", (roomId, callback) => {
    if (!roomId) {
      if (callback) callback({ success: false, message: "Invalid room ID" });
      return;
    }
    
    createdRooms.add(roomId);
    console.log(`Room created: ${roomId}`);
    
    if (callback) callback({ success: true, message: "Room created successfully" });
  });

  // Check if a room exists
  socket.on("check-room", (roomId, callback) => {
    if (!roomId) {
      if (callback) callback({ exists: false, message: "Invalid room ID" });
      return;
    }

    const exists = createdRooms.has(roomId);
    const usersInRoom = getUsersInRoom(roomId).length;
    
    console.log(`Room check: ${roomId} - exists: ${exists}, users: ${usersInRoom}`);
    
    if (callback) {
      callback({ 
        exists: exists, 
        usersCount: usersInRoom,
        message: exists ? "Room found" : "Room does not exist" 
      });
    }
  });

  // Handle user joining a room
  socket.on("join-room", (roomId, callback) => {
    if (!roomId) {
      if (callback) callback({ success: false, message: "Invalid room ID" });
      return;
    }

    // Auto-create room if it doesn't exist (allows sharing room links)
    if (!createdRooms.has(roomId)) {
      createdRooms.add(roomId);
      console.log(`Room ${roomId} auto-created on join`);
    }

    socket.join(roomId);
    console.log(`User ${socket.id} joined room ${roomId}`);

    io.to(roomId).emit("room-users", getUsersInRoom(roomId));

    // Send current video state to the new user
    if (roomVideoState[roomId]) {
      const { videoId, isPlaying, videoTitle } = roomVideoState[roomId];
      socket.emit("play-video", videoId, videoTitle);
      socket.emit("video-state", isPlaying);
    }

    // Send previous messages to the new user
    if (roomMessages[roomId] && roomMessages[roomId].length > 0) {
      roomMessages[roomId].forEach(msg => {
        socket.emit("receive-message", msg);
      });
    }

    if (callback) callback({ success: true, message: "Joined room successfully" });
  });

  // Handle video play event
  socket.on("play-video", (roomId, videoId, videoTitle) => {
    if (!roomId || !videoId) {
      console.error("Invalid play-video event received:", { roomId, videoId });
      return;
    }

    console.log(`Playing video in room ${roomId}: ${videoId} - ${videoTitle || "Untitled"}`);

    roomVideoState[roomId] = { videoId, videoTitle: videoTitle || "Untitled", isPlaying: true };
    io.to(roomId).emit("play-video", videoId, videoTitle || "Untitled");
    io.to(roomId).emit("video-state", true);
  });

  // Handle video pause event
  socket.on("pause-video", (roomId) => {
    if (!roomId || !roomVideoState[roomId]) {
      console.error(`Room ${roomId} video state not found for pause`);
      return;
    }

    console.log(`Pausing video in room ${roomId}`);
    roomVideoState[roomId].isPlaying = false;
    io.to(roomId).emit("pause-video");
    io.to(roomId).emit("video-state", false);
  });

  // Handle video seek event (forward/backward)
  socket.on("seek-video", (roomId, time) => {
    if (!roomId || typeof time !== 'number') return;
    
    console.log(`Seeking video in room ${roomId} to ${time}s`);
    
    // Broadcast seek to ALL users in the room (including sender for sync)
    io.to(roomId).emit("seek-video", time);
  });

  // Handle message sending
  socket.on("send-message", (data) => {
    const { roomId, message, senderId, type, content } = data;

    if (!roomId || !senderId || (type === "text" && !message) || (type === "media" && !content)) {
      console.error("Invalid message data received:", data);
      return;
    }

    console.log(`Message in room ${roomId} from ${senderId}:`, message);

    if (!roomMessages[roomId]) {
      roomMessages[roomId] = [];
    }

    roomMessages[roomId].push({ type, message, senderId, content });

    // Broadcast the message to the room
    io.to(roomId).emit("receive-message", { type, message, senderId, content });
  });

  // Handle user disconnection
  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);

    // Remove user from all rooms and cleanup empty rooms
    for (const roomId of socket.rooms) {
      if (roomId !== socket.id) {
        socket.leave(roomId);
        console.log(`User ${socket.id} left room ${roomId}`);

        // Check if the room is empty, then clean up
        const usersLeft = getUsersInRoom(roomId).length;
        if (usersLeft === 0) {
          // Keep room in createdRooms for 30 minutes after last user leaves
          setTimeout(() => {
            if (getUsersInRoom(roomId).length === 0) {
              createdRooms.delete(roomId);
              delete roomVideoState[roomId];
              delete roomMessages[roomId];
              console.log(`Room ${roomId} expired and cleaned up.`);
            }
          }, 30 * 60 * 1000); // 30 minutes
          
          console.log(`Room ${roomId} is empty. Will expire in 30 minutes if no one joins.`);
        }
        
        // Update room users count
        io.to(roomId).emit("room-users", getUsersInRoom(roomId));
      }
    }
  });
});

// Helper function to get users in a room
function getUsersInRoom(roomId) {
  const clients = io.sockets.adapter.rooms.get(roomId);
  return clients ? Array.from(clients) : [];
}

console.log("Socket.io server running on port", process.env.PORT || 3001);
