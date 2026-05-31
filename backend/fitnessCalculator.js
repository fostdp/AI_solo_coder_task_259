function validateUserInput(age, weight) {
  const warnings = [];
  
  if (age < 12) {
    warnings.push({
      type: 'age_too_young',
      level: 'high',
      message: '年龄过小（12岁以下），建议在专业指导下进行运动'
    });
  }
  
  if (age > 65) {
    warnings.push({
      type: 'age_senior',
      level: 'medium',
      message: '年龄较大（65岁以上），建议降低运动强度，优先选择低冲击运动'
    });
  }
  
  if (weight < 40) {
    warnings.push({
      type: 'weight_too_low',
      level: 'high',
      message: '体重过轻（40kg以下），建议先咨询医生，避免高强度运动'
    });
  }
  
  if (weight > 120) {
    warnings.push({
      type: 'weight_too_high',
      level: 'high',
      message: '体重过重（120kg以上），建议选择低冲击运动，避免膝盖损伤'
    });
  }
  
  return warnings;
}

function calculateSafetyAdjustment(age, weight) {
  let intensityMultiplier = 1.0;
  let durationMultiplier = 1.0;
  let metsMultiplier = 1.0;
  
  if (age < 12) {
    intensityMultiplier = 0.5;
    durationMultiplier = 0.6;
    metsMultiplier = 0.6;
  } else if (age > 65) {
    intensityMultiplier = 0.7;
    durationMultiplier = 0.8;
    metsMultiplier = 0.7;
  } else if (age > 50) {
    intensityMultiplier = 0.85;
    durationMultiplier = 0.9;
    metsMultiplier = 0.85;
  }
  
  if (weight < 40) {
    intensityMultiplier = Math.min(intensityMultiplier, 0.6);
    durationMultiplier = Math.min(durationMultiplier, 0.7);
    metsMultiplier = Math.min(metsMultiplier, 0.6);
  } else if (weight > 120) {
    intensityMultiplier = Math.min(intensityMultiplier, 0.7);
    durationMultiplier = Math.min(durationMultiplier, 0.8);
    metsMultiplier = Math.min(metsMultiplier, 0.7);
  } else if (weight > 100) {
    intensityMultiplier = Math.min(intensityMultiplier, 0.85);
    durationMultiplier = Math.min(durationMultiplier, 0.9);
    metsMultiplier = Math.min(metsMultiplier, 0.85);
  }
  
  return { intensityMultiplier, durationMultiplier, metsMultiplier };
}

function adjustIntensityLevel(intensity, multiplier) {
  const intensityLevels = {
    '低': 1,
    '中等': 2,
    '中高': 3,
    '高强度': 4
  };
  
  const reverseLevels = ['低', '中等', '中高', '高强度'];
  
  let level = intensityLevels[intensity] || 2;
  let adjustedLevel = level * multiplier;
  
  if (adjustedLevel <= 1.5) {
    return '低';
  } else if (adjustedLevel <= 2.5) {
    return '中等';
  } else if (adjustedLevel <= 3.5) {
    return '中高';
  } else {
    return '高强度';
  }
}

function calculateBMR(weight, age, gender = 'male') {
  if (weight <= 0 || age <= 0) {
    throw new Error('体重和年龄必须为正数');
  }
  return 10 * weight + 6.25 * 170 - 5 * age + (gender === 'male' ? 5 : -161);
}

function calculateCaloriesBurned(mets, weight, durationMinutes) {
  if (mets <= 0 || weight <= 0 || durationMinutes <= 0) {
    throw new Error('METs、体重和时长必须为正数');
  }
  return (mets * 3.5 * weight / 200) * durationMinutes;
}

function calculateHeartRateZones(age, restingHR = 70) {
  if (age <= 0) {
    throw new Error('年龄必须为正数');
  }
  const maxHR = 220 - age;
  const hrReserve = maxHR - restingHR;
  
  return {
    maxHeartRate: maxHR,
    restingHeartRate: restingHR,
    zones: {
      warmUp: {
        name: '热身区',
        min: Math.round(restingHR + hrReserve * 0.5),
        max: Math.round(restingHR + hrReserve * 0.6),
        description: '低强度，适合热身和恢复'
      },
      fatBurn: {
        name: '燃脂区',
        min: Math.round(restingHR + hrReserve * 0.6),
        max: Math.round(restingHR + hrReserve * 0.7),
        description: '中等强度，主要燃烧脂肪'
      },
      aerobic: {
        name: '有氧区',
        min: Math.round(restingHR + hrReserve * 0.7),
        max: Math.round(restingHR + hrReserve * 0.8),
        description: '中高强度，提升心肺功能'
      },
      anaerobic: {
        name: '无氧区',
        min: Math.round(restingHR + hrReserve * 0.8),
        max: Math.round(restingHR + hrReserve * 0.9),
        description: '高强度，提升速度和力量训练'
      },
      maxEffort: {
        name: '极限区',
        min: Math.round(restingHR + hrReserve * 0.9),
        max: maxHR,
        description: '极限强度，仅适合短时间间歇训练'
      }
    }
  };
}

