const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let matches = {};       // match_id -> { players, placements, history, latest_state }
let matchStates = {};   // match_id -> combined_state

// Create match
app.post("/create-match", (req, res) => {
	const { match_id, player_info } = req.body;

	if (matches[match_id]) {
		return res.status(400).json({ error: "Match ID already exists" });
	}

	matches[match_id] = {
		players: [player_info],
		placements: {},
		latest_state: "",
		history: []
	};

	res.json({ success: true });
});

// Join existing match
app.post("/join-match", (req, res) => {
	const { match_id, player_info } = req.body;
	const match = matches[match_id];

	if (!match) return res.status(404).json({ error: "Match not found" });
	if (match.players.length >= 2) return res.status(400).json({ error: "Match is full" });

	match.players.push(player_info);
	res.json({ success: true });
});

// Submit placement (used during placement phase)
app.post("/submit-placement", (req, res) => {
	const { match_id, player_id, state_string } = req.body;

	if (!match_id || !player_id || !state_string) {
		return res.status(400).json({ error: "Missing fields" });
	}

	const match = matches[match_id];
	if (!match) return res.status(404).json({ error: "Match not found" });

	match.placements[player_id] = state_string;

	if (Object.keys(match.placements).length === 2) {
		const [p1, p2] = Object.values(match.placements);
		const combined_state = `${p1}_${p2}`;
		match.latest_state = combined_state;
		matchStates[match_id] = combined_state;

		return res.json({ status: "both_ready", game_state: combined_state });
	}

	res.json({ status: "waiting_for_other_player" });
});

// Get latest game state
app.get("/match-state", (req, res) => {
	const match = matches[req.query.match_id];

	if (!match) return res.status(404).json({ error: "Match not found" });

	res.json({
		latest_state: match.latest_state,
		players: match.players
	});
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});