const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'fitness.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    age INTEGER,
    weight REAL,
    exercise_habit TEXT,
    health_goal TEXT,
    bmr REAL,
    weekly_plan TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS foods (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    calories REAL NOT NULL,
    protein REAL DEFAULT 0,
    carbs REAL DEFAULT 0,
    fat REAL DEFAULT 0,
    fiber REAL DEFAULT 0,
    serving_size TEXT,
    category TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS exercise_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    exercise_name TEXT NOT NULL,
    duration INTEGER NOT NULL,
    calories_burned REAL,
    intensity TEXT,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS meal_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    meal_type TEXT NOT NULL,
    food_items TEXT NOT NULL,
    total_calories REAL,
    total_protein REAL,
    total_carbs REAL,
    total_fat REAL,
    date DATE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS wearable_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date DATE NOT NULL,
    steps INTEGER,
    distance REAL,
    calories_burned REAL,
    heart_rate_avg INTEGER,
    heart_rate_max INTEGER,
    sleep_duration REAL,
    deep_sleep REAL,
    active_minutes INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS weight_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    weight REAL NOT NULL,
    date DATE NOT NULL,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  const stmt = db.prepare(`SELECT COUNT(*) as count FROM foods`);
  stmt.get((err, row) => {
    if (row.count === 0) {
      const foods = [
        { name: '米饭', calories: 116, protein: 2.6, carbs: 25.6, fat: 0.3, serving_size: '100g', category: '主食' },
        { name: '鸡胸肉', calories: 165, protein: 31, carbs: 0, fat: 3.6, serving_size: '100g', category: '肉类' },
        { name: '鸡蛋', calories: 155, protein: 13, carbs: 1.1, fat: 11, serving_size: '100g', category: '蛋类' },
        { name: '牛奶', calories: 54, protein: 3.2, carbs: 5, fat: 3.2, serving_size: '100ml', category: '乳制品' },
        { name: '苹果', calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, serving_size: '100g', category: '水果' },
        { name: '香蕉', calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, serving_size: '100g', category: '水果' },
        { name: '西兰花', calories: 34, protein: 2.8, carbs: 7, fat: 0.4, fiber: 2.6, serving_size: '100g', category: '蔬菜' },
        { name: '三文鱼', calories: 208, protein: 20, carbs: 0, fat: 13, serving_size: '100g', category: '鱼类' },
        { name: '燕麦', calories: 389, protein: 17, carbs: 66, fat: 7, fiber: 11, serving_size: '100g', category: '主食' },
        { name: '酸奶', calories: 59, protein: 10, carbs: 3.6, fat: 0.7, serving_size: '100g', category: '乳制品' },
        { name: '牛肉', calories: 250, protein: 26, carbs: 0, fat: 15, serving_size: '100g', category: '肉类' },
        { name: '豆腐', calories: 76, protein: 8, carbs: 1.9, fat: 4.8, serving_size: '100g', category: '豆制品' },
        { name: '菠菜', calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, serving_size: '100g', category: '蔬菜' },
        { name: '胡萝卜', calories: 41, protein: 0.9, carbs: 10, fat: 0.2, fiber: 2.8, serving_size: '100g', category: '蔬菜' },
        { name: '全麦面包', calories: 247, protein: 13, carbs: 41, fat: 3.4, fiber: 7, serving_size: '100g', category: '主食' },
        { name: '杏仁', calories: 579, protein: 21, carbs: 22, fat: 50, fiber: 12, serving_size: '100g', category: '坚果' },
        { name: '红薯', calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, serving_size: '100g', category: '主食' },
        { name: '虾', calories: 99, protein: 24, carbs: 0.2, fat: 0.3, serving_size: '100g', category: '海鲜' },
        { name: '西红柿', calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2, fiber: 1.2, serving_size: '100g', category: '蔬菜' },
        { name: '黄瓜', calories: 16, protein: 0.6, carbs: 3.6, fat: 0.1, fiber: 0.5, serving_size: '100g', category: '蔬菜' }
      ];

      const insertStmt = db.prepare(`INSERT INTO foods (name, calories, protein, carbs, fat, fiber, serving_size, category) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
      foods.forEach(food => {
        insertStmt.run(food.name, food.calories, food.protein, food.carbs, food.fat, food.fiber, food.serving_size, food.category);
      });
      insertStmt.finalize();
    }
  });
  stmt.finalize();
});

module.exports = db;