function detectPlanConflicts(weeklyPlan) {
  const conflicts = [];
  const exerciseDays = weeklyPlan.filter(day => day.type !== 'rest');
  
  exerciseDays.forEach((day, index) => {
    if (day.duration > 120) {
      conflicts.push({
        type: 'duration',
        day: day.day,
        message: `${day.day}的${day.exercise}时长过长（${day.duration}分钟），建议单次运动不超过120分钟`
      });
    }
    
    if (day.type === 'hiit' && day.duration > 45) {
      conflicts.push({
        type: 'hiit_duration',
        day: day.day,
        message: `${day.day}的HIIT训练时长过长（${day.duration}分钟），建议HIIT训练不超过45分钟`
      });
    }
  });
  
  const hiitDays = exerciseDays.filter(d => d.type === 'hiit');
  if (hiitDays.length > 3) {
    conflicts.push({
      type: 'hiit_frequency',
      message: `HIIT训练过于频繁（${hiitDays.length}天），建议每周不超过3天`
    });
  }
  
  const consecutiveHighIntensity = [];
  for (let i = 0; i < weeklyPlan.length - 1; i++) {
    const today = weeklyPlan[i];
    const tomorrow = weeklyPlan[i + 1];
    const isTodayHigh = today.intensity === '高强度' || today.intensity === '中高';
    const isTomorrowHigh = tomorrow.intensity === '高强度' || tomorrow.intensity === '中高';
    
    if (isTodayHigh && isTomorrowHigh && today.type !== 'rest' && tomorrow.type !== 'rest') {
      if (!consecutiveHighIntensity.includes(today.day)) {
        consecutiveHighIntensity.push(today.day);
      }
      if (!consecutiveHighIntensity.includes(tomorrow.day)) {
        consecutiveHighIntensity.push(tomorrow.day);
      }
    }
  }
  
  if (consecutiveHighIntensity.length > 0) {
    conflicts.push({
      type: 'consecutive_high_intensity',
      message: `存在连续高强度训练日：${consecutiveHighIntensity.join('、')}，建议中间安排休息日或低强度训练`
    });
  }
  
  const restDays = weeklyPlan.filter(d => d.type === 'rest').length;
  if (restDays === 0) {
    conflicts.push({
      type: 'no_rest_days',
      message: '每周至少需要1-2个休息日进行恢复'
    });
  }
  
  if (restDays > 3) {
    conflicts.push({
      type: 'too_many_rest_days',
      message: `休息日过多（${restDays}天），建议每周至少运动3-5天`
    });
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  };
}

function getExerciseTypes(healthGoal) {
  const exercises = {
    fat_loss: [
      { name: '有氧慢跑', type: 'cardio', intensity: '中等', mets: 8.0 },
      { name: '快走', type: 'cardio', intensity: '中等', mets: 5.0 },
      { name: '跳绳', type: 'cardio', intensity: '高强度', mets: 12.0 },
      { name: '游泳', type: 'cardio', intensity: '中等', mets: 7.0 },
      { name: '动感单车', type: 'cardio', intensity: '中高', mets: 7.5 },
      { name: 'HIIT', type: 'hiit', intensity: '高强度', mets: 11.0 }
    ],
    muscle_gain: [
      { name: '力量训练', type: 'strength', intensity: '中高', mets: 6.0 },
      { name: '深蹲', type: 'strength', intensity: '高强度', mets: 5.0 },
      { name: '卧推', type: 'strength', intensity: '中高', mets: 5.5 },
      { name: '硬拉', type: 'strength', intensity: '高强度', mets: 6.0 },
      { name: '引体向上', type: 'strength', intensity: '中高', mets: 4.5 },
      { name: '哑铃训练', type: 'strength', intensity: '中等', mets: 4.0 }
    ],
    cardio: [
      { name: '长跑', type: 'cardio', intensity: '中高', mets: 11.0 },
      { name: '游泳', type: 'cardio', intensity: '中等', mets: 7.0 },
      { name: '椭圆机', type: 'cardio', intensity: '中等', mets: 6.0 },
      { name: '划船机', type: 'cardio', intensity: '中高', mets: 7.0 },
      { name: '爬楼梯', type: 'cardio', intensity: '中高', mets: 9.0 },
      { name: '登山', type: 'cardio', intensity: '中高', mets: 8.0 }
    ]
  };
  return exercises[healthGoal] || exercises.fat_loss;
}

