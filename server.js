const express = require('express');
const app = express();
const port = 3000;

app.use(express.json());

const matches = new Map();

// Utility function to convert an integer to a hexadecimal string
function intToHex(intValue) {
  return intValue.toString(16).toUpperCase();
}

// Function to encode the game state
function gameToBase64(currentTurn, gameState) {
  let intData = 1 << 6; // Sets the 7th bit

  const stateMap = {
    'game_start': 0,
    'enter_code': 1,
    'placement_phase': 3,
    'playing': 4,
    'game_over': 5
  };

  const stateCode = stateMap[gameState] || 0;

  intData |= (currentTurn & 0b1) << 0;   // 1 bit for current turn
  intData |= (stateCode & 0b1111) << 1;  // 4 bits for game state

  return intToHex(intData);
}

// Function to combine game and player states into a single string
function combineToBase64(game, p1, p2) {
  return `${game}_${p1}_${p2}`;
}

// Endpoint to handle placement submissions
app.post('/submit-placement', (req, res) => {
  const { match_id, player_id, state_string } = req.body;

  if (!matches.has(match_id)) {
    matches.set(match_id, {
      players: {},
      current_turn: 0,
      game_state: 'placement_phase'
    });
  }

  const match = matches.get(match_id);
  match.players[player_id] = state_string;

  if (Object.keys(match.players).length === 2) {
    // Both players have submitted their placements
    const gameStateString = gameToBase64(match.current_turn, match.game_state);
    const p0 = match.players['0'] || '';
    const p1 = match.players['1'] || '';
    const fullState = combineToBase64(gameStateString, p0, p1);

    res.json({
      status: 'both_ready',
      game_state: fullState
    });
  } else {
    // Waiting for the other player
    res.json({
      status: 'waiting_for_other_player'
    });
  }
});

// Endpoint to handle state submissions during gameplay
app.post('/submit-state', (req, res) => {
  const { match_id, state } = req.body;

  if (!matches.has(match_id)) {
    return res.status(404).json({ error: 'Match not found' });
  }

  const match = matches.get(match_id);
  match.latest_state = state;

  res.json({ status: 'state_updated' });
});

// Endpoint to retrieve the latest match state
app.get('/match-state', (req, res) => {
  const { match_id } = req.query;

  if (!matches.has(match_id)) {
    return res.status(404).json({ error: 'Match not found' });
  }

  const match = matches.get(match_id);
  res.json({ latest_state: match.latest_state || '' });
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});