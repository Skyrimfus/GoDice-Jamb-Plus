import React from "react";
import "./Die.css";
type DieProps = {
  value: 1 | 2 | 3 | 4 | 5 | 6;
  colorID: number;       // controls border and pip color
  battery: number;     // 0-100
  size?: number;       // optional, default 40px
};

const pipMap: Record<number, number[]> = {
  1: [5],
  2: [1, 9],
  3: [1, 5, 9],
  4: [1, 3, 7, 9],
  5: [1, 3, 5, 7, 9],
  6: [1, 3, 4, 6, 7, 9],
};
const colorMap: Record<number, string> = {
    0: "#000000",
    1: "#FF0000",
    2: "#13b904",
    3: "#2600ff",
    4: "#e9e51b",
    5: "#fc8f00",

}


export const Die: React.FC<DieProps> = ({ value, colorID, battery, size = 40 }) => {
  const pipSize = size / 4; // proportional pip size
  let color = colorMap[colorID];
  
  return (
    <div className="die-wrapper">
      <div
        className="die"
        style={{
          width: size,
          height: size,
          border: `3px solid ${color}`,   // border color
          backgroundColor: "#f1f1f1",        // neutral background
          padding: pipSize / 2,
          gap: pipSize / 2,
        }}
      >
        {Array.from({ length: 9 }).map((_, index) => {
          const position = index + 1;
          const isActive = pipMap[value].includes(position);
          return (
            <div
              key={position}
              className={`pip ${isActive ? "active" : ""}`}
              style={{
                width: pipSize,
                height: pipSize,
                backgroundColor: isActive ? color : "transparent", // pip color
              }}
            />
          );
        })}
      </div>

      <div className="battery-bar" style={{ width: size }}>
        <div
          className="battery-level"
          style={{
            width: `${battery}%`,
            backgroundColor:
              battery > 50 ? "green" : battery > 20 ? "orange" : "red",
          }}
        />
      </div>
    </div>
  );
};