import express from "express";
import { Pool } from "pg";

const app = express();
app.use(express.json());

const pool = new Pool({
  user: "postgres",
  host: "db",
  database: "mydb",
  password: "mysecretpassword",
  port: 5432,
});

/* -------------------------------------------
   CREATE PLAYER
--------------------------------------------*/
app.post("/player", async (req, res) => {
  try {
    const { playerName } = req.body;
    const result = await pool.query("INSERT INTO players (player_name) VALUES ($1) RETURNING id;", [playerName]);
    res.json({ success: true, playerId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
   START SESSION
--------------------------------------------*/
app.post("/session/start", async (req, res) => {
  try {
    const { playerId } = req.body;

    const result = await pool.query("INSERT INTO sessions (player_id) VALUES ($1) RETURNING id;", [playerId]);

    res.json({ success: true, sessionId: result.rows[0].id });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
   END SESSION
--------------------------------------------*/
app.post("/session/end", async (req, res) => {
  try {
    const { sessionId } = req.body;
    await pool.query("UPDATE sessions SET ended_at = NOW() WHERE id = $1;", [sessionId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
   SEND LOOKTIME DATA
--------------------------------------------*/
app.post("/looktime", async (req, res) => {
  try {
    const { sessionId, items } = req.body;

    for (const item of items) {
      await pool.query(
        `INSERT INTO look_times (session_id, object_name, product_genre, total_time)
                 VALUES ($1, $2, $3, $4)`,
        [sessionId, item.objectName, item.productGenre, item.totalTime]
      );
    }

    res.json({ success: true, inserted: items.length });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("API running on port 3000"));
