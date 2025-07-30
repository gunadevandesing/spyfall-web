"use client";
import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

export default function WebSocketSpyfall() {
  const [ws, setWs] = useState(null);
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({
    isPlaying: false,
    isSpy: false,
    location: null,
  });
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:3001`);

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
        case "ROOM_CREATED":
          window.location.href = `/ws/room/${
            data.code
          }?name=${encodeURIComponent(playerName)}`;
          break;
        case "ERROR":
          setError(data.message);
          setJoining(false);
          break;
        case "PLAYERS_UPDATED":
          setPlayers(data.players);
          break;
        case "GAME_STARTED":
          setGameState({
            isPlaying: true,
            isSpy: data.isSpy,
            location: data.location,
          });
          break;
        case "GAME_ENDED":
          setGameState({
            isPlaying: false,
            isSpy: false,
            location: null,
          });
          break;
      }
    };

    websocket.onclose = () => {
      console.log("WebSocket connection closed");
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, []);

  // Create a new room
  const handleCreateRoom = useCallback(() => {
    if (!playerName) {
      setError("Enter your name");
      return;
    }
    if (ws) {
      ws.send(
        JSON.stringify({
          type: "CREATE_ROOM",
          playerName,
        })
      );
    }
  }, [ws, playerName]);

  // Join an existing room
  const handleJoinRoom = useCallback(() => {
    if (!roomCode || !playerName) {
      setError("Enter room code and your name");
      return;
    }
    setJoining(true);
    setError("");

    if (ws) {
      ws.send(
        JSON.stringify({
          type: "JOIN_ROOM",
          roomCode,
          playerName,
        })
      );
    }
  }, [ws, roomCode, playerName]);

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-50">
      {/* Header */}
      <div className="w-full bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">
            Spyfall (WebSocket Version)
          </h1>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-md w-full mx-auto p-6 bg-white rounded-lg shadow-sm mt-6">
        <div className="space-y-6">
          {/* Player Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <input
              className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-gray-900"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
            />
          </div>

          {/* Create Room Button */}
          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            onClick={handleCreateRoom}
          >
            Create New Room
          </button>

          <div className="relative flex items-center gap-4 py-4">
            <div className="flex-grow border-t border-gray-200"></div>
            <span className="text-gray-500 text-sm">or</span>
            <div className="flex-grow border-t border-gray-200"></div>
          </div>

          {/* Join Room Section */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Room Code
              </label>
              <div className="flex gap-3">
                <input
                  className="flex-1 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all uppercase text-gray-900"
                  placeholder="Enter room code"
                  value={roomCode}
                  onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                  maxLength={6}
                />
                <button
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  onClick={handleJoinRoom}
                  disabled={joining}
                >
                  Join
                </button>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
