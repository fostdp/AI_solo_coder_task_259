import React, { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [formData, setFormData] = useState({
    age: 25,
    weight: 70,
    exerciseHabit: 'moderate',
    healthGoal: 'fat_loss'
  });
  const [generatedPlan, setGeneratedPlan] = useState(null);
  const [savedPlans, setSavedPlans] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  
  const [foods, setFoods] = useState([]);
  const [foodSearch, setFoodSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [nutritionAdvice, setNutritionAdvice] = useState(null);
  
  const [selectedMeals, setSelectedMeals] = useState([]);
  const [mealType, setMealType] = useState('breakfast');
  
  const [exerciseLogs, setExerciseLogs] = useState([]);
  const [exerciseForm, setExerciseForm] = useState({
    exerciseName: '',
    duration: 30,
    caloriesBurned: 200,
    intensity: '中等',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [mealLogs, setMealLogs] = useState([]);
  
  const [wearableData, setWearableData] = useState([]);
  const [weightLogs, setWeightLogs] = useState([]);
  const [weightForm, setWeightForm] = useState({
    weight: 70,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [dashboardData, setDashboardData] = useState(null);
  const [exerciseSummary, setExerciseSummary] = useState(null);
  const [nutritionSummary, setNutritionSummary] = useState([]);

  useEffect(() => {
    fetchFoods();
    fetchCategories();
    fetchDashboard();
    fetchExerciseSummary();
    fetchNutritionSummary();
    fetchWearableData();
  }, []);

  const fetchFoods = async () => {
    try {
      const response = await axios.get('/api/foods', {
        params: { search: foodSearch, category: selectedCategory }
      });
      setFoods(response.data);
    } catch (error) {
      console.error('获取食物列表失败:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await axios.get('/api/foods/categories');
      setCategories(response.data);
    } catch (error) {
      console.error('获取分类失败:', error);
    }
  };

  const fetchDashboard = async () => {
    try {
      const response = await axios.get('/api/dashboard/summary');
      setDashboardData(response.data);
    } catch (error) {
      console.error('获取仪表盘数据失败:', error);
    }
  };

  const fetchExerciseSummary = async () => {
    try {
      const response = await axios.get('/api/exercise/summary');
      setExerciseSummary(response.data);
    } catch (error) {
      console.error('获取运动统计失败:', error);
    }
  };

  const fetchNutritionSummary = async () => {
    try {
      const response = await axios.get('/api/nutrition/summary');
      setNutritionSummary(response.data);
    } catch (error) {
      console.error('获取营养统计失败:', error);
    }
  };

  const fetchWearableData = async () => {
    try {
      const response = await axios.get('/api/wearable/data');
      setWearableData(response.data);
    } catch (error) {
      console.error('获取设备数据失败:', error);
    }
  };

  const fetchPlans = async () => {
    try {
      const response = await axios.get('/api/plans');
      setSavedPlans(response.data);
    } catch (error) {
      console.error('获取计划失败:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'age' || name === 'weight' ? Number(value) : value
    }));
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/generate', formData);
      setGeneratedPlan(response.data);
      
      const adviceResponse = await axios.post('/api/nutrition/advice', {
        bmr: response.data.bmr,
        healthGoal: formData.healthGoal,
        weight: formData.weight,
        activityLevel: formData.exerciseHabit
      });
      setNutritionAdvice(adviceResponse.data);
    } catch (error) {
      console.error('生成计划失败:', error);
    }
  };

  const handleSavePlan = async () => {
    if (!generatedPlan) return;
    try {
      await axios.post('/api/plans', {
        ...formData,
        bmr: generatedPlan.bmr,
        weeklyPlan: generatedPlan.weeklyPlan
      });
      setSuccessMessage('计划保存成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('保存计划失败:', error);
    }
  };

  const addFoodToMeal = (food) => {
    setSelectedMeals(prev => [...prev, { ...food, quantity: 1 }]);
  };

  const removeFoodFromMeal = (index) => {
    setSelectedMeals(prev => prev.filter((_, i) => i !== index));
  };

  const getMealTotals = () => {
    return selectedMeals.reduce((totals, food) => ({
      calories: totals.calories + food.calories * food.quantity,
      protein: totals.protein + food.protein * food.quantity,
      carbs: totals.carbs + food.carbs * food.quantity,
      fat: totals.fat + food.fat * food.quantity
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 });
  };

  const handleSaveMeal = async () => {
    if (selectedMeals.length === 0) return;
    const totals = getMealTotals();
    try {
      await axios.post('/api/meal/log', {
        mealType,
        foodItems: selectedMeals,
        totalCalories: totals.calories,
        totalProtein: totals.protein,
        totalCarbs: totals.carbs,
        totalFat: totals.fat,
        date: new Date().toISOString().split('T')[0]
      });
      setSelectedMeals([]);
      setSuccessMessage('饮食记录保存成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchNutritionSummary();
      fetchDashboard();
    } catch (error) {
      console.error('保存饮食记录失败:', error);
    }
  };

  const handleExerciseInputChange = (e) => {
    const { name, value } = e.target;
    setExerciseForm(prev => ({
      ...prev,
      [name]: name === 'duration' || name === 'caloriesBurned' ? Number(value) : value
    }));
  };

  const handleSaveExercise = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/exercise/log', exerciseForm);
      setSuccessMessage('运动打卡成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
      setExerciseForm({
        exerciseName: '',
        duration: 30,
        caloriesBurned: 200,
        intensity: '中等',
        date: new Date().toISOString().split('T')[0],
        notes: ''
      });
      fetchExerciseSummary();
      fetchDashboard();
    } catch (error) {
      console.error('保存运动记录失败:', error);
    }
  };

  const generateAndSyncWearableData = async () => {
    try {
      const generateResponse = await axios.get('/api/wearable/generate', { params: { days: 7 } });
      const data = generateResponse.data;
      
      for (const item of data) {
        await axios.post('/api/wearable/sync', item);
      }
      
      setSuccessMessage('可穿戴设备数据同步成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchWearableData();
      fetchDashboard();
    } catch (error) {
      console.error('同步设备数据失败:', error);
    }
  };

  const handleWeightInputChange = (e) => {
    const { name, value } = e.target;
    setWeightForm(prev => ({
      ...prev,
      [name]: name === 'weight' ? Number(value) : value
    }));
  };

  const handleSaveWeight = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/api/weight/log', weightForm);
      setSuccessMessage('体重记录保存成功！');
      setTimeout(() => setSuccessMessage(''), 3000);
      fetchDashboard();
    } catch (error) {
      console.error('保存体重记录失败:', error);
    }
  };

  const getGoalText = (goal) => {
    const goals = {
      fat_loss: '减脂',
      muscle_gain: '增肌',
      cardio: '心肺功能'
    };
    return goals[goal] || goal;
  };

  const getMealTypeText = (type) => {
    const types = {
      breakfast: '早餐',
      lunch: '午餐',
      dinner: '晚餐',
      snacks: '加餐'
    };
    return types[type] || type;
  };

  const renderChart = (data, key, label, color) => {
    if (!data || data.length === 0) return null;
    const max = Math.max(...data.map(d => d[key]));
    return (
      <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '8px', padding: '10px 0' }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                width: '100%',
                height: `${(item[key] / max) * 80}px`,
                background: color,
                borderRadius: '4px 4px 0 0',
                minHeight: '4px'
              }}
            />
            <small style={{ fontSize: '10px', color: '#666', marginTop: '4px' }}>
              {item.date?.slice(5) || ''}
            </small>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="container">
      <div className="header">
        <h1>🏋️ 运动健康处方生成器</h1>
        <p>科学管理您的运动、饮食和健康数据</p>
      </div>

      {successMessage && (
        <div className="success-message" style={{ marginBottom: '20px' }}>
          {successMessage}
        </div>
      )}

      <div className="tabs" style={{ marginBottom: '20px' }}>
        {[
          { id: 'dashboard', label: '📊 仪表盘' },
          { id: 'generate', label: '🎯 生成计划' },
          { id: 'nutrition', label: '🍎 饮食管理' },
          { id: 'exercise', label: '🏃 运动打卡' },
          { id: 'wearable', label: '⌚ 设备数据' },
          { id: 'history', label: '📁 历史计划' }
        ].map(tab => (
          <button
            key={tab.id}
            className={`tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && dashboardData && (
        <div className="card">
          <h2 className="section-title">📊 健康仪表盘</h2>
          
          <div className="summary" style={{ marginBottom: '30px' }}>
            <div className="summary-item">
              <h3>本周运动时长</h3>
              <div className="value">{dashboardData.exercise.totalDuration} 分钟</div>
              <small style={{ opacity: 0.8, fontSize: '0.8rem' }}>
                {dashboardData.exercise.workoutCount} 次训练
              </small>
            </div>
            <div className="summary-item">
              <h3>消耗热量</h3>
              <div className="value">{dashboardData.exercise.caloriesBurned} 千卡</div>
            </div>
            <div className="summary-item">
              <h3>平均步数</h3>
              <div className="value">{dashboardData.wearable.avgSteps}</div>
            </div>
            <div className="summary-item">
              <h3>平均睡眠</h3>
              <div className="value">{dashboardData.wearable.avgSleep.toFixed(1)}h</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
            <div className="card" style={{ margin: 0, padding: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>🏃 运动趋势</h3>
              {exerciseSummary && renderChart(exerciseSummary.dailyData, 'total_duration', '分钟', 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)')}
            </div>
            <div className="card" style={{ margin: 0, padding: '20px' }}>
              <h3 style={{ marginBottom: '15px', color: '#333' }}>🍎 热量摄入</h3>
              {renderChart(nutritionSummary, 'total_calories', '千卡', 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)')}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: '20px' }}>
            <div className="card" style={{ margin: 0, padding: '20px' }}>
              <h3 style={{ marginBottom: '10px', color: '#333' }}>⚖️ 体重</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#667eea' }}>
                {dashboardData.weight.current} kg
              </div>
              <div style={{ color: dashboardData.weight.trend > 0 ? '#ef4444' : '#10b981' }}>
                    {dashboardData.weight.trend > 0 ? '↑' : dashboardData.weight.trend < 0 ? '↓' : '→'} {Math.abs(dashboardData.weight.trend)} kg
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '20px' }}>
              <h3 style={{ marginBottom: '10px', color: '#333' }}>🥩 蛋白质摄入</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#f5576c' }}>
                {Math.round(dashboardData.nutrition.totalProtein)} g
              </div>
            </div>
            <div className="card" style={{ margin: 0, padding: '20px' }}>
              <h3 style={{ marginBottom: '10px', color: '#333' }}>⏰ 活跃分钟</h3>
              <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981' }}>
                {dashboardData.wearable.totalActiveMinutes} 分钟
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'generate' && (
        <>
          <div className="card">
            <h2 className="section-title">输入您的信息</h2>
            <form onSubmit={handleGenerate}>
              <div className="form-row">
                <div className="form-group">
                  <label>年龄</label>
                  <input
                    type="number"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    min="10"
                    max="100"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>体重 (kg)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight}
                    onChange={handleInputChange}
                    min="30"
                    max="200"
                    step="0.1"
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>运动习惯</label>
                  <select
                    name="exerciseHabit"
                    value={formData.exerciseHabit}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="sedentary">久坐不动</option>
                    <option value="light">轻度运动 (每周1-2次)</option>
                    <option value="moderate">中等运动 (每周3-4次)</option>
                    <option value="active">积极运动 (每周5-6次)</option>
                    <option value="athlete">运动员级 (每天运动)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>健康目标</label>
                  <select
                    name="healthGoal"
                    value={formData.healthGoal}
                    onChange={handleInputChange}
                    required
                  >
                    <option value="fat_loss">减脂</option>
                    <option value="muscle_gain">增肌</option>
                    <option value="cardio">提升心肺功能</option>
                  </select>
                </div>
              </div>
              <button type="submit" className="btn btn-primary">
                生成运动处方 🚀
              </button>
            </form>
          </div>

          {generatedPlan && (
            <>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h2 className="section-title" style={{ marginBottom: 0, border: 'none' }}>
                    您的运动处方
                  </h2>
                  <button onClick={handleSavePlan} className="btn btn-success">
                    保存计划 💾
                  </button>
                </div>

                <div className="bmr-info" style={{ marginTop: '20px' }}>
                  基础代谢率 (BMR): <strong>{generatedPlan.bmr} 千卡/天</strong>
                </div>

                <div className="summary">
                  <div className="summary-item">
                    <h3>总运动时长</h3>
                    <div className="value">{generatedPlan.summary.totalDuration} 分钟</div>
                  </div>
                  <div className="summary-item">
                    <h3>预计消耗</h3>
                    <div className="value">{generatedPlan.summary.totalCalories} 千卡</div>
                  </div>
                  <div className="summary-item">
                    <h3>运动天数</h3>
                    <div className="value">{generatedPlan.summary.exerciseDays} 天</div>
                  </div>
                  <div className="summary-item">
                    <h3>目标</h3>
                    <div className="value">{getGoalText(formData.healthGoal)}</div>
                  </div>
                </div>

                <h3 style={{ marginTop: '20px', marginBottom: '10px', color: '#333' }}>
                  周计划日历
                </h3>
                <div className="calendar">
                  {generatedPlan.weeklyPlan.map((day, index) => (
                    <div key={index} className={`calendar-day ${day.type}`}>
                      <div className="day-name">{day.day}</div>
                      <div className="exercise-name">{day.exercise}</div>
                      {day.type !== 'rest' && (
                        <div className="exercise-details">
                          <div>⏱️ {day.duration} 分钟</div>
                          <div>💪 {day.intensity}</div>
                          <div>🔥 {day.calories} 千卡</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {nutritionAdvice && (
                <div className="card">
                  <h2 className="section-title">🍎 个性化饮食建议</h2>
                  
                  <div className="summary">
                    <div className="summary-item">
                      <h3>每日消耗 (TDEE)</h3>
                      <div className="value">{nutritionAdvice.tdee} 千卡</div>
                    </div>
                    <div className="summary-item">
                      <h3>目标摄入</h3>
                      <div className="value">{nutritionAdvice.targetCalories} 千卡</div>
                    </div>
                    <div className="summary-item">
                      <h3>蛋白质</h3>
                      <div className="value">{nutritionAdvice.macros.protein} g</div>
                    </div>
                    <div className="summary-item">
                      <h3>碳水</h3>
                      <div className="value">{nutritionAdvice.macros.carbs} g</div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginTop: '20px' }}>
                    {Object.entries(nutritionAdvice.mealPlan).map(([key, meal]) => (
                      <div key={key} className="card" style={{ margin: 0, padding: '15px' }}>
                        <h4 style={{ marginBottom: '10px', color: '#333' }}>
                          {getMealTypeText(key)} ({meal.calories} 千卡)
                        </h4>
                        <ul style={{ paddingLeft: '20px', color: '#666' }}>
                          {meal.suggestions.map((s, i) => (
                            <li key={i} style={{ marginBottom: '5px' }}>{s}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: '20px', background: '#f0f9ff', padding: '15px', borderRadius: '8px' }}>
                    <h4 style={{ marginBottom: '10px', color: '#0369a1' }}>💡 健康小贴士</h4>
                    <ul style={{ paddingLeft: '20px', color: '#666' }}>
                      {nutritionAdvice.tips.map((tip, i) => (
                        <li key={i} style={{ marginBottom: '5px' }}>{tip}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {activeTab === 'nutrition' && (
        <>
          <div className="card">
            <h2 className="section-title">🍎 食物热量查询</h2>
            <div className="form-row">
              <div className="form-group">
              <label>搜索食物</label>
              <input
                type="text"
                value={foodSearch}
                onChange={(e) => setFoodSearch(e.target.value)}
                placeholder="输入食物名称..."
              />
            </div>
            <div className="form-group">
              <label>分类</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="">全部分类</option>
                {categories.map(cat => (
                  <option key={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </div>
          <button onClick={fetchFoods} className="btn btn-secondary" style={{ marginBottom: '20px' }}>
            搜索 🔍
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
            {foods.map(food => (
              <div
                key={food.id}
                style={{
                  padding: '12px',
                  background: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e0e0e0',
                  cursor: 'pointer'
                }}
                onClick={() => addFoodToMeal(food)}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{food.name}</div>
                <div style={{ fontSize: '0.85rem', color: '#666' }}>
                  {food.calories} 千卡 / {food.serving_size}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#999', marginTop: '3px' }}>
                  蛋白质 {food.protein}g · 碳水 {food.carbs}g · 脂肪 {food.fat}g
                </div>
                <div style={{ fontSize: '0.7rem', color: '#667eea', marginTop: '5px' }}>
                  {food.category}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h2 className="section-title">🍽️ 记录饮食</h2>
          <div className="form-row">
            <div className="form-group">
              <label>餐次</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value)}
              >
                <option value="breakfast">早餐</option>
                <option value="lunch">午餐</option>
                <option value="dinner">晚餐</option>
                <option value="snacks">加餐</option>
              </select>
            </div>
          </div>

          {selectedMeals.length > 0 && (
            <>
              <h4 style={{ margin: '15px 0 10px' }}>已选食物：</h4>
              <div style={{ marginBottom: '15px' }}>
                {selectedMeals.map((meal, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: '#f0f9ff',
                      borderRadius: '6px',
                      marginBottom: '8px'
                    }}
                  >
                    <span>{meal.name} - {meal.calories} 千卡</span>
                    <button
                      onClick={() => removeFoodFromMeal(index)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '1.2rem'
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                padding: '15px',
                borderRadius: '8px',
                marginBottom: '15px'
              }}>
                <strong>总计：</strong>
                {getMealTotals().calories} 千卡 |
                蛋白质 {getMealTotals().protein.toFixed(1)}g |
                碳水 {getMealTotals().carbs.toFixed(1)}g |
                脂肪 {getMealTotals().fat.toFixed(1)}g
              </div>
              <button onClick={handleSaveMeal} className="btn btn-success">
                保存饮食记录 💾
              </button>
            </>
          )}
        </div>
      )}

      {activeTab === 'exercise' && (
        <>
          <div className="card">
            <h2 className="section-title">🏃 运动打卡</h2>
            <form onSubmit={handleSaveExercise}>
              <div className="form-row">
                <div className="form-group">
                  <label>运动项目</label>
                  <input
                    type="text"
                    name="exerciseName"
                    value={exerciseForm.exerciseName}
                    onChange={handleExerciseInputChange}
                    placeholder="例如：跑步、游泳、力量训练..."
                    required
                  />
                </div>
                <div className="form-group">
                  <label>日期</label>
                  <input
                    type="date"
                    name="date"
                    value={exerciseForm.date}
                    onChange={handleExerciseInputChange}
                    required
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>时长 (分钟)</label>
                  <input
                    type="number"
                    name="duration"
                    value={exerciseForm.duration}
                    onChange={handleExerciseInputChange}
                    min="1"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>消耗热量 (千卡)</label>
                  <input
                    type="number"
                    name="caloriesBurned"
                    value={exerciseForm.caloriesBurned}
                    onChange={handleExerciseInputChange}
                    min="1"
                    required
                  />
                </div>
              </div>
              <div className="form-group">
                <label>强度</label>
                <select
                  name="intensity"
                  value={exerciseForm.intensity}
                  onChange={handleExerciseInputChange}
                >
                  <option value="低">低强度</option>
                  <option value="中等">中等强度</option>
                  <option value="高">高强度</option>
                </select>
              </div>
              <div className="form-group">
                <label>备注</label>
                <input
                type="text"
                name="notes"
                value={exerciseForm.notes}
                onChange={handleExerciseInputChange}
                placeholder="可选：感受、状态..."
              />
            </div>
            <button type="submit" className="btn btn-primary">
              完成打卡 ✅
            </button>
          </form>
        </div>

        <div className="card" style={{ marginTop: '20px' }}>
          <h2 className="section-title">⚖️ 体重记录</h2>
          <form onSubmit={handleSaveWeight}>
            <div className="form-row">
              <div className="form-group">
                <label>体重 (kg)</label>
                <input
                  type="number"
                  name="weight"
                  value={weightForm.weight}
                  onChange={handleWeightInputChange}
                  step="0.1"
                  required
                />
              </div>
              <div className="form-group">
                <label>日期</label>
                <input
                  type="date"
                  name="date"
                  value={weightForm.date}
                  onChange={handleWeightInputChange}
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label>备注</label>
              <input
                type="text"
                name="notes"
                value={weightForm.notes}
                onChange={handleWeightInputChange}
                placeholder="例如：晨起空腹、饭后等..."
              />
            </div>
            <button type="submit" className="btn btn-primary">
              记录体重 ⚖️
            </button>
          </form>
        </div>
      )}

      {activeTab === 'wearable' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 className="section-title" style={{ margin: 0, border: 'none' }}>⌚ 可穿戴设备数据</h2>
            <button onClick={generateAndSyncWearableData} className="btn btn-success">
              模拟同步数据 🔄
            </button>
          </div>

          {wearableData.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              暂无设备数据，点击上方按钮模拟同步
            </p>
          ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8f9fa' }}>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>日期</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>步数</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>距离(km)</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>消耗</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>平均心率</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>睡眠(h)</th>
                      <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e0e0e0' }}>活跃分钟</th>
                    </tr>
                  </thead>
                  <tbody>
                    {wearableData.map((item, index) => (
                      <tr key={index}>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{item.date}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>
                          <strong style={{ color: '#667eea' }}>{item.steps?.toLocaleString()}</strong>
                        </td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{item.distance}</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{item.calories_burned} 千卡</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{item.heart_rate_avg} bpm</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{item.sleep_duration}h</td>
                        <td style={{ padding: '12px', borderBottom: '1px solid #e0e0e0' }}>{item.active_minutes} 分钟</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="card">
          <h2 className="section-title">📁 历史计划</h2>
          {savedPlans.length === 0 ? (
            <p style={{ textAlign: 'center', color: '#666', padding: '40px' }}>
              暂无保存的计划，快去生成一个吧！
            </p>
          ) : (
            <div className="plans-list">
              {savedPlans.map((plan) => (
                <div key={plan.id} className="plan-item">
                  <div className="plan-info">
                    <h4>
                      {getGoalText(plan.health_goal)} · {plan.age}岁 · {plan.weight}kg
                    </h4>
                    <p>
                      运动习惯: {plan.exercise_habit === 'sedentary' ? '久坐不动' :
                        plan.exercise_habit === 'light' ? '轻度运动' :
                        plan.exercise_habit === 'moderate' ? '中等运动' :
                        plan.exercise_habit === 'active' ? '积极运动' : '运动员级'} ·
                      创建时间: {new Date(plan.created_at).toLocaleString('zh-CN')}
                    </p>
                    <p style={{ marginTop: '4px' }}>
                      基础代谢: {plan.bmr} 千卡/天
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
