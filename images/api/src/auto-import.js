import fs from 'fs';
import path from 'path';

// Auto-import functionality for startup data initialization
class AutoImporter {
  constructor(pool) {
    this.pool = pool;
    this.dataPath = path.join(process.cwd(), 'data');
  }

  async checkDatabaseEmpty() {
    try {
      const result = await this.pool.query('SELECT COUNT(*) as count FROM players');
      return parseInt(result.rows[0].count) === 0;
    } catch (error) {
      console.error('Error checking database emptiness:', error);
      return false;
    }
  }

  async importDataFromFile(filename, tableName, insertQuery, transformRow = null) {
    try {
      const filePath = path.join(this.dataPath, filename);
      
      if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filename}`);
        return { success: false, message: `File not found: ${filename}` };
      }

      const fileContent = fs.readFileSync(filePath, 'utf8');
      const data = JSON.parse(fileContent);

      if (!Array.isArray(data) || data.length === 0) {
        console.log(`No data in file: ${filename}`);
        return { success: true, imported: 0 };
      }

      await this.pool.query('BEGIN');
      let importedCount = 0;

      for (const row of data) {
        const transformedRow = transformRow ? transformRow(row) : row;
        const values = Object.values(transformedRow);
        const placeholders = values.map((_, index) => `$${index + 1}`).join(', ');
        
        await this.pool.query(insertQuery, values);
        importedCount++;
      }

      await this.pool.query('COMMIT');
      
      console.log(`✅ Imported ${importedCount} records from ${filename} to ${tableName}`);
      return { success: true, imported: importedCount };

    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error(`Error importing ${filename}:`, error);
      return { success: false, error: error.message };
    }
  }

  async importAllData() {
    console.log('🚀 Starting automatic data import...');
    
    const isEmpty = await this.checkDatabaseEmpty();
    if (!isEmpty) {
      console.log('📊 Database already contains data, skipping auto-import');
      return { success: true, action: 'skipped', reason: 'Database not empty' };
    }

    console.log('📁 Database is empty, importing from data folder...');
    
    let totalImported = 0;

    try {
      await this.pool.query('BEGIN');

      // Import players first
      const playersPath = path.join(this.dataPath, 'players.json');
      if (fs.existsSync(playersPath)) {
        const playersData = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
        
        for (const player of playersData) {
          await this.pool.query(
            'INSERT INTO players (id, player_name, created_at) VALUES ($1, $2, $3)',
            [1000 + player.id, player.player_name, player.created_at]
          );
          totalImported++;
        }
        console.log(`✅ Imported ${playersData.length} players`);
      }

      // Import sessions
      const sessionsPath = path.join(this.dataPath, 'sessions.json');
      if (fs.existsSync(sessionsPath)) {
        const sessionsData = JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
        
        for (const session of sessionsData) {
          await this.pool.query(
            'INSERT INTO sessions (id, player_id, started_at, ended_at) VALUES ($1, $2, $3, $4)',
            [2000 + session.id, 1000 + session.player_id, session.started_at, session.ended_at]
          );
          totalImported++;
        }
        console.log(`✅ Imported ${sessionsData.length} sessions`);
      }

      // Import look_times
      const lookTimesPath = path.join(this.dataPath, 'look_times.json');
      if (fs.existsSync(lookTimesPath)) {
        const lookTimesData = JSON.parse(fs.readFileSync(lookTimesPath, 'utf8'));
        
        for (const lookTime of lookTimesData) {
          await this.pool.query(
            'INSERT INTO look_times (id, session_id, object_name, product_genre, total_time, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
            [3000 + lookTime.id, 2000 + lookTime.session_id, lookTime.object_name, lookTime.product_genre, lookTime.total_time, lookTime.created_at]
          );
          totalImported++;
        }
        console.log(`✅ Imported ${lookTimesData.length} look_times`);
      }

      await this.pool.query('COMMIT');
      console.log(`✅ Auto-import complete! Total records imported: ${totalImported}`);
      
      return { success: true, action: 'imported', totalImported };
      
    } catch (error) {
      await this.pool.query('ROLLBACK');
      console.error('❌ Auto-import failed:', error);
      return { success: false, error: error.message };
    }
  }
}

export default AutoImporter;