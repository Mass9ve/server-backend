const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

let matches = {}; // Stores all matches

// Create match with custom ID
app.post("/create-match", (req, res) => {
	const { match_id, player_name } = req.body;

	if (matches[match_id]) {
		return res.status(400).json({ error: "Match ID already exists" });
	}

	matches[match_id] = {
		players: [player_name],
		latest_state: "",
		history: [],
	};

	res.json({ success: true });
});

// Join existing match
app.post("/join-match", (req, res) => {
	const { match_id, player_name } = req.body;
	const match = matches[match_id];

	if (!match) return res.status(404).json({ error: "Match not found" });
	if (match.players.length >= 2) return res.status(400).json({ error: "Match is full" });

	match.players.push(player_name);
	res.json({ success: true });
});

// Submit game state
app.post("/submit-state", (req, res) => {
	const { match_id, state } = req.body;
	const match = matches[match_id];

	if (!match) return res.status(404).json({ error: "Match not found" });

	match.latest_state = state;
	match.history.push(state);

	res.json({ success: true });
});

// Get latest game state
app.get("/match-state", (req, res) => {
	const match = matches[req.query.match_id];

	if (!match) return res.status(404).json({ error: "Match not found" });

	res.json({
		latest_state: match.latest_state,
		players: match.players,
	});
});

// Example shape: { match_name: "abc", player_id: "1", state_string: "abc123==" }
app.post("/submit-placement", async (req, res) => {
	const { match_name, player_id, state_string } = req.body;

	if (!match_name || !player_id || !state_string) {
		return res.status(400).json({ error: "Missing fields" });
	}

	if (!matches[match_name]) {
		matches[match_name] = {};
	}

	matches[match_name][player_id] = state_string;

	const playersSubmitted = Object.keys(matches[match_name]).length;

	if (playersSubmitted === 2) {
		// Combine the two states into one full game state
		const [p1, p2] = Object.values(matches[match_name]);
		const combined_state = p1 +"_"+ p2;

		// Save the full state
		matchStates[match_name] = combined_state;

		return res.json({ status: "both_ready", game_state: combined_state });
	}

	res.json({ status: "waiting_for_other_player" });
});

app.listen(PORT, () => {
	console.log(`Server running on port ${PORT}`);
});
