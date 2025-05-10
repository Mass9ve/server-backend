const cors = require("cors");
const bodyParser = require("body-parser");
const redis = require("redis");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware setup
app.use(cors());
app.use(bodyParser.json());

// Initialize Redis client
const redisClient = redis.createClient();

redisClient.on("error", (err) => {
  console.error("Redis error:", err);
});

// Helper function to convert integer to hexadecimal string
function intToHex(intValue) {
  return intValue.toString(16);
}

// Endpoint to create a new match
app.post("/create-match", async (req, res) => {
  const { match_id, player_info } = req.body;

  if (!match_id || !player_info) {
    return res.status(400).json({ error: "Missing match_id or player_info" });
  }

  const matchKey = `match:${match_id}`;

  // Check if match already exists
  const exists = await redisClient.exists(matchKey);
  if (exists) {
    return res.status(400).json({ error: "Match ID already exists" });
  }

  // Initialize match data
  const matchData = {
    players: JSON.stringify([player_info]),
    placements: JSON.stringify({}),
    latest_state: "",
    history: JSON.stringify([]),
  };

  await redisClient.hSet(matchKey, matchData);

  res.json({ success: true });
});

// Endpoint to join an existing match
app.post("/join-match", async (req, res) => {
  const { match_id, player_info } = req.body;

  if (!match_id || !player_info) {
    return res.status(400).json({ error: "Missing match_id or player_info" });
  }

  const matchKey = `match:${match_id}`;

  const matchExists = await redisClient.exists(matchKey);
  if (!matchExists) {
    return res.status(404).json({ error: "Match not found" });
  }

  const playersData = await redisClient.hGet(matchKey, "players");
  const players = JSON.parse(playersData);

  if (players.length >= 2) {
    return res.status(400).json({ error: "Match is full" });
  }

  players.push(player_info);
  await redisClient.hSet(matchKey, "players", JSON.stringify(players));

  res.json({ success: true });
});

// Endpoint to submit player placement
app.post("/submit-placement", async (req, res) => {
  const { match_id, player_id, state_string } = req.body;

  if (!match_id || player_id === undefined || !state_string) {
    return res.status(400).json({ error: "Missing fields" });
  }

  const matchKey = `match:${match_id}`;

  const matchExists = await redisClient.exists(matchKey);
  if (!matchExists) {
    return res.status(404).json({ error: "Match not found" });
  }

  const placementsData = await redisClient.hGet(matchKey, "placements");
  const placements = JSON.parse(placementsData || "{}");

  placements[player_id] = state_string;
  await redisClient.hSet(matchKey, "placements", JSON.stringify(placements));

  if (Object.keys(placements).length === 2) {
    // Both players have submitted placements
    const p0 = placements["0"];
    const p1 = placements["1"];

    // Construct game state
    const current_turn = 0; // or randomize between 0 and 1
    const game_state_code = 4; // 'playing' state
    const game_state_bits = (1 << 6) | ((current_turn & 0b1) << 0) | ((game_state_code & 0b1111) << 1);
    const game_base64 = intToHex(game_state_bits);
    const combined_state = `${game_base64}_${p0}_${p1}`;

    await redisClient.hSet(matchKey, "latest_state", combined_state);

    return res.json({ status: "both_ready", game_state: combined_state });
  }

  res.json({ status: "waiting_for_other_player" });
});

// Endpoint to retrieve the latest game state
app.get("/match-state", async (req, res) => {
  const { match_id } = req.query;

  if (!match_id) {
    return res.status(400).json({ error: "Missing match_id" });
  }

  const matchKey = `match:${match_id}`;

  const matchExists = await redisClient.exists(matchKey);
  if (!matchExists) {
    return res.status(404).json({ error: "Match not found" });
  }

  const latest_state = await redisClient.hGet(matchKey, "latest_state");
  const playersData = await redisClient.hGet(matchKey, "players");
  const players = JSON.parse(playersData || "[]");

  res.json({
    latest_state: latest_state || "",
    players: players,
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});