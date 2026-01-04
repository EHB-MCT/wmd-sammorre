# WMD Sam Morre - Shopping Data Collection

A data collection system that tracks user shopping behavior through game interactions and visualizes the collected data through a web dashboard.

## Playing the game
this github page doesnt include the game files.
To play the game, download the entire project from https://ehb-my.sharepoint.com/:u:/g/personal/sam_morre_student_ehb_be/IQDVgEhyXhzBTYFM4me9fHqWAVlL5UUfzTohkZw8VIgnnTU?e=w35gV0

## Features

- Unity game that tracks user shopping behavior
- Real-time data collection of viewing patterns and duration
- PostgreSQL database for data storage
- Web dashboard with interactive visualizations
- Docker containerization for easy deployment

## Tech Stack

**Frontend**: Vue.js 3, Vite, Chart.js  
**Backend**: Node.js, Express.js, PostgreSQL  
**Game**: Unity, C#  
**DevOps**: Docker, Docker Compose

## Setup

### Docker (Recommended)
```bash
docker-compose up -build
# Web Dashboard: http://localhost:8080
# API Server: http://localhost:3000
# Database: localhost:5432
```

### Manual Setup
```bash
# API Server
cd images/api && npm install && npm start

# Web Dashboard
cd images/web && npm install && npm run dev

# Database
# PostgreSQL 16 with provided init.sql
```

**Don't forget**: `cp .env.template .env` and configure your environment variables!

## Project Structure

```
wmd-sammorre/
├── docker-compose.yml        # Service orchestration
├── images/
│   ├── api/              # Node.js API Service
│   │   ├── src/
│   │   │   └── index.js     # Express application
│   │   ├── Dockerfile      # Backend container
│   │   └── package.json     # Backend dependencies
│   ├── web/              # Vue 3 Frontend Service
│   │   ├── src/
│   │   │   └── App.vue       # Single-page application
│   │   ├── Dockerfile       # Frontend container
│   │   └── package.json      # Vue 3 dependencies
│   └── db/               # Database initialization
│       └── init.sql           # Database schema
├── unity_scripts/           # Unity Game Client
│   └── Assets/Code/Scripts/
│       └── GameLogger.cs      # Game data logging
└── _volumes/               # Persistent data storage
    └── pgdata/              # PostgreSQL data
```

## Current Status

### Implemented
- **User Tracking** - Records what products the user looks at
- **Duration Measurement** - Measures viewing time for each product
- **Database Integration** - Stores all collected data in PostgreSQL
- **Web Dashboard** - Real-time visualization of user behavior
- **Docker Setup** - Complete containerized environment

### In Development
- **Product Suggestions** - Smart recommendations based on user behavior
- **Advanced Analytics** - Pattern recognition and insights
- **User Profiles** - Personalized experience tracking

## Data Collection

The system currently tracks:
- **Product Information** - What items users view
- **View Duration** - How long each product is looked at
- **Timestamps** - When sessions occur

## Dev Commands

**API**: `npm start | dev` (in `images/api/`)  
**Web**: `npm run dev | build` (in `images/web/`)  
**Docker**: `docker-compose up -d | down`

## Sources & References

**Easy Peasy First Person Controller** - (https://postgresql.org](https://assetstore.unity.com/packages/tools/physics/easy-peasy-first-person-controller-317073)
    found in unity_scripts\Assets\EasyPeasyFirstPersonController\Scripts\FirstPersonController.cs

**PostgreSQL Documentation** - [postgresql.org](https://postgresql.org)  
   Database design and queries

**Unity Documentation** - [docs.unity3d.com](https://docs.unity3d.com)  
   Game development and C# scripting

**D3js chart** - [d3js.org](https://observablehq.com/@d3/zoomable-icicle)  
   Data visualization and interactive charts

6**Docker Compose** - [docs.docker.com](https://docs.docker.com/compose)  
   Containerization and multi-container applications

**Opencode** - promts can be found in docs/OPENCODE.txt

## Important Notes

- This is a **simulation project** for educational purposes
- All data is generated through game interactions, not real user tracking
- Demonstrates data collection capabilities for research and education
- Privacy considerations are built into the system design

## License

MIT License - see [LICENSE.md](./LICENSE.md)
