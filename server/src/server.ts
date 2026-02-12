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
  { id: "n1", value: 6, color: 0, battery: 1 },
  { id: "n2", value: 6, color: 1, battery: 1 },
  { id: "n3", value: 6, color: 2, battery: 1 },
  { id: "n4", value: 6, color: 3, battery: 1 },
  { id: "n5", value: 5, color: 4, battery: 1 },
  { id: "n6", value: 1, color: 5, battery: 1 },
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

// --- Existing admin endpoints used by webpage ---
app.get("/admin/players-json", (_:any, res:any) => res.json({ TURN, players }));

app.post("/admin/turns", (req:any, res:any) => {
  const { newOrder } = req.body; // uuid of player + new turn number
  
  let uuid = newOrder[0].uuid;
  for(let i=0; i<newOrder.length;i++){
    let uuid = newOrder[i].uuid;
    let newTurn = newOrder[i].turn;
    players[uuid].turn = newTurn;
  }
  res.json({sucess:true})

  io.emit("roll", null);
  io.to(getPlayerByTurn(TURN)?.uuid).emit("roll",dice);

});

app.post("/admin/set-turn", (req:any, res:any)=>{
  const {newTurn} = req.body;
  const totalPlayers = Object.keys(players).length;
  if (typeof newTurn !== "number" || newTurn < 1 || newTurn > totalPlayers) {
    return res.status(400).json({ error: "Invalid turn number" });
  }
  TURN = newTurn;
  io.emit("roll", null);
  io.to(getPlayerByTurn(TURN)?.uuid).emit("roll",dice);
  
});

app.post("/admin/player-rename", (req:any, res:any)=>{
  const {uuid, newName} = req.body;
  if (!uuid || !newName) return;
  players[uuid].name = newName;
  
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
      //console.log("dice_data",payload)//print raw data
      let die = dice.find(d => d.color === payload.color)
      if (die && payload.color !== "") die.id = payload.dice;
    });
    socket.on("dice_color",(payload:any) => {
      //console.log("dice_color",payload)//print raw data
      let die = dice.find(d => d.color === payload.color)
      if (die) die.id = payload.dice;

      
    });

    socket.on("battery_level",(payload:any) => {
      console.log("battery_level",payload)//print raw data
      let die = dice.find(d => d.id === payload.dice)
      if (die) die.battery = payload.level;
       
      console.log("new battery", die)
      let p = getPlayerByTurn(TURN)
      if(p){
        io.to(p.uuid).emit("roll", dice);
      }
    });

    ["stable", "fake_stable", "move_stable"].forEach(eventname => {
      socket.on(eventname, (payload:any) => {
        //console.log(eventname, payload);
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
    if (TURN !== player.turn) return;
    player.ticket[data.target] = data.value;
    io.to(uuid).emit("update_ticket", player.ticket);
    io.to(uuid).emit("roll", null);

    const playerCount = Object.keys(players).length;
    TURN = (TURN % playerCount) + 1;
    const nextPlayer = getPlayerByTurn(TURN);
    if (nextPlayer) {
      io.to(nextPlayer.uuid).emit("update_ticket", nextPlayer.ticket)
      io.to(nextPlayer.uuid).emit("roll", dice);
    }
  });

  socket.on("req_current_player_ticket", (data: {isPeeking:boolean})=>{
    if(player.turn === TURN) return;
    if(data.isPeeking){
      io.to(uuid).emit("update_ticket",player.ticket);
      io.to(uuid).emit("roll", TURN === player.turn ? dice : null);
      
    }else{
      io.to(uuid).emit("update_ticket",getPlayerByTurn(TURN)?.ticket);
      io.to(uuid).emit("ghost_dice", dice);
    }

  })

});

const PORT = 3001;
httpServer.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));