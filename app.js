const express = require("express");
const app = express();
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");

app.use(express.json());

const dbPath = path.join(__dirname, "cricketMatchDetails.db");
let db = null;
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB ERROR : ${e.message}`);
    process.exit(1);
  }
};
initializeDbAndServer();

// get player details
app.get("/players/", async (request, response) => {
  const getAllPlayers = `
      SELECT *
      FROM
      player_details;`;
  const dbResponse = await db.all(getAllPlayers);
  function convertToCamelCase(player) {
    return {
      playerId: player.player_id,
      playerName: player.player_name,
    };
  }
  const details = dbResponse.map(convertToCamelCase);
  response.send(details);
});

//Get a specific player

app.get("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const getPlayer = `
      SELECT
       *
      FROM
        player_details
      WHERE 
      player_id = ${playerId};`;
  const dbResp = await db.get(getPlayer);
  const playerInfo = {
    playerId: dbResp.player_id,
    playerName: dbResp.player_name,
  };
  response.send(playerInfo);
});

//Update player details

app.put("/players/:playerId/", async (request, response) => {
  const { playerId } = request.params;
  const newPlayerInfo = request.body;
  const { playerName } = newPlayerInfo;
  const updatePlayer = `
    UPDATE 
        player_details
    SET 
        player_name = '${playerName}'
    WHERE 
        player_id = ${playerId};`;
  await db.run(updatePlayer);
  response.send("Player Details Updated");
});

//Particular Match Details

app.get("/matches/:matchId/", async (request, response) => {
  const { matchId } = request.params;
  const getMatchDetails = `
      SELECT
       *
      FROM
       match_details
      WHERE 
        match_id = ${matchId};
    `;
  const dbResponse = await db.get(getMatchDetails);
  const matchInfo = {
    matchId: dbResponse.match_id,
    match: dbResponse.match,
    year: dbResponse.year,
  };
  response.send(matchInfo);
});

// Particular player match details
app.get("/players/:playerId/matches/", async (request, response) => {
  const { playerId } = request.params;
  const playerMatchDetails = `
      SELECT
        *
      FROM
        player_match_score
      INNER JOIN match_details ON
        player_match_score.match_id = match_details.match_id
      WHERE
        player_match_score.player_id = ${playerId};`;
  const dbResp = await db.all(playerMatchDetails);
  function convert(eachObj) {
    const { match_id, match, year } = eachObj;
    return {
      matchId: match_id,
      match: match,
      year: year,
    };
  }

  const matchDetails = dbResp.map(convert);
  response.send(matchDetails);
});

//players of specific match

app.get("/matches/:matchId/players/", async (request, response) => {
  const { matchId } = request.params;
  const playersQuery = `
      SELECT
       *
      FROM
       player_match_score 
      INNER JOIN player_details ON 
       player_match_score.player_id = player_details.player_id
      WHERE 
       player_match_score.match_id = ${matchId};`;
  const dbResp = await db.all(playersQuery);

  function convert(eachObj) {
    const { player_id, player_name } = eachObj;
    return {
      playerId: player_id,
      playerName: player_name,
    };
  }
  const playerDetails = dbResp.map(convert);
  response.send(playerDetails);
});

app.get("/players/:playerId/playerScores/", async (request, response) => {
  const { playerId } = request.params;
  const scoreQuery = `
    SELECT 
        player_details.player_id,
        player_details.player_name,
        SUM(score) as totalScores,
        SUM(fours) as totalFours,
        SUM(sixes) as totalSixes
        
    FROM 
        player_details
    INNER JOIN player_match_score ON
        player_details.player_id = player_match_score.player_id
    WHERE 
        player_details.player_id = ${playerId}
    GROUP BY
        player_details.player_id;
    `;
  const dbResp = await db.get(scoreQuery);
  const {
    player_id,
    player_name,
    totalScores,
    totalFours,
    totalSixes,
  } = dbResp;

  const scoresInfo = {
    playerId: player_id,
    playerName: player_name,
    totalScore: totalScores,
    totalFours: totalFours,
    totalSixes: totalSixes,
  };

  response.send(scoresInfo);
});

module.exports = app;
