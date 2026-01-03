import express from "express";
import { Pool } from "pg";
import cors from "cors";

const app = express();
app.use(cors());
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
      GROUP BY p.player_name
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

/* -------------------------------------------
   GET PRODUCT HIERARCHY FOR ICICLE CHART
--------------------------------------------*/
app.get("/product-hierarchy/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await pool.query(`
      SELECT 
        lt.product_genre,
        lt.object_name as product,
        SUM(lt.total_time) as total_time_seconds
      FROM look_times lt
      JOIN sessions s ON lt.session_id = s.id
      JOIN players p ON s.player_id = p.id
      WHERE p.player_name = $1
        AND lt.product_genre IS NOT NULL
        AND lt.object_name IS NOT NULL
      GROUP BY lt.product_genre, lt.object_name
      ORDER BY lt.product_genre ASC, total_time_seconds DESC
    `, [username]);
    
    // Build hierarchical structure for icicle chart
    const genreMap = {};
    result.rows.forEach(row => {
      if (!genreMap[row.product_genre]) {
        genreMap[row.product_genre] = {
          name: row.product_genre,
          children: []
        };
      }
      genreMap[row.product_genre].children.push({
        name: row.product,
        value: row.total_time_seconds
      });
    });
    
    const hierarchy = {
      name: "All Products",
      children: Object.values(genreMap)
    };
    
    res.json({
      success: true,
      data: hierarchy,
      count: result.rows.length
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
   GET SESSION TIMING FOR HORIZONTAL BAR CHART
--------------------------------------------*/
app.get("/session-timing/:username", async (req, res) => {
  try {
    const { username } = req.params;
    
    const result = await pool.query(`
      SELECT 
        s.id as session_id,
        DATE(s.started_at) as date,
        EXTRACT(HOUR FROM s.started_at) as hour,
        EXTRACT(MINUTE FROM s.started_at) as minute,
        CASE 
          WHEN s.ended_at IS NOT NULL THEN
            ROUND(EXTRACT(EPOCH FROM (s.ended_at - s.started_at)), 2)
          ELSE 0
        END as duration_seconds
      FROM sessions s
      JOIN players p ON s.player_id = p.id
      WHERE p.player_name = $1
        AND s.started_at IS NOT NULL
      ORDER BY s.started_at DESC
      LIMIT 50
    `, [username]);
    
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
   GET USER WITH MOST SESSIONS
--------------------------------------------*/
    /* -------------------------------------------
       GET DETAILED SESSIONS FOR VISUALIZATION
    --------------------------------------------*/
    console.log("Registering user-sessions-detailed route...");
    app.get("/user-sessions-detailed/:username", async (req, res) => {
      try {
        const { username } = req.params;
        
        // Simplified query to get session data with products and categories
        const query = `
          SELECT 
            s.id,
            s.started_at::timestamp as session_date,
            lt.object_name,
            lt.product_genre,
            lt.total_time
          FROM sessions s
          LEFT JOIN look_times lt ON s.id = lt.session_id
          LEFT JOIN players p ON s.player_id = p.id
          WHERE p.player_name = $1
            AND lt.object_name IS NOT NULL
          ORDER BY s.started_at DESC, lt.created_at
        `;
        
        console.log("Executing query for username:", username);
        console.log("Query:", query);
        console.log("Starting database query...");
        
        let result;
        try {
          result = await pool.query(query, [username]);
          console.log("Query successful, rows returned:", result.rowCount);
          
          if (result.rowCount === 0) {
            return res.json({
              success: true,
              data: [],
              count: 0
            });
          }
          
          // Process the results into expected format
          const sessionMap = new Map();
          result.rows.forEach(row => {
            const sessionKey = row.id.toString();
            if (!sessionMap.has(sessionKey)) {
              sessionMap.set(sessionKey, {
                id: sessionKey,
                session_date: row.session_date,
                products: [],
                total_time: 0
              });
            }
            const session = sessionMap.get(sessionKey);
            if (row.object_name) {
              session.products.push({
                object_name: row.object_name,
                product_genre: row.product_genre || 'Uncategorized',
                total_time: row.total_time
              });
              session.total_time += row.total_time || 0;
            }
          });
          
          const sessions = Array.from(sessionMap.values());
          
          res.json({
            success: true,
            data: sessions,
            count: sessions.length
          });
          
        } catch (dbError) {
          console.error("Database query failed:", dbError);
          console.log("Error details:", {
            message: dbError.message,
            detail: dbError.detail,
            where: dbError.where,
            code: dbError.code
          });
          res.status(500).json({ 
            success: false, 
            error: 'Database query failed',
            details: dbError.message || 'Unknown database error'
          });
        }
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    });

/* -------------------------------------------
   GENERATE SAMPLE DATA
--------------------------------------------*/
app.post("/generate-sample-data", async (req, res) => {
  try {
    await pool.query('BEGIN');

    // Clear existing data
    await pool.query('DELETE FROM look_times');
    await pool.query('DELETE FROM sessions');
    await pool.query('DELETE FROM players');

    // Sample users
    const users = [
      'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry'
    ];

    // Product data by genre
    const productData = {
      'Electronics': [
        'Laptop Pro', 'Smartphone X', 'Wireless Headphones', 'Smart Watch', 'Tablet Plus',
        'Gaming Console', 'Bluetooth Speaker', 'Digital Camera', 'Fitness Tracker', 'Drone'
      ],
      'Clothing': [
        'Cotton T-Shirt', 'Denim Jeans', 'Winter Jacket', 'Running Shoes', 'Dress Shirt',
        'Wool Sweater', 'Sports Shorts', 'Leather Boots', 'Casual Hoodie', 'Formal Suit'
      ],
      'Books': [
        'JavaScript Guide', 'Python Cookbook', 'Design Patterns', 'Data Science', 'Web Development',
        'Machine Learning', 'Database Design', 'UI/UX Principles', 'Cloud Computing', 'DevOps Handbook'
      ],
      'Home': [
        'Coffee Maker', 'Vacuum Cleaner', 'Microwave Oven', 'Air Purifier', 'Smart Thermostat',
        'LED TV', 'Washing Machine', 'Dishwasher', 'Blender', 'Toaster Oven'
      ],
      'Sports': [
        'Yoga Mat', 'Dumbbells Set', 'Running Shoes', 'Tennis Racket', 'Basketball',
        'Swimming Goggles', 'Cycling Helmet', 'Golf Clubs', 'Soccer Ball', 'Tennis Balls'
      ],
      'Beauty': [
        'Face Cream', 'Makeup Palette', 'Hair Serum', 'Nail Polish', 'Perfume',
        'Lipstick Set', 'Eye Shadow', 'Foundation', 'Shampoo', 'Body Lotion'
      ]
    };

    // Insert users
    const userIds = {};
    for (const userName of users) {
      const result = await pool.query(
        'INSERT INTO players (player_name) VALUES ($1) RETURNING id',
        [userName]
      );
      userIds[userName] = result.rows[0]?.id;
      userIds[userName] = result.rows[0].id;
    }

    // Generate sessions and look times
    const sessionsPerUser = 4;
    const lookTimesPerSession = 8;

    for (const userName of users) {
      const userId = userIds[userName];
      
      for (let sessionIndex = 0; sessionIndex < sessionsPerUser; sessionIndex++) {
        // Create session with realistic timing
        const sessionDate = new Date();
        sessionDate.setDate(sessionDate.getDate() - Math.floor(Math.random() * 30));
        sessionDate.setHours(Math.floor(Math.random() * 24));
        sessionDate.setMinutes(Math.floor(Math.random() * 60));
        
        const sessionDuration = 5 + Math.floor(Math.random() * 25) * 60; // 5-30 minutes in seconds
        const sessionEnd = new Date(sessionDate.getTime() + sessionDuration * 1000);

        const sessionResult = await pool.query(`
          INSERT INTO sessions (player_id, started_at, ended_at) 
          VALUES ($1, $2, $3) RETURNING id
        `, [userId, sessionDate, sessionEnd]);

        const sessionId = sessionResult.rows[0].id;

        // Generate look times for this session
        const genres = Object.keys(productData);
        const selectedGenres = [];
        
        // Select 2-4 random genres for this session
        const genreCount = 2 + Math.floor(Math.random() * 3);
        for (let i = 0; i < genreCount; i++) {
          const genre = genres[Math.floor(Math.random() * genres.length)];
          if (!selectedGenres.includes(genre)) {
            selectedGenres.push(genre);
          }
        }

        for (const genre of selectedGenres) {
          const products = productData[genre];
          const product = products[Math.floor(Math.random() * products.length)];
          const lookTime = 2 + Math.floor(Math.random() * 43); // 2-45 seconds

          await pool.query(`
            INSERT INTO look_times (session_id, object_name, product_genre, total_time)
            VALUES ($1, $2, $3, $4)
          `, [sessionId, product, genre, lookTime]);
        }
      }
    }

    await pool.query('COMMIT');

    res.json({
      success: true,
      message: `Generated sample data for ${users.length} users with ${users.length * sessionsPerUser} sessions`,
      users: users.length,
      sessions: users.length * sessionsPerUser,
      lookTimes: users.length * sessionsPerUser * lookTimesPerSession
    });

  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Error generating sample data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
   GET USER WITH MOST SESSIONS
--------------------------------------------*/
app.get("/user-with-most-sessions", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.player_name as user,
        COUNT(s.id) as session_count
      FROM players p
      LEFT JOIN sessions s ON p.id = s.player_id
      GROUP BY p.player_name
      ORDER BY session_count DESC
      LIMIT 1
    `);
    
    if (result.rows.length === 0) {
      return res.json({
        success: true,
        data: null
      });
    }
    
    res.json({
      success: true,
      data: {
        user: result.rows[0].user,
        session_count: parseInt(result.rows[0].session_count)
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
    GET ALL USERS ENDPOINT
 --------------------------------------------*/
app.get("/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        p.player_name as user,
        COUNT(s.id) as session_count
      FROM players p
      LEFT JOIN sessions s ON p.id = s.player_id
      GROUP BY p.player_name
      HAVING COUNT(s.id) > 0
      ORDER BY session_count DESC, p.player_name ASC
      LIMIT 50
    `);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* -------------------------------------------
    SEARCH USERS ENDPOINT
 --------------------------------------------*/
app.get("/users-search/:query", async (req, res) => {
  try {
    const { query } = req.params;
    
    const result = await pool.query(`
      SELECT 
        p.player_name as user,
        COUNT(s.id) as session_count
      FROM players p
      LEFT JOIN sessions s ON p.id = s.player_id
      WHERE p.player_name ILIKE $1
      GROUP BY p.player_name
      ORDER BY session_count DESC, p.player_name
      LIMIT 10
    `, [`%${query}%`]);
    
    res.json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

    console.log("API routes registered:");
    app.listen(3000, () => console.log("API running on port 3000"));
