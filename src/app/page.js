"use client";
import Image from "next/image";
import { useState } from "react";
import { ref, set, get, child } from "firebase/database";
import { db } from "../lib/firebase";

export default function Home() {
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");

  // Create a new room
  const handleCreateRoom = async () => {
    if (!playerName) {
      setError("Enter your name");
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const roomRef = ref(db, `rooms/${code}`);
    await set(roomRef, {
      location: null,
      spyId: null,
      players: {},
      status: "waiting",
    });
    // Optionally, add player to room here
    window.location.href = `/room/${code}?name=${encodeURIComponent(
      playerName
    )}`;
  };

  // Join an existing room
  const handleJoinRoom = async () => {
    if (!roomCode || !playerName) {
      setError("Enter room code and your name");
      return;
    }
    setJoining(true);
    setError("");
    const snapshot = await get(child(ref(db), `rooms/${roomCode}`));
    if (!snapshot.exists()) {
      setError("Room not found");
      setJoining(false);
      return;
    }
    window.location.href = `/room/${roomCode}?name=${encodeURIComponent(
      playerName
    )}`;
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-50">
      {/* Header */}
      <div className="w-full bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-800">Spyfall</h1>
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
