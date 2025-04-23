const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

let gameState = { board: [], currentPlayer: "white" };

app.get("/", (req, res) => {
	res.send("Godot game server is up!");
});

app.post("/move", (req, res) => {
	const move = req.body;
	gameState.board.push(move);
	gameState.currentPlayer = move.nextPlayer;
	res.json({ success: true });
});

app.get("/state", (req, res) => {
	res.json(gameState);
});

app.post("/reset", (req, res) => {
	gameState = { board: [], currentPlayer: "white" };
	res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
