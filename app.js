const express = require("express");
const socket = require("socket.io");
const http = require("http");
const { Chess } = require("chess.js");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = socket(server);

const chess = new Chess();
let players = {}; // { white: socketId, black: socketId }

app.set("view engine", "ejs");
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
    res.render("index.ejs", { title: "Chess Game!" });
});

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Assign player role
    if (!players.white) {
        players.white = socket.id;
        socket.emit("playerRole", "w");
    } else if (!players.black) {
        players.black = socket.id;
        socket.emit("playerRole", "b");
    } else {
        socket.emit("spectatorRole");
    }

    // Send current board to new user
    socket.emit("boardState", chess.fen());

    socket.on("disconnect", () => {
        if (socket.id === players.white) {
            delete players.white;
        } else if (socket.id === players.black) {
            delete players.black;
        }
        console.log("User disconnected:", socket.id);
    });

    socket.on("move", (move) => {
        const turn = chess.turn(); // 'w' or 'b'

        if ((turn === "w" && socket.id !== players.white) ||
            (turn === "b" && socket.id !== players.black)) {
            return; // not your turn
        }

        const result = chess.move(move);
        if (result) {
            io.emit("move", move); // broadcast to all
            io.emit("boardState", chess.fen());
        } else {
            socket.emit("invalidMove", move);
        }
    });
});

server.listen(3000, () => {
    console.log("listening at 3000");
});
