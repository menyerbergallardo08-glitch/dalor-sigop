
const screen = document.getElementById("app-login-screen");
const card = screen ? screen.children[0] : null;
console.log("SCREEN RECT:", screen ? JSON.stringify(screen.getBoundingClientRect()) : "none");
console.log("CARD RECT:", card ? JSON.stringify(card.getBoundingClientRect()) : "none");
console.log("BODY RECT:", JSON.stringify(document.body.getBoundingClientRect()));
console.log("WINDOW INNERWIDTH:", window.innerWidth, "INNERHEIGHT:", window.innerHeight);
