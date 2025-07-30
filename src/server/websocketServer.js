const WebSocket = require("ws");
const http = require("http");
const server = http.createServer();
const wss = new WebSocket.Server({ server });

// Store rooms and their players
const rooms = new Map();

wss.on("connection", (ws) => {
  let currentRoom = null;
  let playerName = null;

  ws.on("message", (message) => {
    const data = JSON.parse(message);

    switch (data.type) {
      case "CREATE_ROOM":
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        rooms.set(code, {
          location: null,
          spyId: null,
          players: new Map(),
          status: "waiting",
        });
        currentRoom = code;
        playerName = data.playerName;
        rooms.get(code).players.set(ws, { name: playerName });
        ws.send(JSON.stringify({ type: "ROOM_CREATED", code }));
        break;

      case "JOIN_ROOM":
        const room = rooms.get(data.roomCode);
        if (!room) {
          ws.send(JSON.stringify({ type: "ERROR", message: "Room not found" }));
          return;
        }
        currentRoom = data.roomCode;
        playerName = data.playerName;
        room.players.set(ws, { name: playerName });

        // Notify all players in the room
        const playersList = Array.from(room.players.values()).map(
          (p) => p.name
        );
        room.players.forEach((_, playerWs) => {
          playerWs.send(
            JSON.stringify({
              type: "PLAYERS_UPDATED",
              players: playersList,
            })
          );
        });
        break;

      case "START_GAME":
        const gameRoom = rooms.get(currentRoom);
        if (!gameRoom) return;

        const locations = [
          "Airport",
          "Bank",
          "Beach",
          "Hospital",
          "Hotel",
          "Military Base",
          "Movie Studio",
          "Ocean Liner",
          "Passenger Train",
          "Restaurant",
          "School",
          "Service Station",
          "Space Station",
          "Submarine",
          "Supermarket",
          "Theater",
          "University",
        ];

        const location =
          locations[Math.floor(Math.random() * locations.length)];
        const roomPlayers = Array.from(gameRoom.players.keys());
        const spyIndex = Math.floor(Math.random() * roomPlayers.length);

        gameRoom.location = location;
        gameRoom.spyId = spyIndex;
        gameRoom.status = "playing";

        roomPlayers.forEach((playerWs, index) => {
          playerWs.send(
            JSON.stringify({
              type: "GAME_STARTED",
              isSpy: index === spyIndex,
              location: index === spyIndex ? null : location,
            })
          );
        });
        break;

      case "END_GAME":
        const endingRoom = rooms.get(currentRoom);
        if (!endingRoom) return;

        endingRoom.players.forEach((_, playerWs) => {
          playerWs.send(
            JSON.stringify({
              type: "GAME_ENDED",
              location: endingRoom.location,
            })
          );
        });

        // Reset room state
        endingRoom.location = null;
        endingRoom.spyId = null;
        endingRoom.status = "waiting";
        break;
    }
  });

  ws.on("close", () => {
    if (currentRoom && rooms.has(currentRoom)) {
      const room = rooms.get(currentRoom);
      room.players.delete(ws);

      if (room.players.size === 0) {
        rooms.delete(currentRoom);
      } else {
        // Notify remaining players
        const updatedPlayers = Array.from(room.players.values()).map(
          (p) => p.name
        );
        room.players.forEach((_, playerWs) => {
          playerWs.send(
            JSON.stringify({
              type: "PLAYERS_UPDATED",
              players: updatedPlayers,
            })
          );
        });
      }
    }
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`WebSocket server is running on port ${PORT}`);
});
