const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');
const { 
  generateWeeklyPlan, 
  normalizeDateToUTC, 
  getCurrentDateInTimezone,
  calculateSafetyAdjustment
} = require('./fitnessCalculator');

const wearableBatchBuffer = new Map();
let wearableLastFlushTime = Date.now();
const WEARABLE_FLUSH_INTERVAL = 60000;

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/generate', (req, res) => {
  try {
    const { age, weight, exerciseHabit, healthGoal } = req.body;
    
    if (!age || !weight || !exerciseHabit || !healthGoal) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    
    const plan = generateWeeklyPlan({ age, weight, exerciseHabit, healthGoal });
    res.json(plan);
  } catch (error) {
    res.status(500).json({ error: '生成计划时出错' });
  }
});

app.post('/api/plans', (req, res) => {
  try {
    const { age, weight, exerciseHabit, healthGoal, bmr, weeklyPlan } = req.body;
    
    const stmt = db.prepare(`
      INSERT INTO plans (age, weight, exercise_habit, health_goal, bmr, weekly_plan)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(age, weight, exerciseHabit, healthGoal, bmr, JSON.stringify(weeklyPlan), function(err) {
      if (err) {
        return res.status(500).json({ error: '保存计划失败' });
      }
      res.json({ id: this.lastID, message: '计划保存成功' });
    });
    stmt.finalize();
  } catch (error) {
    res.status(500).json({ error: '保存计划时出错' });
  }
});

app.get('/api/plans', (req, res) => {
  db.all('SELECT * FROM plans ORDER BY created_at DESC', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取计划失败' });
    }
    const plans = rows.map(row => ({
      ...row,
      weekly_plan: JSON.parse(row.weekly_plan)
    }));
    res.json(plans);
  });
});

app.get('/api/plans/:id', (req, res) => {
  const { id } = req.params;
  db.get('SELECT * FROM plans WHERE id = ?', [id], (err, row) => {
    if (err) {
      return res.status(500).json({ error: '获取计划失败' });
    }
    if (!row) {
      return res.status(404).json({ error: '计划不存在' });
    }
    res.json({
      ...row,
      weekly_plan: JSON.parse(row.weekly_plan)
    });
  });
});

app.delete('/api/plans/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM plans WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除计划失败' });
    }
    res.json({ message: '计划删除成功' });
  });
});

app.get('/api/foods', (req, res) => {
  const { search, category } = req.query;
  let query = 'SELECT * FROM foods';
  const params = [];
  
  if (search) {
    query += ' WHERE name LIKE ?';
    params.push(`%${search}%`);
  }
  
  if (category && !search) {
    query += ' WHERE category = ?';
    params.push(category);
  } else if (category && search) {
    query += ' AND category = ?';
    params.push(category);
  }
  
  query += ' ORDER BY name';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取食物列表失败' });
    }
    res.json(rows);
  });
});

app.get('/api/foods/categories', (req, res) => {
  db.all('SELECT DISTINCT category FROM foods ORDER BY category', [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取分类失败' });
    }
    res.json(rows.map(r => r.category));
  });
});

app.post('/api/nutrition/advice', (req, res) => {
  try {
    const { bmr, healthGoal, weight, activityLevel = 'moderate' } = req.body;
    
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      athlete: 1.9
    };
    
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);
    
    let targetCalories = tdee;
    let proteinRatio = 0.25;
    let carbsRatio = 0.45;
    let fatRatio = 0.3;
    
    switch (healthGoal) {
      case 'fat_loss':
        targetCalories = tdee - 500;
        proteinRatio = 0.35;
        carbsRatio = 0.35;
        fatRatio = 0.3;
        break;
      case 'muscle_gain':
        targetCalories = tdee + 300;
        proteinRatio = 0.3;
        carbsRatio = 0.45;
        fatRatio = 0.25;
        break;
      case 'cardio':
        targetCalories = tdee;
        proteinRatio = 0.25;
        carbsRatio = 0.5;
        fatRatio = 0.25;
        break;
    }
    
    const protein = Math.round((targetCalories * proteinRatio) / 4);
    const carbs = Math.round((targetCalories * carbsRatio) / 4);
    const fat = Math.round((targetCalories * fatRatio) / 9);
    
    const mealPlan = {
      breakfast: {
        calories: Math.round(targetCalories * 0.25),
        suggestions: [
          '燕麦配牛奶和水果',
          '全麦面包配鸡蛋和蔬菜',
          '酸奶配坚果和浆果'
        ]
      },
      lunch: {
        calories: Math.round(targetCalories * 0.35),
        suggestions: [
          '鸡胸肉配糙米饭和蔬菜',
          '三文鱼配红薯和西兰花',
          '牛肉炒蔬菜配全麦面'
        ]
      },
      dinner: {
        calories: Math.round(targetCalories * 0.3),
        suggestions: [
          '鱼或海鲜配大量蔬菜',
          '豆腐或豆制品配绿叶菜',
          '瘦肉汤配少量主食'
        ]
      },
      snacks: {
        calories: Math.round(targetCalories * 0.1),
        suggestions: [
          '水果或坚果',
          '酸奶或蛋白棒',
          '蔬菜条配鹰嘴豆泥'
        ]
      }
    };
    
    res.json({
      tdee: Math.round(tdee),
      targetCalories: Math.round(targetCalories),
      macros: { protein, carbs, fat },
      mealPlan,
      tips: [
        '每天喝足够的水（2-3升）',
        '每餐都包含蛋白质',
        '多吃蔬菜水果获取纤维和维生素',
        '控制加工食品和糖分摄入',
        '规律进餐，避免暴饮暴食'
      ]
    });
  } catch (error) {
    res.status(500).json({ error: '生成饮食建议失败' });
  }
});

app.post('/api/exercise/log', (req, res) => {
  try {
    const { exerciseName, duration, caloriesBurned, intensity, date, notes } = req.body;
    const normalizedDate = date ? normalizeDateToUTC(date) : getCurrentDateInTimezone();
    
    const stmt = db.prepare(`
      INSERT INTO exercise_logs (exercise_name, duration, calories_burned, intensity, date, notes)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(exerciseName, duration, caloriesBurned, intensity, normalizedDate, notes, function(err) {
      if (err) {
        return res.status(500).json({ error: '保存运动记录失败' });
      }
      res.json({ id: this.lastID, message: '运动打卡成功！', date: normalizedDate });
    });
    stmt.finalize();
  } catch (error) {
    res.status(500).json({ error: '保存运动记录时出错' });
  }
});

app.get('/api/exercise/logs', (req, res) => {
  const { startDate, endDate, days = 30 } = req.query;
  let query = 'SELECT * FROM exercise_logs';
  const params = [];
  
  if (startDate && endDate) {
    query += ' WHERE date BETWEEN ? AND ?';
    params.push(startDate, endDate);
  } else {
    query += ` WHERE date >= date('now', '-' || ? || ' days')`;
    params.push(days);
  }
  
  query += ' ORDER BY date DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取运动记录失败' });
    }
    res.json(rows);
  });
});

