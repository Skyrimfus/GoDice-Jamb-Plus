import React, { type MouseEventHandler } from "react";
import { useState } from "react";
import "./Ticket.css";
import Cell from "./Cell";
import type { DieData } from "./types";


const HEADERS = [
  {id:"D", text:"↓"}, 
  {id:"U", text:"↑"},
  {id:"F", text:"↑↓"},
  {id:"A", text:"NAJAVA"}];

const ROWS = [
  {id:"1", playable:true, label:"1", maxValue:5, naturalMax: 5},
  {id:"2", playable:true, label:"2", maxValue:10, naturalMax: 10},
  {id:"3", playable:true, label:"3", maxValue:15, naturalMax: 15},
  {id:"4", playable:true, label:"4", maxValue:20, naturalMax: 20},
  {id:"5", playable:true, label:"5", maxValue:25, naturalMax: 25},
  {id:"6", playable:true, label:"6", maxValue:30, naturalMax: 30},
  {id:"sum1", playable:false, label:"za zbroj 60 ili više dodaj 30", maxValue:0, naturalMax: 0},
  {id:"max", playable:true, label:"MAX", maxValue:30, naturalMax: 30},
  {id:"min", playable:true, label:"MIN", maxValue:5, naturalMax: 5},
  {id:"sum2", playable:false, label:"RAZLIKA MAX I MIN x a", maxValue:0, naturalMax: 0},
  {id:"pair", playable:true, label:"2 PARA (+10)", maxValue:32, naturalMax: 22, bonus:10},
  {id:"tris", playable:true, label:"TRIS (+20)", maxValue:38, naturalMax: 18, bonus: 20},
  {id:"straight", playable:true, label:"SKALA (mala +45 / velika +50)", maxValue:50, naturalMax: 50},
  {id:"full", playable:true, label:"FULL (+40)", maxValue:68, naturalMax: 28, bonus: 40},
  {id:"poker", playable:true, label:"POKER (+50)", maxValue:74, naturalMax: 24, bonus: 50},
  {id:"yamb", playable:true, label:"YAMB (+60)", maxValue:90, naturalMax: 30, bonus: 60},
  {id:"sum3", playable:false, label:"Zbroj 2 para tris skala full poker yamb", maxValue:0, naturalMax: 0},
];


interface TicketProps {
  handleFullscreen?: MouseEventHandler;
  dice: DieData[];
  setDice: Function;
  ticketData: Record<string,string>;
  setTicketData: Function;
  emitMessage: (event: string, payload?:any) => void;
}
export default function Ticket({handleFullscreen, dice, setDice, ticketData, setTicketData, emitMessage}:TicketProps) {
  const COLUMNS_NUM = HEADERS.length + 1; // +1 for row labels
  const ROWS_NUM = ROWS.length + 1;       // +1 for header row
  //const [ticketData, setTicketData] = useState<Record<string,string>>({})

  // Compute cell size to fit both horizontally and vertically
  const cellSize = `50px`;
  
  handleFullscreen = handleFullscreen ? handleFullscreen : ()=>{};

  const getCellText = (cellID: string) => {
    return ticketData[cellID];
  }
  const cellIsEmpty = (cellID: string) => {
    let t=getCellText(cellID)
    return t === "" || t===undefined || t===null;

  }
  const checkIfCellWritable = (colID: string, rowID: string) => {
    if(!dice) return false;
    let ticketCellValue = ticketData[`${colID}-${rowID}`]
    if(!ROWS.find((o)=>{return o.id === rowID})?.playable) return false;
    if (!(ticketCellValue === "" || ticketCellValue === null || ticketCellValue === undefined)) return false
    switch(colID){
      case "D":
      case "U":
        if (colID ==="D" && rowID === "1") return true
        if (colID ==="U" && rowID === "yamb") return true
        let pRows = ROWS.filter((o)=>{return o.playable})
        let r = pRows.findIndex((o)=>{return o.id === rowID})

        let d = colID === "D" ? -1 : 1

       
        let c = `${colID}-${pRows[r+d].id}`
        //console.log(`checking id ${c} from cell ${colID}-${rowID}`)
        return !cellIsEmpty(c)
        break;
      case "F":
      case "A":
        return cellIsEmpty(`${colID}-${rowID}`)
        break;
      // case "A":
      //    return `${colID}-${rowID}` === ticketData["NAJAVA"];
    }
    
    return false
  }

 const handleClick = (a:any) =>{
  let target:any = a.target;
  if (target.id === "") target = target.parentElement
  let [cid, rid] = target.id.split("-")
  if(!checkIfCellWritable(cid,rid)) return
  
  // setTicketData((prev:Record<string,string>) => ({...prev, [target.id]:a.target.innerText}))

  console.log(`Requesting write: ${a.target.innerText} to ${target.id}`)
  emitMessage("write", {value:a.target.innerText, target: target.id})
 }
 const getMaxScore = ()=>{
  let total = 0;
  console.log("TOTAL 0")
  let sums = document.getElementsByClassName("sum");
  console.log(sums)
  for(let i=0; i<sums.length; i++){
    let txt = (sums[i].textContent)
    let value = parseInt(txt)
    if (!value) value=0
    total+=value;

    console.log(i)
  }


  return "Rezultat: "+total.toString();
 }
 const reroll = ()=>{
  setDice((prevDice: DieData[]) =>
      prevDice.map((die) => ({
        ...die,
        value: (Math.floor(Math.random() * 6) + 1) as 1 | 2 | 3 | 4 | 5 | 6,
      }))
    );
 }

  return (
    <div
      className="ticket"
      style={{
        "--columns": COLUMNS_NUM,
        "--rows": ROWS_NUM,
        "--cell-size": cellSize,
      } as React.CSSProperties}
    >
      {/* Top-left empty cell */}
      {/* <div className="cell emptyCell" /> */}
      <Cell
        key="empty"
        id = "empty-empty"
        playable = {true}
        onClick= {handleFullscreen}
        text="✥"
      />

      {/* Header row */}
      {HEADERS.map((header) => (
        <Cell
        key = {`header-${header.id}`}
        id = {`header-${header.id}`}
        playable = {true}
        text = {header.text}
        />
      ))}

      {/* Other rows */}
      {ROWS.map((row, rowIdx) => (
        <React.Fragment key={`row-${rowIdx}`}>
          {/* First cell in the row with text */}
          <Cell
            key = {`row-${row.id}`}
            id = {`row-${row.id}`}
            playable = {row.playable}
            text = {row.label}
          />

          {/* Empty cells for the rest of the row */}
          {Array.from({ length: COLUMNS_NUM - 1 }).map((_, colIdx) => (
            <Cell
            key = {`${HEADERS[colIdx].id}-${row.id}`}
            id = {`${HEADERS[colIdx].id}-${row.id}`}
            playable = {row.playable}
            maxValue = {row.maxValue}
            ticketData = {ticketData}
            bonus = {row.bonus}
            text={getCellText(`${HEADERS[colIdx].id}-${row.id}`)}
            dice={dice?.map(die => die.value)}
            rowID = {row.id}
            bCanWrite = {checkIfCellWritable(HEADERS[colIdx].id, row.id)}
            onClick = {handleClick}
          />
          ))}
        </React.Fragment>
      ))}
      <Cell
        id="rezultat"
        playable={false}
        text = {getMaxScore()}
      />
    </div>
  );
}
