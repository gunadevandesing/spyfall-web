"use client";
import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import React from "react";

export default function WebSocketRoom({ params }) {
  const searchParams = useSearchParams();
  const unwrappedParams = React.use(params);
  const [ws, setWs] = useState(null);
  const [playerName] = useState(searchParams.get("name") || "");
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState({
    isPlaying: false,
    isSpy: false,
    location: null,
  });

  useEffect(() => {
    const websocket = new WebSocket(`ws://localhost:3001`);

    websocket.onopen = () => {
      websocket.send(
        JSON.stringify({
          type: "JOIN_ROOM",
          roomCode: unwrappedParams.roomId,
          playerName,
        })
      );
    };

    websocket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      switch (data.type) {
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
            location: data.location,
          });
          break;
      }
    };

    setWs(websocket);

    return () => {
      websocket.close();
    };
  }, [unwrappedParams.roomId, playerName]);

  const handleStartGame = useCallback(() => {
    if (ws) {
      ws.send(JSON.stringify({ type: "START_GAME" }));
    }
  }, [ws]);

  const handleEndGame = useCallback(() => {
    if (ws) {
      ws.send(JSON.stringify({ type: "END_GAME" }));
    }
  }, [ws]);

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-4xl bg-white rounded-lg shadow-sm p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Room: {unwrappedParams.roomId}
            </h1>
            <p className="text-gray-600">Playing as: {playerName}</p>
          </div>
          {!gameState.isPlaying ? (
            <button
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium"
              onClick={handleStartGame}
            >
              Start Game
            </button>
          ) : (
            <button
              className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium"
              onClick={handleEndGame}
            >
              End Game
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Player List */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Players
            </h2>
            <ul className="space-y-2">
              {players.map((player, index) => (
                <li
                  key={index}
                  className="bg-white p-3 rounded-md shadow-sm text-gray-900"
                >
                  {player}
                </li>
              ))}
            </ul>
          </div>

          {/* Game Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">
              Game Status
            </h2>
            {gameState.isPlaying ? (
              <div>
                {gameState.isSpy ? (
                  <p className="text-red-600 font-bold">You are the Spy!</p>
                ) : (
                  <div>
                    <p className="font-medium text-gray-900">
                      You are not the spy
                    </p>
                    <p className="mt-2 text-gray-900">
                      Location: {gameState.location}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-900">Waiting to start...</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