app.get('/api/exercise/summary', (req, res) => {
  const { days = 30 } = req.query;
  
  db.all(`
    SELECT 
      date,
      SUM(duration) as total_duration,
      SUM(calories_burned) as total_calories,
      COUNT(*) as exercise_count
    FROM exercise_logs 
    WHERE date >= date('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date
  `, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取运动统计失败' });
    }
    
    const totalDuration = rows.reduce((sum, r) => sum + (r.total_duration || 0), 0);
    const totalCalories = rows.reduce((sum, r) => sum + (r.total_calories || 0), 0);
    const activeDays = rows.length;
    
    res.json({
      dailyData: rows,
      summary: {
        totalDuration,
        totalCalories,
        activeDays,
        avgDuration: activeDays > 0 ? Math.round(totalDuration / activeDays) : 0
      }
    });
  });
});

app.post('/api/meal/log', (req, res) => {
  try {
    const { mealType, foodItems, totalCalories, totalProtein, totalCarbs, totalFat, date } = req.body;
    const normalizedDate = date ? normalizeDateToUTC(date) : getCurrentDateInTimezone();
    
    const stmt = db.prepare(`
      INSERT INTO meal_logs (meal_type, food_items, total_calories, total_protein, total_carbs, total_fat, date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(mealType, JSON.stringify(foodItems), totalCalories, totalProtein, totalCarbs, totalFat, normalizedDate, function(err) {
      if (err) {
        return res.status(500).json({ error: '保存饮食记录失败' });
      }
      res.json({ id: this.lastID, message: '饮食记录保存成功！', date: normalizedDate });
    });
    stmt.finalize();
  } catch (error) {
    res.status(500).json({ error: '保存饮食记录时出错' });
  }
});

app.get('/api/meal/logs', (req, res) => {
  const { date, days = 7 } = req.query;
  let query = 'SELECT * FROM meal_logs';
  const params = [];
  
  if (date) {
    query += ' WHERE date = ?';
    params.push(date);
  } else {
    query += ` WHERE date >= date('now', '-' || ? || ' days')`;
    params.push(days);
  }
  
  query += ' ORDER BY date DESC, created_at DESC';
  
  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取饮食记录失败' });
    }
    const logs = rows.map(row => ({
      ...row,
      food_items: JSON.parse(row.food_items)
    }));
    res.json(logs);
  });
});

app.get('/api/nutrition/summary', (req, res) => {
  const { days = 7 } = req.query;
  
  db.all(`
    SELECT 
      date,
      SUM(total_calories) as total_calories,
      SUM(total_protein) as total_protein,
      SUM(total_carbs) as total_carbs,
      SUM(total_fat) as total_fat,
      COUNT(*) as meal_count
    FROM meal_logs 
    WHERE date >= date('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date
  `, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取营养统计失败' });
    }
    res.json(rows);
  });
});

function flushWearableBuffer() {
  if (wearableBatchBuffer.size === 0) {
    wearableLastFlushTime = Date.now();
    return;
  }
  
  const entries = Array.from(wearableBatchBuffer.values());
  
  db.serialize(() => {
    db.run('BEGIN TRANSACTION');
    
    const updateStmt = db.prepare(`
      UPDATE wearable_data 
      SET steps = ?, distance = ?, calories_burned = ?, heart_rate_avg = ?, heart_rate_max = ?, 
          sleep_duration = ?, deep_sleep = ?, active_minutes = ?
      WHERE date = ?
    `);
    
    const insertStmt = db.prepare(`
      INSERT INTO wearable_data (date, steps, distance, calories_burned, heart_rate_avg, heart_rate_max, sleep_duration, deep_sleep, active_minutes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    entries.forEach(entry => {
      db.get('SELECT id FROM wearable_data WHERE date = ?', [entry.date], (err, row) => {
        if (row) {
          updateStmt.run(entry.steps, entry.distance, entry.caloriesBurned, entry.heartRateAvg, 
                         entry.heartRateMax, entry.sleepDuration, entry.deepSleep, entry.activeMinutes, entry.date);
        } else {
          insertStmt.run(entry.date, entry.steps, entry.distance, entry.caloriesBurned, entry.heartRateAvg, 
                         entry.heartRateMax, entry.sleepDuration, entry.deepSleep, entry.activeMinutes);
        }
      });
    });
    
    db.run('COMMIT', (err) => {
      if (!err) {
        wearableBatchBuffer.clear();
        wearableLastFlushTime = Date.now();
      }
    });
    
    updateStmt.finalize();
    insertStmt.finalize();
  });
}

setInterval(flushWearableBuffer, WEARABLE_FLUSH_INTERVAL);

process.on('SIGINT', () => {
  flushWearableBuffer();
  process.exit();
});

app.post('/api/wearable/sync', (req, res) => {
  try {
    const { date, steps, distance, caloriesBurned, heartRateAvg, heartRateMax, sleepDuration, deepSleep, activeMinutes, immediate = false } = req.body;
    const normalizedDate = date ? normalizeDateToUTC(date) : getCurrentDateInTimezone();
    
    wearableBatchBuffer.set(normalizedDate, {
      date: normalizedDate,
      steps,
      distance,
      caloriesBurned,
      heartRateAvg,
      heartRateMax,
      sleepDuration,
      deepSleep,
      activeMinutes
    });
    
    if (immediate || wearableBatchBuffer.size >= 100) {
      flushWearableBuffer();
      res.json({ 
        message: '设备数据同步成功（立即写入）！', 
        bufferedCount: wearableBatchBuffer.size 
      });
    } else {
      res.json({ 
        message: '设备数据已加入同步队列', 
        bufferedCount: wearableBatchBuffer.size,
        nextFlushIn: Math.max(0, WEARABLE_FLUSH_INTERVAL - (Date.now() - wearableLastFlushTime))
      });
    }
  } catch (error) {
    res.status(500).json({ error: '同步设备数据时出错' });
  }
});

app.post('/api/wearable/batch-sync', (req, res) => {
  try {
    const { data, immediate = true } = req.body;
    
    if (!Array.isArray(data) || data.length === 0) {
      return res.status(400).json({ error: '数据格式错误，应为数组' });
    }
    
    data.forEach(item => {
      const normalizedDate = item.date ? normalizeDateToUTC(item.date) : getCurrentDateInTimezone();
      wearableBatchBuffer.set(normalizedDate, {
        ...item,
        date: normalizedDate
      });
    });
    
    if (immediate || wearableBatchBuffer.size >= 100) {
      flushWearableBuffer();
      res.json({ 
        message: `批量同步成功（${data.length}条数据已写入）！`, 
        bufferedCount: wearableBatchBuffer.size 
      });
    } else {
      res.json({ 
        message: '设备数据已加入同步队列', 
        bufferedCount: wearableBatchBuffer.size
      });
    }
  } catch (error) {
    res.status(500).json({ error: '批量同步设备数据时出错' });
  }
});

app.post('/api/wearable/flush', (req, res) => {
  try {
    const count = wearableBatchBuffer.size;
    flushWearableBuffer();
    res.json({ message: `已强制写入 ${count} 条设备数据` });
  } catch (error) {
    res.status(500).json({ error: '强制写入设备数据时出错' });
  }
});

app.get('/api/wearable/generate', (req, res) => {
  const { days = 7, baseDate } = req.query;
  const data = [];
  
  for (let i = 0; i < days; i++) {
    const date = baseDate 
      ? new Date(new Date(baseDate).getTime() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      : new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const isWeekend = new Date(date).getDay() === 0 || new Date(date).getDay() === 6;
    const activityMultiplier = isWeekend ? 1.3 : 1;
    
    data.push({
      date,
      steps: Math.round((6000 + Math.random() * 8000) * activityMultiplier),
      distance: Math.round((4 + Math.random() * 6) * activityMultiplier * 10) / 10,
      caloriesBurned: Math.round((200 + Math.random() * 400) * activityMultiplier),
      heartRateAvg: 65 + Math.round(Math.random() * 20),
      heartRateMax: 120 + Math.round(Math.random() * 60),
      sleepDuration: 6 + Math.round(Math.random() * 3 * 10) / 10,
      deepSleep: 1.5 + Math.round(Math.random() * 2 * 10) / 10,
      activeMinutes: Math.round((30 + Math.random() * 90) * activityMultiplier)
    });
  }
  
  res.json(data.reverse());
});

app.get('/api/wearable/data', (req, res) => {
  const { days = 30 } = req.query;
  
  db.all(`
    SELECT * FROM wearable_data 
    WHERE date >= date('now', '-' || ? || ' days')
    ORDER BY date
  `, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取设备数据失败' });
    }
    res.json(rows);
  });
});

app.post('/api/weight/log', (req, res) => {
  try {
    const { weight, date, notes } = req.body;
    const normalizedDate = date ? normalizeDateToUTC(date) : getCurrentDateInTimezone();
    
    db.get('SELECT id FROM weight_tracking WHERE date = ?', [normalizedDate], (err, row) => {
      if (row) {
        const stmt = db.prepare('UPDATE weight_tracking SET weight = ?, notes = ? WHERE date = ?');
        stmt.run(weight, notes, normalizedDate, function(err) {
          if (err) {
            return res.status(500).json({ error: '更新体重记录失败' });
          }
          res.json({ id: row.id, message: '体重记录更新成功！', date: normalizedDate });
        });
        stmt.finalize();
      } else {
        const stmt = db.prepare('INSERT INTO weight_tracking (weight, date, notes) VALUES (?, ?, ?)');
        stmt.run(weight, normalizedDate, notes, function(err) {
          if (err) {
            return res.status(500).json({ error: '保存体重记录失败' });
          }
          res.json({ id: this.lastID, message: '体重记录保存成功！', date: normalizedDate });
        });
        stmt.finalize();
      }
    });
  } catch (error) {
    res.status(500).json({ error: '保存体重记录时出错' });
  }
});

app.get('/api/weight/logs', (req, res) => {
  const { days = 90 } = req.query;
  
  db.all(`
    SELECT * FROM weight_tracking 
    WHERE date >= date('now', '-' || ? || ' days')
    ORDER BY date
  `, [days], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: '获取体重记录失败' });
    }
    res.json(rows);
  });
});

