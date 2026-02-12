// DiceStack.tsx
import "./DiceStack.css";
import React from "react";
import { Die } from "./Die";
import type { DieData } from "./types";


type DiceStackProps = {
  dice: DieData[];
  isPeeking:boolean;
};

export const DiceStack: React.FC<DiceStackProps> = ({ dice, isPeeking}) => {


  const sortedDice = [...dice].sort((a, b) => b.value - a.value);
  return (
    <div className="dice-stack">
      {sortedDice.map((die) => (
        <Die
          key={die.id}
          value={die.value}
          colorID={die.color}
          battery={die.battery}
          isPeeking={isPeeking}
        />
      ))}
    </div>
  );
};