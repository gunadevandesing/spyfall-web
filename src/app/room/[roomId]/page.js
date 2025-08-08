"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "../../../lib/firebase";

import React from "react";
import LOCATION_ROLES from "../../../lib/locationRoles";
export default function Room({ params }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const unwrappedParams = React.use(params);
  const roomId = unwrappedParams?.roomId || "";
  const playerName = searchParams.get("name") || "";

  const [room, setRoom] = useState(null);
  const [playerId, setPlayerId] = useState("");
  const [error, setError] = useState("");
  const [gameData, setGameData] = useState({
    playerName: "",
    role: "",
    location: "",
    players: {},
    timeLimit: 8, // Default 8 minutes
    gameEndTime: null,
    votes: {},
    votingOpen: false,
    remainingTime: null,
  });

  // Timer countdown effect
  useEffect(() => {
    if (!room || room.status !== "started" || !room.gameEndTime) return;

    const updateTimer = () => {
      const now = Date.now();
      const remaining = Math.max(0, room.gameEndTime - now);

      if (remaining === 0 && !room.votingOpen) {
        // Time's up - open voting
        update(ref(db, `rooms/${roomId}`), { votingOpen: true });
        return;
      }

      // Convert to minutes and seconds for more precise countdown
      const totalSeconds = Math.floor(remaining / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;

      setGameData((prev) => ({
        ...prev,
        remainingTime: minutes + seconds / 60, // Store as decimal for smooth countdown
      }));
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [room?.gameEndTime, room?.status, roomId]);

  // Listen to room data
  useEffect(() => {
    if (!roomId || !playerName) return;
    const roomRef = ref(db, `rooms/${roomId}`);
    const unsub = onValue(roomRef, (snapshot) => {
      if (snapshot.exists()) {
        const roomData = snapshot.val();
        setRoom(roomData);

        // Handle player leaving during game
        if (roomData.status === "started") {
          // If a player left during game, they'll be in playerNames but not in roles
          const activePlayers = {};
          Object.entries(roomData.playerNames || {}).forEach(([id, name]) => {
            if (roomData.roles?.[id]) {
              // Only include players who haven't left
              activePlayers[id] = name;
            }
          });

          setGameData((prev) => ({
            ...prev,
            playerName,
            role: roomData.roles?.[playerId] || "",
            location: roomData.location || "",
            players: activePlayers,
          }));
        } else {
          setGameData((prev) => ({
            ...prev,
            playerName,
            role: "",
            location: "",
            players: roomData.players || {},
          }));
        }
      } else {
        setError("Room not found");
      }
    });
    return () => unsub();
  }, [roomId, playerId, playerName]);

  // Register player if not already in room
  useEffect(() => {
    if (!room || !playerName) return;
    const players = room.players || {};
    let foundId = Object.keys(players).find((id) => players[id] === playerName);
    if (!foundId) {
      // Add player
      const newId = `user${Date.now()}`;
      set(ref(db, `rooms/${roomId}/players/${newId}`), playerName);
      setPlayerId(newId);
    } else {
      setPlayerId(foundId);
    }
  }, [room, playerName, roomId]);

  if (error) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-red-500">{error}</div>
        <button
          className="text-gray-900 mt-4 underline"
          onClick={() => router.push("/")}
        >
          Back to Home
        </button>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
        <div className="w-full max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-sm">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <div className="text-lg text-gray-600 font-medium">
              Loading game room...
            </div>
            <div className="text-sm text-gray-500">
              Please wait while we set things up
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Host is the first player in the list
  const isHost = room && Object.keys(room.players || {})[0] === playerId;
  const isSpy = gameData.role === "Spy";

  // Location to roles mapping is now imported from src/lib/locationRoles.js

  // Get list of locations and all possible roles
  const LOCATIONS = Object.keys(LOCATION_ROLES);
  const ROLES = [...new Set(Object.values(LOCATION_ROLES).flat())];

  // Helper function to prepare game data
  const prepareGameData = (players) => {
    const playerIds = Object.keys(players);
    if (playerIds.length < 3) {
      throw new Error("At least 3 players required to start the game.");
    }

    // Save current player names
    const playerNames = {};
    Object.entries(players).forEach(([id, name]) => {
      playerNames[id] = name;
    });

    // Random location
    const location = LOCATIONS[Math.floor(Math.random() * LOCATIONS.length)];

    // Random spy
    const spyIdx = Math.floor(Math.random() * playerIds.length);
    const spyId = playerIds[spyIdx];

    // Get roles for the chosen location
    const locationRoles = LOCATION_ROLES[location];

    // Assign unique roles from the location's role pool (except spy)
    const shuffledRoles = [...locationRoles]
      .sort(() => 0.5 - Math.random())
      .slice(0, playerIds.length - 1); // -1 for spy

    const roles = {};
    let roleIdx = 0;

    playerIds.forEach((id) => {
      if (id === spyId) {
        roles[id] = "Spy";
      } else {
        roles[id] = shuffledRoles[roleIdx];
        roleIdx++;
      }
    });

    return { location, spyId, roles, playerNames };
  };

  // Start game: assign location, spy, and unique roles
  const handleStartGame = async () => {
    if (!room) return;

    try {
      const { location, spyId, roles, playerNames } = prepareGameData(
        room.players || {}
      );
      const timeLimit = Math.max(1, Math.min(30, gameData.timeLimit || 8));
      const gameEndTime = Date.now() + timeLimit * 60 * 1000;

      await update(ref(db, `rooms/${roomId}`), {
        location,
        spyId,
        roles,
        playerNames,
        status: "started",
        gameEndTime,
        timeLimit: gameData.timeLimit,
        votes: {},
        votingOpen: false,
        spyRevealed: false, // Initialize spyRevealed
      });
    } catch (error) {
      alert(error.message);
    }
  };

  // Handle voting for a player
  const handleVote = async (votedPlayerId) => {
    if (!room || !playerId || !room.votingOpen) return;

    try {
      // Update the vote in Firebase using proper structure
      await update(ref(db, `rooms/${roomId}`), {
        [`votes/${playerId}`]: votedPlayerId,
      });

      // Get updated votes including the new vote
      const votes = { ...(room.votes || {}), [playerId]: votedPlayerId };
      const totalVotes = Object.keys(votes).length;
      const totalPlayers = Object.keys(room.players || {}).length;

      if (totalVotes === totalPlayers) {
        // Count votes
        const voteCounts = {};
        Object.values(votes).forEach((vote) => {
          voteCounts[vote] = (voteCounts[vote] || 0) + 1;
        });

        // Find player with most votes
        let maxVotes = 0;
        let votedPlayer = null;
        Object.entries(voteCounts).forEach(([player, count]) => {
          if (count > maxVotes) {
            maxVotes = count;
            votedPlayer = player;
          }
        });

        await update(ref(db, `rooms/${roomId}`), {
          votingResult: {
            votedPlayer,
            votes: voteCounts,
          },
        });
      }
    } catch (error) {
      alert(error.message);
    }
  };

  const handleEndGame = async () => {
    if (!room) return;

    try {
      await update(ref(db, `rooms/${roomId}`), {
        location: null,
        spyId: null,
        roles: null,
        status: "ended",
        votingOpen: false,
        votes: null,
        votingResult: null,
        gameEndTime: null,
      });
    } catch (error) {
      alert(error.message);
    }
  };

  // Exit room: remove player and go home
  const handleExitRoom = async () => {
    if (!roomId || !playerId) {
      router.push("/");
      return;
    }

    const currentPlayers = room.players || {};
    delete currentPlayers[playerId];

    if (Object.keys(currentPlayers).length === 0) {
      // Last player leaving, remove the entire room
      await set(ref(db, `rooms/${roomId}`), null);
    } else {
      // Remove player from all relevant locations
      const updates = {};

      if (room.status === "started") {
        // Remove from roles and playerNames during game
        updates[`/roles/${playerId}`] = null;
        updates[`/playerNames/${playerId}`] = null;
      } else {
        // Remove from players list before game starts
        updates[`/players/${playerId}`] = null;
      }

      if (isHost) {
        // If host is leaving, update the players list
        updates["/players"] = currentPlayers;
      }

      await update(ref(db, `rooms/${roomId}`), updates);
    }

    router.push("/");
  };

  // Timer display helper
  const formatTime = (minutes) => {
    if (!minutes && minutes !== 0) return "";
    const mins = Math.floor(minutes);
    const secs = Math.floor((minutes - mins) * 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-50">
      {/* Header with exit button */}
      <div className="w-full bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Room: {roomId}</h1>
            {room?.status === "started" && gameData.remainingTime !== null && (
              <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-medium">
                Time: {formatTime(gameData.remainingTime)}
              </div>
            )}
            <button
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm flex items-center gap-2 transition-colors"
              onClick={() => {
                navigator.clipboard.writeText(roomId);
                alert("Room ID copied to clipboard!");
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              Copy Room ID
            </button>
          </div>
          <button
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-md transition-colors flex items-center gap-2"
            onClick={handleExitRoom}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M3 3a1 1 0 00-1 1v12a1 1 0 001 1h12a1 1 0 001-1V4a1 1 0 00-1-1H3zm11 3a1 1 0 10-2 0v6a1 1 0 102 0V6zm-8 7a1 1 0 100 2h4a1 1 0 100-2H6z"
                clipRule="evenodd"
              />
            </svg>
            Exit Room
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-2xl w-full mx-auto p-6 bg-white rounded-lg shadow-sm mt-6">
        <div className="space-y-6">
          {/* Game Status */}
          <div className="flex justify-between items-center pb-4 border-b border-gray-200">
            <div className="space-y-1">
              <div className="text-sm text-gray-500">Status</div>
              <div className="font-medium text-gray-900 capitalize">
                {room.status}
              </div>
            </div>
            <div className="space-y-1 text-right">
              <div className="text-sm text-gray-500">Player</div>
              <div className="font-medium text-gray-900">{playerName}</div>
            </div>
          </div>

          {/* Role Information */}
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <h2 className="font-semibold text-gray-900 mb-2">Your Role</h2>
            {room.status === "started" ? (
              isSpy ? (
                <div className="text-red-600 font-medium flex items-center gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-5 w-5"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-14-14z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Spy (Location is hidden)
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-green-600 font-medium">
                    {gameData.role}
                  </div>
                  <div className="text-gray-600">
                    at{" "}
                    <span className="font-medium text-gray-900">
                      {gameData.location}
                    </span>
                  </div>
                </div>
              )
            ) : (
              <div className="text-gray-500 italic">
                Waiting for game to start...
              </div>
            )}
          </div>

          {/* Players List */}
          <div className="p-4 rounded-lg border border-gray-200">
            <h2 className="font-semibold text-gray-900 mb-3">Players</h2>
            <ul className="space-y-2">
              {Object.entries(gameData.players).map(([id, name]) => (
                <li
                  key={id}
                  className="flex items-center justify-between gap-2 text-gray-700"
                >
                  <div className="flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {name}
                  </div>
                  {room.votingOpen &&
                    id !== playerId &&
                    !room.votingResult &&
                    !room.votes?.[playerId] && (
                      <button
                        onClick={() => handleVote(id)}
                        className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
                      >
                        Vote
                      </button>
                    )}
                  {room.votes?.[playerId] === id && (
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-medium">
                      Voted for this player
                    </span>
                  )}
                  {room.votes?.[id] &&
                    room.votingOpen &&
                    !room.votingResult && (
                      <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded font-medium">
                        Has Voted
                      </span>
                    )}
                  {room.votingResult?.votedPlayer === id && (
                    <span
                      className={`px-3 py-1 rounded font-medium ${
                        room.votingResult.wasSpy
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {room.votingResult.wasSpy
                        ? "Was the Spy!"
                        : "Not the Spy"}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Game Controls */}
          {isHost ? (
            <div className="space-y-4">
              {room.status === "started" ? (
                <button
                  className="w-full bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  onClick={handleEndGame}
                >
                  End Game
                </button>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <label
                        htmlFor="timeLimit"
                        className="text-sm font-medium text-gray-700"
                      >
                        Game Duration:
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          id="timeLimit"
                          type="number"
                          min="1"
                          max="30"
                          value={gameData.timeLimit || 8}
                          onChange={(e) =>
                            setGameData((prev) => ({
                              ...prev,
                              timeLimit: Math.max(
                                1,
                                Math.min(30, parseInt(e.target.value) || 8)
                              ),
                            }))
                          }
                          className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-gray-600">minutes</span>
                      </div>
                    </div>
                  </div>
                  <button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    onClick={handleStartGame}
                  >
                    {room.status === "ended" ? "Start New Game" : "Start Game"}
                  </button>
                </div>
              )}
              {room.votingResult && (
                <div
                  className={`p-4 rounded-lg ${
                    room.votingResult.wasSpy
                      ? "bg-green-50 text-green-800"
                      : "bg-red-50 text-red-800"
                  }`}
                >
                  <p className="font-medium">
                    Game Over! {room.players[room.votingResult.votedPlayer]} was{" "}
                    {room.votingResult.wasSpy ? "" : "not "}the spy.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-lg">
              {room.status === "started"
                ? room.votingOpen
                  ? "Voting in progress... Wait for all players to vote!"
                  : "Game in progress..."
                : "Waiting for host to start the game..."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