app.get('/api/dashboard/summary', (req, res) => {
  const { days = 7 } = req.query;
  
  Promise.all([
    new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          SUM(duration) as total_exercise_duration,
          SUM(calories_burned) as exercise_calories,
          COUNT(*) as workout_count
        FROM exercise_logs 
        WHERE date >= date('now', '-' || ? || ' days')
      `, [days], (err, row) => resolve(row));
    }),
    new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          SUM(total_calories) as total_nutrition_calories,
          SUM(total_protein) as total_protein,
          SUM(total_carbs) as total_carbs,
          SUM(total_fat) as total_fat
        FROM meal_logs 
        WHERE date >= date('now', '-' || ? || ' days')
      `, [days], (err, row) => resolve(row));
    }),
    new Promise((resolve, reject) => {
      db.get(`
        SELECT 
          AVG(steps) as avg_steps,
          AVG(sleep_duration) as avg_sleep,
          SUM(active_minutes) as total_active_minutes
        FROM wearable_data 
        WHERE date >= date('now', '-' || ? || ' days')
      `, [days], (err, row) => resolve(row));
    }),
    new Promise((resolve, reject) => {
      db.all('SELECT weight, date FROM weight_tracking ORDER BY date DESC LIMIT 2', [], (err, rows) => {
        resolve(rows);
      });
    })
  ]).then(([exerciseData, nutritionData, wearableData, weightData]) => {
    const weightTrend = weightData.length >= 2 
      ? Math.round((weightData[0].weight - weightData[1].weight) * 10) / 10 
      : 0;
    
    res.json({
      exercise: {
        totalDuration: exerciseData?.total_exercise_duration || 0,
        caloriesBurned: exerciseData?.exercise_calories || 0,
        workoutCount: exerciseData?.workout_count || 0
      },
      nutrition: {
        totalCalories: nutritionData?.total_nutrition_calories || 0,
        totalProtein: nutritionData?.total_protein || 0,
        totalCarbs: nutritionData?.total_carbs || 0,
        totalFat: nutritionData?.total_fat || 0
      },
      wearable: {
        avgSteps: Math.round(wearableData?.avg_steps || 0),
        avgSleep: wearableData?.avg_sleep || 0,
        totalActiveMinutes: wearableData?.total_active_minutes || 0
      },
      weight: {
        current: weightData[0]?.weight || 0,
        trend: weightTrend
      }
    });
  });
});

app.delete('/api/exercise/log/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM exercise_logs WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除运动记录失败' });
    }
    res.json({ message: '运动记录删除成功' });
  });
});

app.delete('/api/meal/log/:id', (req, res) => {
  const { id } = req.params;
  db.run('DELETE FROM meal_logs WHERE id = ?', [id], function(err) {
    if (err) {
      return res.status(500).json({ error: '删除饮食记录失败' });
    }
    res.json({ message: '饮食记录删除成功' });
  });
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
