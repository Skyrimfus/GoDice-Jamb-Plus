// components/AdminPanel.tsx
import "./AdminPanel.css"
import { useState, useEffect } from "react";
import type { MouseEvent } from "react";
import axios from "axios";
import type { DieData } from "./types";
import Ticket from "./Ticket";


type Player = {
  name: string;
  uuid: string;
  turn: number;
  ticket: Record<string, string>;
};

type Props = {
  emitMessage: (event: string, payload?: any) => void;
  onClose: () => void;
};

export default function AdminPanel({ emitMessage, onClose }: Props) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [dice, setDice] = useState<DieData[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player>();
  const [selectedCell, setSelectedCell] = useState<string>("");


  // Fetch all players from server
  const fetchPlayers = async () => {
    const res = await axios.get("/admin/players-json");
    setPlayers(Object.values(res.data.players));
    setCurrentTurn(res.data.TURN);
  };

  useEffect(() => {
    fetchPlayers();
  }, []);



  const setNewTurn = async (newTurn:number) => {
    setCurrentTurn(newTurn)
    await axios.post("/admin/set-turn", {newTurn:newTurn})
  }

  const increaseTurn = ()=>{
    let turn = currentTurn;
    turn = (turn % players.length)+1
    setNewTurn(turn)
  }
   const decreaseTurn = ()=>{
    let turn = currentTurn;
    turn = currentTurn===1 ? players.length : currentTurn-1
    setNewTurn(turn)
  }

  const handlePlayerClick = (player:Player)=>{
    setSelectedPlayer(player)
  }

  const handleEditClick = async ()=>{
    if(!selectedCell || !selectedPlayer) return;
    let v = prompt("new value");
    if(v === null) return;//cancel

    let newTicket = {...selectedPlayer.ticket}
    newTicket[selectedCell] = (v);

    await axios.post("/admin/ticket", {uuid:selectedPlayer.uuid, ticket:newTicket})
    setSelectedPlayer({
        ...selectedPlayer,
        ticket:newTicket,
    })

    setPlayers(prev =>
        prev.map(p =>
            p.uuid===selectedPlayer.uuid ? {...p, ticket:newTicket} : p
        )
    )
    

  }


  const updatePlayerOrder = async (newOrder: Player[]) => {
    setPlayers(newOrder);

    await axios.post("/admin/turns", {newOrder:newOrder})

  }
  const movePlayerDown = (e:MouseEvent<HTMLButtonElement> ,player: Player)=>{
    e.stopPropagation();
    let p = [...players].sort((a,b)=>a.turn-b.turn);
    let t = player.turn;
    p[t-1].turn = t+1;
    p[t].turn = t;

    
    updatePlayerOrder(p)

    
  }
   const movePlayerUp = (e:MouseEvent<HTMLButtonElement>, player: Player)=>{
    e.stopPropagation()
    let p = [...players].sort((a,b)=>a.turn-b.turn);
    let t = player.turn;

    p[t-1].turn = t-1;
    p[t-2].turn = t;

    updatePlayerOrder(p)

  }

  const handleEditName = async () => {
    let newName = prompt("new player name");
    if (newName === null || !selectedPlayer) return;
   

    setPlayers(prev=>
      prev.map(player=>
        player.uuid === selectedPlayer.uuid ? {...player, name:newName} : player
      )
    )
    await axios.post("/admin/player-rename",{uuid:selectedPlayer?.uuid, newName:newName});

    

  }
  const handleReconnectDiceClick = async () => {
    let c = confirm("Reconnect dice?")
    if(!c) return;
    await axios.post("/admin/reconnect-dice");
  }

  const sortedPlayers = players.slice().sort((a,b)=>a.turn-b.turn);
  return (
    <div className="admin-overlay">
      <button className="close-btn" onClick={onClose}>Close</button>
      <button onClick={handleReconnectDiceClick}>Reconnect Dice</button>
      <div className="turn-row">
        <label className="text">Turn: {currentTurn}</label>
        <button className="btn increaseTurn" onClick={increaseTurn}>+</button>
        <button className="btn decreaseTurn" onClick={decreaseTurn}>-</button>
      </div>
      <div className="players-label underline">Players:</div>
      <div className="players-list">
        {sortedPlayers.map((player) => (
          
            <div onClick = {()=>handlePlayerClick(player)} key={player.uuid} className="player">{player.name}
            <div className="btn-group">
                <button onClick={(e)=>movePlayerUp(e,player)} className="moveBtn" disabled={player.turn===1}>↑</button>
                <button onClick={(e)=>movePlayerDown(e,player)} className="moveBtn" disabled={player.turn===players.length}>↓</button>
            </div>
            </div>
            
        ))}
      </div>
      <div className="underline">{selectedPlayer? `${selectedPlayer.name}'s Ticket:` : "Select a player"}</div>
      <div className="TicketWrapper">
        {
        (selectedPlayer) &&
        (<>
            <Ticket
                handleFullscreen={()=>{}}
                setDice = {()=>{}}
                ticketData={selectedPlayer.ticket}
                emitMessage={emitMessage}
                isPeeking={true}
                isAdmin={true}
                selectedCell={selectedCell}
                setSelectedCell={setSelectedCell}
            />

            <div>
                <div>Player Turn: {selectedPlayer.turn}</div>
                <button onClick={handleEditName}className="">Edit Name</button>
                <button onClick={handleEditClick}className="">Edit Cell</button>
            </div>
          </>

    )
}
      </div>
      
      
    </div>
  );
}