function adjustByHabit(exerciseHabit) {
  const multipliers = {
    sedentary: { duration: 0.7, frequency: 0.6, intensity: 0.7 },
    light: { duration: 0.85, frequency: 0.8, intensity: 0.85 },
    moderate: { duration: 1.0, frequency: 1.0, intensity: 1.0 },
    active: { duration: 1.15, frequency: 1.2, intensity: 1.15 },
    athlete: { duration: 1.3, frequency: 1.4, intensity: 1.3 }
  };
  return multipliers[exerciseHabit] || multipliers.moderate;
}

function generateWeeklyPlan(userData) {
  const { age, weight, exerciseHabit, healthGoal } = userData;
  const bmr = calculateBMR(weight, age);
  const habitAdjust = adjustByHabit(exerciseHabit);
  const exercises = getExerciseTypes(healthGoal);
  const safetyWarnings = validateUserInput(age, weight);
  const safetyAdjustment = calculateSafetyAdjustment(age, weight);
  
  const baseDuration = 45;
  const baseFrequency = healthGoal === 'muscle_gain' ? 4 : 5;
  
  const adjustedDuration = Math.round(baseDuration * habitAdjust.duration * safetyAdjustment.durationMultiplier);
  let adjustedFrequency = Math.max(3, Math.min(7, Math.round(baseFrequency * habitAdjust.frequency)));
  
  if (safetyWarnings.length > 0) {
    adjustedFrequency = Math.min(5, adjustedFrequency);
  }
  
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  const weeklyPlan = [];
  
  const exerciseDays = days.slice(0, adjustedFrequency);
  const restDays = days.slice(adjustedFrequency);
  
  exerciseDays.forEach((day, index) => {
    const exercise = exercises[index % exercises.length];
    let duration = adjustedDuration;
    
    if (exercise.type === 'hiit') {
      duration = Math.round(duration * 0.6);
    } else if (exercise.type === 'strength') {
      duration = healthGoal === 'muscle_gain' ? Math.round(duration * 1.2) : duration;
    }
    
    const adjustedIntensity = adjustIntensityLevel(exercise.intensity, safetyAdjustment.intensityMultiplier);
    const adjustedMets = Math.max(2.0, exercise.mets * safetyAdjustment.metsMultiplier);
    
    weeklyPlan.push({
      day,
      exercise: exercise.name,
      type: exercise.type,
      duration,
      intensity: adjustedIntensity,
      mets: adjustedMets,
      calories: Math.round((adjustedMets * 3.5 * weight / 200) * duration)
    });
  });
  
  restDays.forEach(day => {
    weeklyPlan.push({
      day,
      exercise: '休息日',
      type: 'rest',
      duration: 0,
      intensity: '无',
      mets: 1.0,
      calories: 0
    });
  });
  
  const conflictDetection = detectPlanConflicts(weeklyPlan);
  const heartRateZones = calculateHeartRateZones(age);
  
  return {
    bmr: Math.round(bmr),
    weeklyPlan,
    heartRateZones,
    conflictDetection,
    safetyWarnings,
    safetyAdjustment,
    summary: {
      totalDuration: weeklyPlan.reduce((sum, day) => sum + day.duration, 0),
      totalCalories: weeklyPlan.reduce((sum, day) => sum + day.calories, 0),
      exerciseDays: adjustedFrequency,
      avgIntensity: habitAdjust.intensity
    }
  };
}

function getLocalDate(dateStr) {
  if (!dateStr) {
    const now = new Date();
    return now.toLocaleDateString('zh-CN', { 
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
    }).replace(/\//g, '-');
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error('无效的日期格式');
  }
  
  return date.toLocaleDateString('zh-CN', { 
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone 
  }).replace(/\//g, '-');
}

function normalizeDateToUTC(dateStr) {
  if (!dateStr) {
    return new Date().toISOString().split('T')[0];
  }
  
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) {
    throw new Error('无效的日期格式');
  }
  
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

function getCurrentDateInTimezone(tz = 'Asia/Shanghai') {
  const now = new Date();
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  try {
    return now.toLocaleDateString('en-CA', { ...options, timeZone: tz });
  } catch (e) {
    return now.toISOString().split('T')[0];
  }
}

module.exports = { 
  generateWeeklyPlan, 
  calculateBMR, 
  calculateCaloriesBurned, 
  calculateHeartRateZones,
  detectPlanConflicts,
  getExerciseTypes,
  adjustByHabit,
  validateUserInput,
  calculateSafetyAdjustment,
  adjustIntensityLevel,
  getLocalDate,
  normalizeDateToUTC,
  getCurrentDateInTimezone
};
