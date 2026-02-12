import { useEffect, useCallback } from "react";



export const getUUID = () => {
  let uuid = localStorage.getItem("uuid");
  if (!uuid){
    uuid = crypto.randomUUID();
    localStorage.setItem("uuid", uuid);
  }
  return uuid;
}



export const getName = () => {
  let name = sessionStorage.getItem("name");
  if (!name){
    name = prompt("Enter username") || "";
    sessionStorage.setItem("name", name);
  }
  return name;
}





export function useGlobalBlinkSync() {
  const duration = 1000;

  const syncNow = useCallback(() => {
    const phase = (Date.now() % duration) / duration;
    document.documentElement.style.setProperty(
      "--blink-phase",
      phase.toString()
    );
  }, []);

  useEffect(() => {
    syncNow();
    const interval = setInterval(syncNow, 100);
    return () => clearInterval(interval);
  }, [syncNow]);

  return syncNow;
}