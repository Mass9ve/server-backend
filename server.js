const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const matches = {}; // In-memory match storage

// Endpoint to create a new match
app.post("/create-match", (req, res) => {
	const { match_id, player_info } = req.body;

	if (!match_id || !player_info) {
		return res.status(400).json({ error: "Missing match_id or player_info" });
	}

	if (matches[match_id]) {
		return res.status(400).json({ error: "Match ID already exists" });
	}

	matches[match_id] = {
		players: [player_info],
		placements: {},
		game_state: "",
		history: []
	};

	res.json({ success: true });
});

// Endpoint to join an existing match
app.post("/join-match", (req, res) => {
	const { match_id, player_info } = req.body;

	if (!match_id || !player_info) {
		return res.status(400).json({ error: "Missing match_id or player_info" });
	}

	const match = matches[match_id];

	if (!match) {
		return res.status(404).json({ error: "Match not found" });
	}

	if (match.players.length >= 2) {
		return res.status(400).json({ error: "Match is full" });
	}

	match.players.push(player_info);

	res.json({ success: true });
});

// Endpoint to submit placement
app.post("/submit-placement", (req, res) => {
	const { match_id, player_id, state_string } = req.body;

	if (!match_id || player_id === undefined || !state_string) {
		return res.status(400).json({ error: "Missing fields" });
	}

	const match = matches[match_id];

	if (!match) {
		return res.status(404).json({ error: "Match not found" });
	}

	match.placements[player_id] = state_string;

	if (Object.keys(match.placements).length === 2) {
		const p0 = match.placements["0"];
		const p1 = match.placements["1"];

		// Build base64 header (game_state=4, current_turn=0, version=1)
		const current_turn = 0;
		const game_state_code = 4;
		const int_data = (1 << 6) | ((current_turn & 0b1) << 0) | ((game_state_code & 0b1111) << 1);
		const header = intToBase64(int_data);

		match.game_state = `${header}_${p0}_${p1}`;

		return res.json({
			status: "both_ready",
			game_state: match.game_state
		});
	}

	res.json({ status: "waiting_for_other_player" });
});

// Endpoint to get the current game state
app.get("/match-state", (req, res) => {
	const { match_id } = req.query;

	if (!match_id) {
		return res.status(400).json({ error: "Missing match_id" });
	}

	const match = matches[match_id];

	if (!match) {
		return res.status(404).json({ error: "Match not found" });
	}

	res.json({
		game_state: match.game_state || "",
		players: match.players
	});
});

// Base64-64 encoder (matches GDScript's Global.int_to_hex)
function intToBase64(value) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
	let str = "";

	do {
		str = chars[value % 64] + str;
		value = Math.floor(value / 64);
	} while (value > 0);

	return str;
}

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});