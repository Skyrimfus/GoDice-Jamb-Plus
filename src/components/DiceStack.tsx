// DiceStack.tsx
import "./DiceStack.css";
import React from "react";
import { Die } from "./Die";
import type { DieData } from "./types";


type DiceStackProps = {
  dice: DieData[];
};

export const DiceStack: React.FC<DiceStackProps> = ({ dice }) => {


  const sortedDice = [...dice].sort((a, b) => b.value - a.value);
  return (
    <div className="dice-stack">
      {sortedDice.map((die) => (
        <Die
          key={die.id}
          value={die.value}
          colorID={die.color}
          battery={die.battery}
        />
      ))}
    </div>
  );
};