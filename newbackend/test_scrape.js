const io = require("socket.io-client");

const ROOM_ID = 35317902;
const url = "https://sportsscore24.com";

const socket = io(url, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 3000,
  timeout: 20000,
  forceNew: true,
});

socket.on("connect", () => {
  console.log("Connected to server!");
  socket.emit("subscribe", {
    type: 1,
    rooms: [ROOM_ID],
  });
  console.log(`Subscribed to room ${ROOM_ID}`);
});

socket.on("update", (msg) => {
  try {
    const data = typeof msg === "string" ? JSON.parse(msg) : msg;
    if (data.type === 1 && data.data) {
      console.log("\n--- Live Score Update ---");
      const scoreData = data.data;
      console.log(`${scoreData.spnnation1 || "Team 1"}: ${scoreData.score1 || "Yet to bat"}`);
      console.log(`${scoreData.spnnation2 || "Team 2"}: ${scoreData.score2 || "Yet to bat"}`);
      if (scoreData.spnballrunningstatus || scoreData.spnmessage) {
        console.log(`Status: ${scoreData.spnballrunningstatus || scoreData.spnmessage}`);
      }
      if (scoreData.balls && scoreData.balls.length > 0) {
        console.log(`Recent Balls: ${scoreData.balls.join(', ')}`);
      }
      console.log("-------------------------");
    }
  } catch (err) {
    console.error("Parse error:", err.message);
  }
});
