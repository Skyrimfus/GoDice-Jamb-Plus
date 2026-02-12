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