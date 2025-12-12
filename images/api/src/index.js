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

/* -------------------------------------------
   GET DATA FOR VISUALIZATION
--------------------------------------------*/
app.get("/data", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        lt.object_name, 
        lt.product_genre, 
        lt.total_time, 
        p.player_name,
        s.started_at as session_date
      FROM look_times lt
      JOIN sessions s ON lt.session_id = s.id
      JOIN players p ON s.player_id = p.id
      ORDER BY s.started_at DESC
      LIMIT 100
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
   GET SESSION COUNT BY USER FOR CHART
--------------------------------------------*/
app.get("/user-sessions", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.player_name as user,
        COUNT(s.id)::integer as session_count
      FROM players p
      LEFT JOIN sessions s ON p.id = s.player_id
      GROUP BY p.id, p.player_name
      HAVING COUNT(s.id) > 0
      ORDER BY session_count DESC, p.player_name ASC
      LIMIT 10
    `);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.listen(3000, () => console.log("API running on port 3000"));
