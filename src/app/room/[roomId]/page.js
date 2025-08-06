"use client";
import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ref, onValue, set, update } from "firebase/database";
import { db } from "../../../lib/firebase";

import React from "react";
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
  });

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

          setGameData({
            playerName,
            role: roomData.roles?.[playerId] || "",
            location: roomData.location || "",
            players: activePlayers,
          });
        } else {
          setGameData({
            playerName,
            role: "",
            location: "",
            players: roomData.players || {},
          });
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
    return <div className="p-4 text-gray-900">Loading room...</div>;
  }

  // Host is the first player in the list
  const isHost = room && Object.keys(room.players || {})[0] === playerId;
  const isSpy = gameData.role === "Spy";

  // Location to roles mapping
  const LOCATION_ROLES = {
    "Film Studio": [
      "Film Director",
      "Lead Actor/Actress",
      "Choreographer",
      "Music Director",
      "Costume Designer",
      "Playback Singer",
      "Set Designer",
      "Camera Operator",
      "Light Technician",
      "Sound Engineer",
      "Makeup Artist",
      "Stunt Coordinator",
      "Junior Artist",
      "Production Assistant",
    ],
    "Cricket Stadium": [
      "Team Captain",
      "Head Coach",
      "Fast Bowler",
      "Spin Bowler",
      "Wicket Keeper",
      "Cricket Commentator",
      "Pitch Curator",
      "Team Doctor",
      "Fielding Coach",
      "Video Analyst",
      "Stadium Manager",
      "Groundsman",
      "Scoreboard Operator",
      "Security Head",
    ],
    "Tech Park Office": [
      "Project Manager",
      "Senior Developer",
      "QA Engineer",
      "HR Manager",
      "System Admin",
      "Team Lead",
      "Client Coordinator",
      "DevOps Engineer",
      "UI/UX Designer",
      "Scrum Master",
      "Product Owner",
      "Data Analyst",
      "Technical Writer",
      "Facilities Manager",
    ],
    "Wedding Venue": [
      "Wedding Planner",
      "Head Chef",
      "Mehendi Artist",
      "Photographer",
      "Priest/Pandit",
      "Decorator",
      "Music Band Leader",
      "Videographer",
      "Catering Manager",
      "Light Technician",
      "Valet Parking Staff",
      "Makeup Artist",
      "Security Guard",
      "Guest Relations",
    ],
    "Local Railway Station": [
      "Station Master",
      "Ticket Collector",
      "Tea Vendor",
      "Railway Police",
      "Platform Inspector",
      "Food Stall Owner",
      "Coolie/Porter",
      "Cleaning Supervisor",
      "Announcement Officer",
      "Signal Operator",
      "Booking Clerk",
      "Railway Engineer",
      "Luggage Office Staff",
      "Medical Room Staff",
    ],
    "Shopping Mall": [
      "Mall Manager",
      "Store Owner",
      "Security Guard",
      "Food Court Chef",
      "Cinema Manager",
      "Maintenance Staff",
      "Customer Service Rep",
      "Parking Supervisor",
      "Housekeeping Head",
      "Display Designer",
      "Game Zone Operator",
      "HVAC Technician",
      "Lost & Found Staff",
      "Events Coordinator",
    ],
    Hospital: [
      "Chief Doctor",
      "Head Nurse",
      "Pharmacist",
      "Lab Technician",
      "Reception Manager",
      "Ambulance Driver",
      "Ward Assistant",
      "Radiologist",
      "Physiotherapist",
      "Security Guard",
      "Dietitian",
      "Blood Bank Officer",
      "ICU Specialist",
      "Hospital Administrator",
    ],
    "College Campus": [
      "Principal",
      "Professor",
      "Lab Assistant",
      "Librarian",
      "Canteen Owner",
      "Sports Coach",
      "Student Council President",
      "Placement Officer",
      "Computer Lab Admin",
      "Administrative Staff",
      "Campus Security",
      "Hostel Warden",
      "College Counselor",
      "Maintenance Supervisor",
    ],
    "Five Star Hotel": [
      "General Manager",
      "Executive Chef",
      "Concierge",
      "Spa Manager",
      "Restaurant Host",
      "Housekeeping Head",
      "Valet Parking Staff",
      "Front Office Manager",
      "Bellboy",
      "Food & Beverage Director",
      "Room Service Staff",
      "Event Coordinator",
      "Pool Lifeguard",
      "Hotel Security",
    ],
    "Government Office": [
      "Senior Officer",
      "Clerk",
      "Peon",
      "Document Writer",
      "Security Guard",
      "IT Support",
      "Public Relations Officer",
      "Office Superintendent",
      "Accounts Officer",
      "Data Entry Operator",
      "Records Manager",
      "Administrative Assistant",
      "Dispatch Clerk",
      "Facility Manager",
    ],
    "Local Market": [
      "Vegetable Vendor",
      "Fruit Seller",
      "Spice Merchant",
      "Flower Shop Owner",
      "Street Food Vendor",
      "Jewelry Shop Owner",
      "Market Inspector",
      "Cloth Merchant",
      "Mobile Shop Owner",
      "Wholesale Dealer",
      "Cart Puller",
      "Tea Shop Owner",
      "Local Police",
      "Market Association Head",
    ],
    "Temple Complex": [
      "Head Priest",
      "Temple Administrator",
      "Prasad Distributor",
      "Devotional Singer",
      "Temple Guard",
      "Flower Garland Maker",
      "Donation Counter",
      "Temple Trustee",
      "Kitchen Manager",
      "Maintenance Staff",
      "Gift Shop Owner",
      "Shoe Stand Keeper",
      "Cleaning Staff",
      "Guide",
    ],
    "Metro Station": [
      "Station Controller",
      "Ticket Booth Officer",
      "Security Personnel",
      "Maintenance Engineer",
      "Customer Care Rep",
      "Cleaning Supervisor",
      "Shop Vendor",
      "Platform Supervisor",
      "CCTV Operator",
      "Escalator Technician",
      "Lost & Found Officer",
      "First Aid Staff",
      "Train Operator",
      "Information Desk Staff",
    ],
    "Street Food Corner": [
      "Chaat Wala",
      "Pani Puri Vendor",
      "Dosa Maker",
      "Tea Master",
      "Juice Vendor",
      "Helper",
      "Regular Customer",
      "Chinese Food Vendor",
      "Chat Shop Owner",
      "Ice Cream Seller",
      "Biryani Vendor",
      "Sandwich Maker",
      "Delivery Boy",
      "Health Inspector",
    ],
    "Modern Gym": [
      "Gym Manager",
      "Personal Trainer",
      "Yoga Instructor",
      "Dietitian",
      "Front Desk Staff",
      "Equipment Maintenance",
      "Zumba Instructor",
      "CrossFit Trainer",
      "Membership Coordinator",
      "Locker Room Attendant",
      "Physiotherapist",
      "Supplement Shop Owner",
      "Cleaning Staff",
      "CCTV Monitor",
    ],
    "Public Park": [
      "Park Manager",
      "Gardener",
      "Security Guard",
      "Yoga Teacher",
      "Walking Club Leader",
      "Ice Cream Vendor",
      "Maintenance Worker",
      "Children's Play Area Supervisor",
      "Horticulturist",
      "Park Guide",
      "Ticket Collector",
      "First Aid Staff",
      "Cleaning Supervisor",
      "Event Coordinator",
    ],
    "Police Station": [
      "Station Inspector",
      "Sub Inspector",
      "Constable",
      "Records Officer",
      "Traffic Police",
      "Investigation Officer",
      "Control Room Operator",
      "Cyber Crime Expert",
      "Forensic Officer",
      "Lady Constable",
      "Police Photographer",
      "Lock-up Guard",
      "Computer Operator",
      "Evidence Room Manager",
    ],
    "Auto Stand": [
      "Auto Union Leader",
      "Auto Driver",
      "Traffic Cop",
      "Tea Stall Owner",
      "Mechanic",
      "Passenger",
      "Newspaper Vendor",
      "Snack Shop Owner",
      "Pan Shop Vendor",
      "Auto Spare Parts Seller",
      "Local Police",
      "Parking Attendant",
      "Mobile Recharge Shop",
      "Street Food Vendor",
    ],
  };

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
      await update(ref(db, `rooms/${roomId}`), {
        location,
        spyId,
        roles,
        playerNames,
        status: "started",
      });
    } catch (error) {
      alert(error.message);
    }
  };

  const handleRestartGame = async () => {
    if (!room || !isHost) return;

    try {
      const { location, spyId, roles, playerNames } = prepareGameData(
        room.players || {}
      );
      await update(ref(db, `rooms/${roomId}`), {
        location,
        spyId,
        roles,
        playerNames,
        status: "started",
      });
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

  return (
    <main className="flex flex-col items-center min-h-screen bg-gray-50">
      {/* Header with exit button */}
      <div className="w-full bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-800">Room: {roomId}</h1>
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
                <li key={id} className="flex items-center gap-2 text-gray-700">
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
                </li>
              ))}
            </ul>
          </div>

          {/* Game Controls */}
          {isHost ? (
            <div className="flex gap-3">
              {room.status === "started" ? (
                <button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                  onClick={handleEndGame}
                >
                  End Game
                </button>
              ) : (
                <>
                  <button
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                    onClick={handleStartGame}
                  >
                    {room.status === "ended" ? "Start New Game" : "Start Game"}
                  </button>
                  {room.status === "ended" && (
                    <button
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
                      onClick={handleRestartGame}
                    >
                      Quick Restart
                    </button>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="text-center text-gray-500 bg-gray-50 p-4 rounded-lg">
              {room.status === "started"
                ? "Game in progress..."
                : "Waiting for host to start the game..."}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
