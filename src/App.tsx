
import './App.css'
import Ticket from "./components/Ticket";
import { useState, useRef } from 'react';
import { useWakeLock } from 'react-screen-wake-lock';
import { io, Socket } from 'socket.io-client';
import { useEffect } from 'react';

import type { DieData } from './components/types';
import { DiceStack } from './components/DiceStack';
import { getUUID, getName, useGlobalBlinkSync } from './components/utils';
import AdminPanel from './components/AdminPanel';



function App() {
const socketRef = useRef<Socket | null>(null);
const uuid = getUUID();
const [ticketData, setTicketData] = useState<Record<string,string>>({})
const [isPeeking, setIsPeeking] = useState(false);
const [isAdminOpen, setIsAdminOpen] = useState(false);
const [dice, setDice] = useState<DieData[]>([
    { id: "1", value: 1, color: 0, battery: 0 },
    { id: "2", value: 2, color: 1, battery: 0 },
    { id: "3", value: 3, color: 2, battery: 0 },
    { id: "4", value: 4, color: 3, battery: 0 },
    { id: "5", value: 5, color: 4, battery: 0 },
    { id: "6", value: 6, color: 5, battery: 0 },
    ])

useGlobalBlinkSync();
const { isSupported, request, release } = useWakeLock({
    reacquireOnPageVisible: true,
  });

const handleFullscreen = () => {
  if (!document.fullscreenElement){
    document.documentElement.requestFullscreen();
    if(!isSupported) alert("WakeLock request not supported!");
    request();
  } else{
    document.exitFullscreen();
    release();
  }
}


const emitMessage = (event: string, payload?:any)=>{
  if(!socketRef.current) {
    console.log(`Socket not defiend! Can't send event ${event}`, payload)
    return
  }
  socketRef.current.emit(event, payload);
}

useEffect(() => {
  const name = getName();
  socketRef.current = io("/", {
    auth: {uuid:uuid, username:name}
  });

  socketRef.current.on("connect", ()=> {
    console.log("connected to the server with UUID:", uuid);
  });

  socketRef.current.on("update_ticket", (data: Record<string,string>)=>{
    setTicketData(data);
    if(data !== null ||data !== undefined) setIsPeeking(false);
    console.log("Updated ticket data!",data)
  });


  socketRef.current.on("ghost_dice", (data: DieData[])=>{
    setDice(data);
    console.log("Updated ghost dice data!",data)
    setIsPeeking(true);
  });

  
  socketRef.current.on("roll", (data: DieData[])=>{
    setDice(data);
    console.log("Updated dice data!",data)
  });


  return () => {socketRef.current?.disconnect()}  
}, [])

const handleAdminClick = ()=>{
  setIsAdminOpen(prev => !prev);
}

const handleViewTicket = ()=>{
  emitMessage("req_current_player_ticket", {isPeeking:isPeeking})
}


  return (
    <> 
      <div className="ticket-dice-wrapper">
        <Ticket 
          handleFullscreen={handleFullscreen}
          dice = {dice}
          setDice = {setDice}
          ticketData={ticketData}
          setTicketData = {setTicketData}
          emitMessage={emitMessage}
          isPeeking={isPeeking}
          />
        {dice ? <DiceStack dice={dice} isPeeking={isPeeking}/> : ""}
      {document.URL.endsWith("admin") ? <button className="adminBTN" onClick = {handleAdminClick}>Admin</button>: <></>}
      {(!dice || isPeeking) && (<button className="view-ticket" onClick={handleViewTicket}>{isPeeking?"Back to my Ticket":"View Other Player Ticket"}</button>)}
      </div>
    {isAdminOpen && (
      <AdminPanel emitMessage={emitMessage} onClose={()=>setIsAdminOpen(false)} />
    )}
    </>
    
  );
}


export default App