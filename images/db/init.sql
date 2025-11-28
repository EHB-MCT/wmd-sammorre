-- PLAYERS TABLE
CREATE TABLE IF NOT EXISTS players (
    id SERIAL PRIMARY KEY,
    player_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- SESSIONS TABLE
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    player_id INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP
);

-- LOOK TIMES TABLE
CREATE TABLE IF NOT EXISTS look_times (
    id SERIAL PRIMARY KEY,
    session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    object_name TEXT NOT NULL,
    product_genre TEXT,
    total_time FLOAT,
    created_at TIMESTAMP DEFAULT NOW()
);
