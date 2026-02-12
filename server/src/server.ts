// server.ts

const express = require("express");
const { createServer } = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const path = require("path");


// Types
type DieData = {
  id: string;
  value: 1 | 2 | 3 | 4 | 5 | 6;
  color: number;
  battery: number;
};

type Player = {
  name: string;
  uuid: string;
  turn: number;
  ticket: Record<string, string>;
};

// Game state
const players: Record<string, Player> = {};
const dice: DieData[] = [
  { id: "n1", value: 6, color: 0, battery: 90 },
  { id: "n2", value: 6, color: 1, battery: 70 },
  { id: "n3", value: 3, color: 2, battery: 50 },
  { id: "n4", value: 4, color: 3, battery: 40 },
  { id: "n5", value: 5, color: 4, battery: 20 },
  { id: "n6", value: 6, color: 5, battery: 10 },
];

let TURN = 1;
const getPlayerByTurn = (turn: number): Player | undefined => {
  return Object.values(players).find((p) => p.turn === turn);
};
// Setup Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static admin page
// serve /admin
app.get("/admin", (_:any,res:any) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Yamb Admin Panel</title>
<style>
  body { font-family: sans-serif; margin: 20px; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 1px solid #aaa; padding: 5px; vertical-align: top; }
  input { width: 60px; }
  textarea { width: 300px; height: 80px; }
  button { margin-left: 5px; }
</style>
</head>
<body>
<h1>Yamb Admin Panel</h1>
<h3>Current Turn: <span id="current-turn"></span></h3>
<table>
  <thead>
    <tr>
      <th>UUID</th>
      <th>Name</th>
      <th>Turn</th>
      <th>Ticket</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody id="players-table"></tbody>
</table>

<script>
async function fetchPlayers() {
  const res = await fetch('/admin/players-json');
  const data = await res.json();
  document.getElementById('current-turn').innerText = data.TURN;
  const tbody = document.getElementById('players-table');
  tbody.innerHTML = '';

  for (const uuid in data.players) {
    const p = data.players[uuid];
    const tr = document.createElement('tr');
    tr.innerHTML = \`
      <td>\${uuid}</td>
      <td><input id="name-\${uuid}" value="\${p.name}" /></td>
      <td><input id="turn-\${uuid}" type="number" min="1" value="\${p.turn}" /></td>
      <td><textarea id="ticket-\${uuid}">\${JSON.stringify(p.ticket, null, 2)}</textarea></td>
      <td>
        <button onclick="updatePlayer('\${uuid}')">Update</button>
      </td>
    \`;
    tbody.appendChild(tr);
  }
}

// Update player info (name, ticket, turn)
async function updatePlayer(uuid) {
  const name = document.getElementById('name-' + uuid).value;
  const turn = parseInt(document.getElementById('turn-' + uuid).value);
  const ticket = JSON.parse(document.getElementById('ticket-' + uuid).value);

  // Update ticket & name on server
  await fetch('/admin/ticket', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, ticket })
  });

  // Update turn
  await fetch('/admin/turn', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uuid, newTurn: turn })
  });

  fetchPlayers();
}

fetchPlayers();
setInterval(fetchPlayers, 5000);
</script>
</body>
</html>
`);
});

// --- Existing admin endpoints used by webpage ---
app.get("/admin/players-json", (_:any, res:any) => res.json({ TURN, players }));

app.post("/admin/turn", (req:any, res:any) => {
  const { uuid, newTurn } = req.body; // uuid of player + new turn number
  const player = players[uuid];
  if (!player) return res.status(404).json({ error: "Player not found" });

  const totalPlayers = Object.keys(players).length;
  if (typeof newTurn !== "number" || newTurn < 1 || newTurn > totalPlayers) {
    return res.status(400).json({ error: "Invalid turn number" });
  }

  // Check if any other player has this turn number and swap
  for (const otherUuid in players) {
    const other = players[otherUuid];
    if (otherUuid !== uuid && other.turn === newTurn) {
      other.turn = player.turn; // swap turns
      break;
    }
  }

  player.turn = newTurn;
  res.json({ success: true, player });
});

app.post("/admin/ticket", (req:any, res:any) => {
  const { uuid, ticket } = req.body;
  const player = players[uuid];
  if (!player) return res.status(404).json({ error: "Player not found" });
  player.ticket = ticket;
  io.to(uuid).emit("update_ticket", player.ticket);
  res.json({ success: true });
});

// --- Socket.IO logic ---
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: "*", methods: ["GET", "POST"], credentials: true },
});

io.on("connection", (socket: any) => {
  const { uuid, username } = socket.handshake.auth;
  if (!uuid) return socket.disconnect();

  socket.join(uuid);

  if(uuid === "dice"){
    socket.on("dice_data",(payload:any) => {
      console.log("dice_data",payload)//print raw data
      //let die = parseRawDiceData(payload)
    });
    socket.on("dice_color",(payload:any) => {
      console.log("dice_color",payload)//print raw data
      let die = dice.find(d => d.color === payload.color)
      if (die) die.id = payload.dice;
    });

    socket.on("battery_level",(payload:any) => {
      console.log("battery_level",payload)//print raw data
      let die = dice.find(d => d.id === payload.dice)
      if (die) die.battery = payload.level;
    });

    ["stable", "fake_stable", "move_stable"].forEach(eventname => {
      socket.on(eventname, (payload:any) => {
        console.log(eventname, payload);
        let die = dice.find(d => d.id === payload.dice);
        if (die) die.value = payload.value;

        let p = getPlayerByTurn(TURN)
        io.to(p?.uuid).emit("roll", dice);
      })
    })


    return;
  }

  let player: Player;
  if (players[uuid]) {
    player = players[uuid];
    player.name = username;
  } else {
    const turn = Object.keys(players).length + 1;
    player = { name: username, uuid, turn, ticket: {} };
    players[uuid] = player;
  }

  socket.emit("update_ticket", player.ticket);
  socket.emit("roll", TURN === player.turn ? dice : null);

  socket.on("write", (data: { target: string; value: string }) => {
    player.ticket[data.target] = data.value;
    io.to(uuid).emit("update_ticket", player.ticket);
    io.to(uuid).emit("roll", null);

    const playerCount = Object.keys(players).length;
    TURN = (TURN % playerCount) + 1;
    const nextPlayer = getPlayerByTurn(TURN);
    if (nextPlayer) io.to(nextPlayer.uuid).emit("roll", dice);
  });
});

const PORT = 3001;
httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));