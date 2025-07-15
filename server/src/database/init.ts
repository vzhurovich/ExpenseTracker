import sqlite3 from 'sqlite3';
import path from 'path';

const dbPath = path.join(__dirname, '../../data/expense_tracker.db');

export const db = new sqlite3.Database(dbPath);

export async function initializeDatabase(): Promise<void> {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          first_name TEXT NOT NULL,
          last_name TEXT NOT NULL,
          role TEXT NOT NULL DEFAULT 'staff',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Expenses table
      db.run(`
        CREATE TABLE IF NOT EXISTS expenses (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          amount DECIMAL(10,2) NOT NULL,
          description TEXT NOT NULL,
          receipt_image TEXT,
          receipt_date DATE,
          category TEXT,
          status TEXT DEFAULT 'pending',
          submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          approved_at DATETIME,
          approved_by INTEGER,
          notes TEXT,
          FOREIGN KEY (user_id) REFERENCES users (id),
          FOREIGN KEY (approved_by) REFERENCES users (id)
        )
      `);

      // Create indexes
      db.run('CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)');

      // Insert default admin user if not exists
      db.get('SELECT id FROM users WHERE email = ?', ['vz0011223344@gmail.com'], (err, row) => {
        if (!row) {
          const bcrypt = require('bcryptjs');
          const hashedPassword = bcrypt.hashSync('admin123', 10);
          db.run(`
            INSERT INTO users (email, password_hash, first_name, last_name, role)
            VALUES (?, ?, ?, ?, ?)
          `, ['vz0011223344@gmail.com', hashedPassword, 'Admin', 'User', 'admin']);
        }
        resolve();
      });
    });
  });
} 