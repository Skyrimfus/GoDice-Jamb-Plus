import { type MouseEventHandler } from "react";
import "./Cell.css";

import useFitText from "use-fit-text";


interface CellProps {
    id: string;
    playable: boolean;
    text?: string;
    dice?: number[];
    maxValue?: number;
    bonus?: number;
    rowID?: string;
    bCanWrite?:boolean;
    ticketData?: Record<string,string>;
    onClick?:MouseEventHandler;
}

export default function Cell({ id, playable, text, dice, maxValue, bonus, rowID, bCanWrite, ticketData, onClick}: CellProps) {
    let classes = " ";
    classes += (playable ? "" : "non-playable ");
    const { fontSize, ref } = useFitText({ minFontSize: 1 });

    if (dice) dice = dice.sort().reverse();

    let bShowStar = false
    let bIsHint = false;

    let [col, row] = id.split("-")

   if (!playable) bIsHint = false;

    const countOccurrences = (arr: Array<number>, val: number) =>
        arr.reduce((a, v) => (v === val ? a + 1 : a), 0);

    if (text && parseInt(text) === maxValue) {
        bShowStar = true;
    } else if (dice && bCanWrite) {
        //at this point the cell is empty, calculate possible value with the given hand
        text = "0";
        bIsHint = true;
        switch (rowID) {
            case "1"://returns the value * how many time it appears
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
                let n = parseInt(rowID);
                let count = countOccurrences(dice, n);
                if (count>5) count = 5;
                if (count > 0) {
                    bIsHint = true;
                    text = (count * n).toString();
                }
                break;

            case "max"://returns the sum of 5 highest value dice
                bIsHint = true;
                let sumMax = dice.slice(0, 5).reduce((sum, die) => sum + die, 0);
                text = sumMax.toString();
                break;

            case "min":// returns the sum of 5 lowest value dice
                bIsHint = true;
                let sumMin = dice.slice(1, 6).reduce((sum, die) => sum + die, 0);
                text = sumMin.toString();
                break;

            case "pair": { // sum of 2 highest distinct pairs
                const counts: Record<number, number> = {};
                for (const die of dice) counts[die] = (counts[die] || 0) + 1;
                const pairs = Object.keys(counts)
                    .filter(num => counts[+num] >= 2)
                    .map(Number)
                    .sort((a, b) => b - a);
                if (pairs.length >= 2) {
                    bIsHint = true;
                    text = (pairs[0] * 2 + pairs[1] * 2).toString();
                }
                break;
            }

            case "tris": { // sum of highest three of a kind
                const counts: Record<number, number> = {};
                for (const die of dice) counts[die] = (counts[die] || 0) + 1;
                const tris = Object.keys(counts)
                    .filter(num => counts[+num] >= 3)
                    .map(Number)
                    .sort((a, b) => b - a);
                if (tris.length > 0) {
                    bIsHint = true;
                    text = (tris[0] * 3).toString();
                }
                break;
            }

            case "straight"://returns 50 for big staright and 45 for small straight
                let dice2 = new Set(dice)
                let big = dice2.has(6) && dice2.has(5) && dice2.has(4) && dice2.has(3) && dice2.has(2)
                let small = dice2.has(5) && dice2.has(4) && dice2.has(3) && dice2.has(2) && dice2.has(1)
                if (big) {
                    bIsHint = true;
                    text = "50";
                } else if (small) {
                    bIsHint = true;
                    text = "45";

                }
                break;
            case "full": { // highest full house
                const counts: Record<number, number> = {};
                for (const die of dice) counts[die] = (counts[die] || 0) + 1;
                const threes = Object.keys(counts)
                    .filter(num => counts[+num] >= 3)
                    .map(Number)
                    .sort((a, b) => b - a);
                const twos = Object.keys(counts)
                    .filter(num => counts[+num] >= 2)
                    .map(Number)
                    .sort((a, b) => b - a);
                // Remove the three-of-a-kind from twos to avoid double-counting
                const fullTwos = twos.filter(n => n !== threes[0]);
                if (threes.length > 0 && fullTwos.length > 0) {
                    bIsHint = true;
                    text = (threes[0] * 3 + fullTwos[0] * 2).toString();
                }
                break;
            }

            case "poker": { // sum of highest four of a kind
                const counts: Record<number, number> = {};
                for (const die of dice) counts[die] = (counts[die] || 0) + 1;
                const fours = Object.keys(counts)
                    .filter(num => counts[+num] >= 4)
                    .map(Number)
                    .sort((a, b) => b - a);
                if (fours.length > 0) {
                    bIsHint = true;
                    text = (fours[0] * 4).toString();
                }
                break;
            }

            case "yamb": { // sum of highest five of a kind
                const counts: Record<number, number> = {};
                for (const die of dice) counts[die] = (counts[die] || 0) + 1;
                const fives = Object.keys(counts)
                    .filter(num => counts[+num] >= 5)
                    .map(Number)
                    .sort((a, b) => b - a);
                if (fives.length > 0) {
                    bIsHint = true;
                    text = (fives[0] * 5).toString();
                }
                break;
            }
        }

        if((text !== "0" && text !=="X") && bonus && text){
            text = (parseInt(text)+bonus).toString()
        }
        if (text && parseInt(text) === maxValue) bShowStar = true;
    }
    if (ticketData && col !== "row" && row.startsWith("sum")){
        classes+= "sum "
        switch(row){
            case "sum1"://za zbroj 60 ili više dodaj 30
                let sum = 0;
                for(let i =1; i<=6; i++){
                    let v = ticketData[`${col}-${i}`];
                    if (v === undefined || v === null || v === "" || v === "X") v = "0"
                   
                    sum += parseInt(v);
                }

                if (sum >=60) sum+=30
                text=sum.toString();
                break;
            case "sum2":
                let sum2 = 0;
                let txtJedinice = (ticketData[`${col}-1`])
                let txtMax = (ticketData[`${col}-max`])
                let txtMin = (ticketData[`${col}-min`])

                let jedinice = parseInt(txtJedinice)
                let max = parseInt(txtMax)
                let min = parseInt(txtMin)
                
                if (jedinice && max && min) {
                    sum2 = (max-min) * jedinice
                    text = sum2.toString()
                }else if(txtJedinice === "X" || txtMax === "X" || txtMin === "X"){
                    text = "X"
                }
                break;
            case "sum3":
                let sum3 = 0;
                let zbrajaj = ["pair","tris","straight","full","poker","yamb"];
                zbrajaj.forEach(r => {
                    let txtCell = ticketData[`${col}-${r}`];
                    let cell = parseInt(txtCell)
                    if (!cell) cell = 0
                    sum3 += cell;
                    
                });
                text = sum3.toString()
                
                

        }
    }

    if(playable && text === "0") text = "X";

    if(col == "row"){
        switch(row){
            case "1":
            case "2":
            case "3":
            case "4":
            case "5":
            case "6":
                classes += "dice dice-"+row+" "
                break
        }
    }
    return (
        <div onClick={onClick} id={id} className={"cell cell-text " + classes}>
            {bShowStar && (
                <svg
                    className={`cell-star ${bIsHint ? "hint" : ""}`}
                    viewBox="0 0 24 24"
                    width="20"
                    height="20"
                >
                    <path
                        fill="gold"
                        d="M12 2l3 7h7l-5.5 4.2L18 21l-6-4-6 4 1.5-7.8L2 9h7z"
                    />
                </svg>
            )}
            <div className={`cell-text ${bIsHint ? "hint" : ""}`} ref={ref} style={{ fontSize }}>{text}</div>
        </div>
    )
}