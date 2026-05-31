const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const {
  calculateBMR,
  calculateCaloriesBurned,
  calculateHeartRateZones,
  detectPlanConflicts,
  getExerciseTypes,
  adjustByHabit,
  generateWeeklyPlan,
  validateUserInput,
  calculateSafetyAdjustment,
  adjustIntensityLevel,
  getLocalDate,
  normalizeDateToUTC,
  getCurrentDateInTimezone
} = require('../fitnessCalculator');

describe('BMR基础代谢率计算', () => {
  it('应该正确计算男性BMR', () => {
    const bmr = calculateBMR(70, 25, 'male');
    const expected = 10 * 70 + 6.25 * 170 - 5 * 25 + 5;
    assert.strictEqual(bmr, expected);
  });

  it('应该正确计算女性BMR', () => {
    const bmr = calculateBMR(60, 25, 'female');
    const expected = 10 * 60 + 6.25 * 170 - 5 * 25 - 161;
    assert.strictEqual(bmr, expected);
  });

  it('默认性别为男性', () => {
    const bmr1 = calculateBMR(70, 25);
    const bmr2 = calculateBMR(70, 25, 'male');
    assert.strictEqual(bmr1, bmr2);
  });

  it('体重为0时应该抛出错误', () => {
    assert.throws(() => calculateBMR(0, 25), /体重和年龄必须为正数/);
  });

  it('年龄为0时应该抛出错误', () => {
    assert.throws(() => calculateBMR(70, 0), /体重和年龄必须为正数/);
  });

  it('体重为负数时应该抛出错误', () => {
    assert.throws(() => calculateBMR(-70, 25), /体重和年龄必须为正数/);
  });

  it('年龄为负数时应该抛出错误', () => {
    assert.throws(() => calculateBMR(70, -25), /体重和年龄必须为正数/);
  });

  it('年龄增长时BMR应该降低', () => {
    const bmrYoung = calculateBMR(70, 20);
    const bmrOld = calculateBMR(70, 50);
    assert.ok(bmrYoung > bmrOld);
  });

  it('体重增加时BMR应该升高', () => {
    const bmrLight = calculateBMR(60, 25);
    const bmrHeavy = calculateBMR(80, 25);
    assert.ok(bmrLight < bmrHeavy);
  });
});

describe('卡路里消耗计算', () => {
  it('应该正确计算基于METs的卡路里消耗', () => {
    const calories = calculateCaloriesBurned(8.0, 70, 45);
    const expected = (8.0 * 3.5 * 70 / 200) * 45;
    assert.strictEqual(calories, expected);
  });

  it('慢跑30分钟应该消耗合理的卡路里', () => {
    const calories = calculateCaloriesBurned(8.0, 70, 30);
    assert.ok(calories > 200 && calories < 400);
  });

  it('HIIT训练应该比普通有氧运动消耗更多卡路里', () => {
    const hiitCalories = calculateCaloriesBurned(12.0, 70, 30);
    const jogCalories = calculateCaloriesBurned(8.0, 70, 30);
    assert.ok(hiitCalories > jogCalories);
  });

  it('相同时间内，体重越大消耗越多', () => {
    const caloriesLight = calculateCaloriesBurned(8.0, 60, 30);
    const caloriesHeavy = calculateCaloriesBurned(8.0, 80, 30);
    assert.ok(caloriesLight < caloriesHeavy);
  });

  it('METs为0时应该抛出错误', () => {
    assert.throws(() => calculateCaloriesBurned(0, 70, 30), /METs、体重和时长必须为正数/);
  });

  it('体重为负数时应该抛出错误', () => {
    assert.throws(() => calculateCaloriesBurned(8.0, -70, 30), /METs、体重和时长必须为正数/);
  });

  it('时长为负数时应该抛出错误', () => {
    assert.throws(() => calculateCaloriesBurned(8.0, 70, -30), /METs、体重和时长必须为正数/);
  });

  it('时长为0时应该抛出错误', () => {
    assert.throws(() => calculateCaloriesBurned(8.0, 70, 0), /METs、体重和时长必须为正数/);
  });

  it('公式计算应该准确：METs * 3.5 * 体重 / 200 * 分钟', () => {
    const mets = 10;
    const weight = 75;
    const duration = 60;
    const result = calculateCaloriesBurned(mets, weight, duration);
    const manualCalc = (mets * 3.5 * weight / 200) * duration;
    assert.strictEqual(result, manualCalc);
  });
});

describe('心率区间计算', () => {
  it('应该正确计算最大心率', () => {
    const age = 25;
    const hrZones = calculateHeartRateZones(age);
    assert.strictEqual(hrZones.maxHeartRate, 220 - age);
  });

  it('应该正确设置静息心率', () => {
    const hrZones = calculateHeartRateZones(25, 65);
    assert.strictEqual(hrZones.restingHeartRate, 65);
  });

  it('默认静息心率应该是70', () => {
    const hrZones = calculateHeartRateZones(25);
    assert.strictEqual(hrZones.restingHeartRate, 70);
  });

  it('年龄为负数时应该抛出错误', () => {
    assert.throws(() => calculateHeartRateZones(-25), /年龄必须为正数/);
  });

  it('年龄为0时应该抛出错误', () => {
    assert.throws(() => calculateHeartRateZones(0), /年龄必须为正数/);
  });

  it('应该包含5个心率区间', () => {
    const hrZones = calculateHeartRateZones(25);
    const zoneNames = Object.keys(hrZones.zones);
    assert.strictEqual(zoneNames.length, 5);
  });

  it('心率区间应该按顺序递增', () => {
    const hrZones = calculateHeartRateZones(25);
    const zones = hrZones.zones;
    
    assert.ok(zones.warmUp.min < zones.warmUp.max);
    assert.ok(zones.warmUp.max <= zones.fatBurn.min);
    assert.ok(zones.fatBurn.max <= zones.aerobic.min);
    assert.ok(zones.aerobic.max <= zones.anaerobic.min);
    assert.ok(zones.anaerobic.max <= zones.maxEffort.min);
  });

  it('极限区最大值应该等于最大心率', () => {
    const hrZones = calculateHeartRateZones(25);
    assert.strictEqual(hrZones.zones.maxEffort.max, hrZones.maxHeartRate);
  });

  it('每个区间应该有正确的名称', () => {
    const hrZones = calculateHeartRateZones(25);
    assert.strictEqual(hrZones.zones.warmUp.name, '热身区');
    assert.strictEqual(hrZones.zones.fatBurn.name, '燃脂区');
    assert.strictEqual(hrZones.zones.aerobic.name, '有氧区');
    assert.strictEqual(hrZones.zones.anaerobic.name, '无氧区');
    assert.strictEqual(hrZones.zones.maxEffort.name, '极限区');
  });

  it('每个区间应该有描述', () => {
    const hrZones = calculateHeartRateZones(25);
    Object.values(hrZones.zones).forEach(zone => {
      assert.ok(zone.description.length > 0);
    });
  });

  it('年龄越大，最大心率应该越低', () => {
    const hrZonesYoung = calculateHeartRateZones(20);
    const hrZonesOld = calculateHeartRateZones(50);
    assert.ok(hrZonesYoung.maxHeartRate > hrZonesOld.maxHeartRate);
  });

  it('静息心率应该影响所有区间值', () => {
    const hrZonesLowRest = calculateHeartRateZones(25, 55);
    const hrZonesHighRest = calculateHeartRateZones(25, 75);
    assert.ok(hrZonesLowRest.zones.warmUp.min < hrZonesHighRest.zones.warmUp.min);
  });
});

describe('运动习惯系数调整', () => {
  it('久坐习惯应该有最低的系数', () => {
    const sedentary = adjustByHabit('sedentary');
    const light = adjustByHabit('light');
    const moderate = adjustByHabit('moderate');
    const active = adjustByHabit('active');
    const athlete = adjustByHabit('athlete');
    
    assert.ok(sedentary.duration < light.duration);
    assert.ok(light.duration < moderate.duration);
    assert.ok(moderate.duration < active.duration);
    assert.ok(active.duration < athlete.duration);
  });

  it('中等运动习惯系数应该为1.0', () => {
    const moderate = adjustByHabit('moderate');
    assert.strictEqual(moderate.duration, 1.0);
    assert.strictEqual(moderate.frequency, 1.0);
    assert.strictEqual(moderate.intensity, 1.0);
  });

  it('未知习惯应该默认使用中等系数', () => {
    const unknown = adjustByHabit('unknown_habit');
    const moderate = adjustByHabit('moderate');
    assert.deepStrictEqual(unknown, moderate);
  });

  it('运动员级应该有最高的系数', () => {
    const athlete = adjustByHabit('athlete');
    assert.ok(athlete.duration > 1.2);
    assert.ok(athlete.frequency > 1.3);
    assert.ok(athlete.intensity > 1.2);
  });

  it('应该返回duration、frequency、intensity三个属性', () => {
    const result = adjustByHabit('moderate');
    assert.ok('duration' in result);
    assert.ok('frequency' in result);
    assert.ok('intensity' in result);
  });
});

describe('运动类型获取', () => {
  it('减脂目标应该返回有氧运动列表', () => {
    const exercises = getExerciseTypes('fat_loss');
    assert.ok(Array.isArray(exercises));
    assert.ok(exercises.length > 0);
    const hasCardio = exercises.some(e => e.type === 'cardio');
    assert.ok(hasCardio);
  });

  it('增肌目标应该返回力量训练列表', () => {
    const exercises = getExerciseTypes('muscle_gain');
    const hasStrength = exercises.some(e => e.type === 'strength');
    assert.ok(hasStrength);
  });

  it('心肺目标应该返回有氧耐力训练', () => {
    const exercises = getExerciseTypes('cardio');
    const allCardio = exercises.every(e => e.type === 'cardio');
    assert.ok(allCardio);
  });

  it('未知目标应该默认使用减脂运动', () => {
    const unknown = getExerciseTypes('unknown_goal');
    const fatLoss = getExerciseTypes('fat_loss');
    assert.deepStrictEqual(unknown, fatLoss);
  });

  it('每个运动应该包含必要属性', () => {
    const exercises = getExerciseTypes('fat_loss');
    exercises.forEach(exercise => {
      assert.ok('name' in exercise);
      assert.ok('type' in exercise);
      assert.ok('intensity' in exercise);
      assert.ok('mets' in exercise);
    });
  });

  it('每个运动的METs值应该为正数', () => {
    const exercises = getExerciseTypes('fat_loss');
    exercises.forEach(exercise => {
      assert.ok(exercise.mets > 0);
    });
  });
});

describe('计划冲突检测', () => {
  it('正常计划应该没有冲突', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const result = detectPlanConflicts(plan.weeklyPlan);
    assert.strictEqual(result.hasConflicts, false);
  });

  it('单次运动超过120分钟应该检测到冲突', () => {
    const testPlan = [
      { day: '周一', exercise: '慢跑', type: 'cardio', duration: 150, intensity: '中等' }
    ];
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts.some(c => c.type === 'duration'));
  });

  it('HIIT超过45分钟应该检测到冲突', () => {
    const testPlan = [
      { day: '周一', exercise: 'HIIT', type: 'hiit', duration: 60, intensity: '高强度' }
    ];
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts.some(c => c.type === 'hiit_duration'));
  });

  it('HIIT超过3天应该检测到冲突', () => {
    const testPlan = [
      { day: '周一', exercise: 'HIIT', type: 'hiit', duration: 30, intensity: '高强度' },
      { day: '周二', exercise: 'HIIT', type: 'hiit', duration: 30, intensity: '高强度' },
      { day: '周三', exercise: 'HIIT', type: 'hiit', duration: 30, intensity: '高强度' },
      { day: '周四', exercise: 'HIIT', type: 'hiit', duration: 30, intensity: '高强度' }
    ];
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts.some(c => c.type === 'hiit_frequency'));
  });

  it('连续高强度训练应该检测到冲突', () => {
    const testPlan = [
      { day: '周一', exercise: '深蹲', type: 'strength', duration: 45, intensity: '高强度' },
      { day: '周二', exercise: '硬拉', type: 'strength', duration: 45, intensity: '高强度' }
    ];
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts.some(c => c.type === 'consecutive_high_intensity'));
  });

  it('没有休息日应该检测到冲突', () => {
    const testPlan = Array(7).fill(null).map((_, i) => ({
      day: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][i],
      exercise: '慢跑',
      type: 'cardio',
      duration: 30,
      intensity: '中等'
    }));
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts.some(c => c.type === 'no_rest_days'));
  });

  it('休息日超过3天应该检测到冲突', () => {
    const testPlan = [
      { day: '周一', exercise: '慢跑', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周二', exercise: '慢跑', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周三', exercise: '慢跑', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周四', exercise: '休息日', type: 'rest', duration: 0, intensity: '无' },
      { day: '周五', exercise: '休息日', type: 'rest', duration: 0, intensity: '无' },
      { day: '周六', exercise: '休息日', type: 'rest', duration: 0, intensity: '无' },
      { day: '周日', exercise: '休息日', type: 'rest', duration: 0, intensity: '无' }
    ];
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts.some(c => c.type === 'too_many_rest_days'));
  });

  it('hasConflicts应该正确反映是否有冲突', () => {
    const goodPlan = [
      { day: '周一', exercise: '慢跑', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周二', exercise: '快走', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周三', exercise: '游泳', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周四', exercise: '动感单车', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周五', exercise: '跳绳', type: 'cardio', duration: 30, intensity: '中等' },
      { day: '周六', exercise: '休息日', type: 'rest', duration: 0, intensity: '无' },
      { day: '周日', exercise: '休息日', type: 'rest', duration: 0, intensity: '无' }
    ];
    const badPlan = [
      { day: '周一', exercise: '慢跑', type: 'cardio', duration: 200, intensity: '中等' }
    ];
    
    assert.strictEqual(detectPlanConflicts(goodPlan).hasConflicts, false);
    assert.strictEqual(detectPlanConflicts(badPlan).hasConflicts, true);
  });

  it('冲突消息应该包含日期和具体建议', () => {
    const testPlan = [
      { day: '周一', exercise: '慢跑', type: 'cardio', duration: 150, intensity: '中等' }
    ];
    const result = detectPlanConflicts(testPlan);
    assert.ok(result.conflicts[0].message.includes('周一'));
    assert.ok(result.conflicts[0].message.includes('150分钟'));
  });
});

describe('周计划生成', () => {
  it('应该生成包含7天的计划', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.strictEqual(plan.weeklyPlan.length, 7);
  });

  it('应该包含BMR计算结果', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok(plan.bmr > 0);
  });

  it('应该包含心率区间信息', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok('heartRateZones' in plan);
    assert.ok('maxHeartRate' in plan.heartRateZones);
    assert.ok('zones' in plan.heartRateZones);
  });

  it('应该包含冲突检测结果', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok('conflictDetection' in plan);
    assert.ok('hasConflicts' in plan.conflictDetection);
    assert.ok('conflicts' in plan.conflictDetection);
  });

  it('应该包含汇总信息', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok('summary' in plan);
    assert.ok('totalDuration' in plan.summary);
    assert.ok('totalCalories' in plan.summary);
    assert.ok('exerciseDays' in plan.summary);
    assert.ok('avgIntensity' in plan.summary);
  });

  it('增肌目标应该有4天基础运动频率', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'muscle_gain' });
    assert.ok(plan.summary.exerciseDays >= 4);
  });

  it('减脂目标应该有5天基础运动频率', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok(plan.summary.exerciseDays >= 5);
  });

  it('运动天数应该在3-7天之间', () => {
    const plan1 = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'sedentary', healthGoal: 'fat_loss' });
    const plan2 = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'athlete', healthGoal: 'fat_loss' });
    assert.ok(plan1.summary.exerciseDays >= 3 && plan1.summary.exerciseDays <= 7);
    assert.ok(plan2.summary.exerciseDays >= 3 && plan2.summary.exerciseDays <= 7);
  });

  it('久坐习惯的运动时长应该短于运动员习惯', () => {
    const planSedentary = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'sedentary', healthGoal: 'fat_loss' });
    const planAthlete = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'athlete', healthGoal: 'fat_loss' });
    assert.ok(planSedentary.summary.totalDuration < planAthlete.summary.totalDuration);
  });

  it('休息日应该在计划末尾', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const restDays = plan.weeklyPlan.filter(d => d.type === 'rest');
    const restDaysAtEnd = plan.weeklyPlan.slice(-restDays.length).every(d => d.type === 'rest');
    assert.ok(restDaysAtEnd);
  });

  it('HIIT训练时长应该比普通有氧运动短', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const hiitDays = plan.weeklyPlan.filter(d => d.type === 'hiit');
    const cardioDays = plan.weeklyPlan.filter(d => d.type === 'cardio');
    if (hiitDays.length > 0 && cardioDays.length > 0) {
      const avgHiitDuration = hiitDays.reduce((sum, d) => sum + d.duration, 0) / hiitDays.length;
      const avgCardioDuration = cardioDays.reduce((sum, d) => sum + d.duration, 0) / cardioDays.length;
      assert.ok(avgHiitDuration < avgCardioDuration);
    }
  });

  it('增肌目标的力量训练时长应该更长', () => {
    const planFatLoss = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const planMuscleGain = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'muscle_gain' });
    const strengthDaysFatLoss = planFatLoss.weeklyPlan.filter(d => d.type === 'strength');
    const strengthDaysMuscleGain = planMuscleGain.weeklyPlan.filter(d => d.type === 'strength');
    if (strengthDaysFatLoss.length > 0 && strengthDaysMuscleGain.length > 0) {
      const avgDurationFatLoss = strengthDaysFatLoss.reduce((sum, d) => sum + d.duration, 0) / strengthDaysFatLoss.length;
      const avgDurationMuscleGain = strengthDaysMuscleGain.reduce((sum, d) => sum + d.duration, 0) / strengthDaysMuscleGain.length;
      assert.ok(avgDurationMuscleGain > avgDurationFatLoss);
    }
  });

  it('每天的卡路里计算应该正确', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    plan.weeklyPlan.forEach(day => {
      if (day.type !== 'rest') {
        const expectedCalories = Math.round((day.mets * 3.5 * 70 / 200) * day.duration);
        assert.strictEqual(day.calories, expectedCalories);
      }
    });
  });

  it('总时长应该等于各天时长之和', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const sumDuration = plan.weeklyPlan.reduce((sum, day) => sum + day.duration, 0);
    assert.strictEqual(plan.summary.totalDuration, sumDuration);
  });

  it('总卡路里应该等于各天卡路里之和', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const sumCalories = plan.weeklyPlan.reduce((sum, day) => sum + day.calories, 0);
    assert.strictEqual(plan.summary.totalCalories, sumCalories);
  });

  it('休息日的时长和卡路里应该为0', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const restDays = plan.weeklyPlan.filter(d => d.type === 'rest');
    restDays.forEach(day => {
      assert.strictEqual(day.duration, 0);
      assert.strictEqual(day.calories, 0);
    });
  });

  it('每个训练日应该包含完整的运动信息', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const exerciseDays = plan.weeklyPlan.filter(d => d.type !== 'rest');
    exerciseDays.forEach(day => {
      assert.ok('day' in day);
      assert.ok('exercise' in day);
      assert.ok('type' in day);
      assert.ok('duration' in day);
      assert.ok('intensity' in day);
      assert.ok('mets' in day);
      assert.ok('calories' in day);
    });
  });
});

describe('用户输入验证与安全警告', () => {
  it('12岁以下儿童应该有高等级安全警告', () => {
    const warnings = validateUserInput(10, 40);
    assert.ok(warnings.some(w => w.type === 'age_too_young'));
    assert.ok(warnings.some(w => w.level === 'high'));
  });

  it('65岁以上老人应该有安全警告', () => {
    const warnings = validateUserInput(70, 60);
    assert.ok(warnings.some(w => w.type === 'age_senior'));
  });

  it('40kg以下应该有体重过轻警告', () => {
    const warnings = validateUserInput(25, 35);
    assert.ok(warnings.some(w => w.type === 'weight_too_low'));
  });

  it('120kg以上应该有体重过重警告', () => {
    const warnings = validateUserInput(25, 130);
    assert.ok(warnings.some(w => w.type === 'weight_too_high'));
  });

  it('正常范围用户应该没有警告', () => {
    const warnings = validateUserInput(30, 70);
    assert.strictEqual(warnings.length, 0);
  });

  it('同时有年龄和体重问题应该有多个警告', () => {
    const warnings = validateUserInput(10, 35);
    assert.ok(warnings.length >= 2);
  });
});

describe('安全调整系数', () => {
  it('12岁以下应该有最大的安全调整', () => {
    const adjust = calculateSafetyAdjustment(10, 40);
    assert.ok(adjust.intensityMultiplier <= 0.6);
    assert.ok(adjust.durationMultiplier <= 0.7);
    assert.ok(adjust.metsMultiplier <= 0.6);
  });

  it('65岁以上应该降低运动强度', () => {
    const adjust = calculateSafetyAdjustment(70, 60);
    assert.ok(adjust.intensityMultiplier < 1.0);
    assert.ok(adjust.durationMultiplier < 1.0);
  });

  it('120kg以上应该降低强度', () => {
    const adjust = calculateSafetyAdjustment(30, 130);
    assert.ok(adjust.intensityMultiplier < 1.0);
  });

  it('正常范围用户调整系数应该为1.0', () => {
    const adjust = calculateSafetyAdjustment(30, 70);
    assert.strictEqual(adjust.intensityMultiplier, 1.0);
    assert.strictEqual(adjust.durationMultiplier, 1.0);
    assert.strictEqual(adjust.metsMultiplier, 1.0);
  });

  it('50岁以上应该有适度调整', () => {
    const adjust = calculateSafetyAdjustment(55, 70);
    assert.ok(adjust.intensityMultiplier < 1.0 && adjust.intensityMultiplier >= 0.8);
  });
});

describe('强度等级调整', () => {
  it('高强度乘以0.5应该变为中等强度', () => {
    const result = adjustIntensityLevel('高强度', 0.5);
    assert.ok(['低', '中等'].includes(result));
  });

  it('高强度乘以0.7应该变为中等', () => {
    const result = adjustIntensityLevel('高强度', 0.7);
    assert.ok(result === '中等' || result === '中高');
  });

  it('正常系数应该保持原强度', () => {
    const result = adjustIntensityLevel('中等', 1.0);
    assert.strictEqual(result, '中等');
  });

  it('强度不应低于最低等级', () => {
    const result = adjustIntensityLevel('低', 0.5);
    assert.strictEqual(result, '低');
  });

  it('未知强度应该默认为中等', () => {
    const result = adjustIntensityLevel('未知', 1.0);
    assert.strictEqual(result, '中等');
  });
});

describe('极端年龄运动强度安全测试', () => {
  it('儿童用户的运动强度不应包含高强度', () => {
    const plan = generateWeeklyPlan({ age: 10, weight: 40, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const exerciseDays = plan.weeklyPlan.filter(d => d.type !== 'rest');
    const hasHighIntensity = exerciseDays.some(d => d.intensity === '高强度');
    assert.strictEqual(hasHighIntensity, false);
  });

  it('老人用户的运动强度不应包含高强度', () => {
    const plan = generateWeeklyPlan({ age: 75, weight: 60, exerciseHabit: 'moderate', healthGoal: 'cardio' });
    const exerciseDays = plan.weeklyPlan.filter(d => d.type !== 'rest');
    const hasHighIntensity = exerciseDays.some(d => d.intensity === '高强度');
    assert.strictEqual(hasHighIntensity, false);
  });

  it('儿童用户的运动时长应该比成人短', () => {
    const planChild = generateWeeklyPlan({ age: 10, weight: 40, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    const planAdult = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok(planChild.summary.totalDuration < planAdult.summary.totalDuration);
  });

  it('应该包含安全警告信息', () => {
    const plan = generateWeeklyPlan({ age: 10, weight: 40, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok('safetyWarnings' in plan);
    assert.ok(plan.safetyWarnings.length > 0);
  });

  it('应该包含安全调整系数信息', () => {
    const plan = generateWeeklyPlan({ age: 10, weight: 40, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok('safetyAdjustment' in plan);
  });
});

describe('日期规范化与跨时区处理', () => {
  it('应该正确处理ISO格式日期', () => {
    const date = normalizeDateToUTC('2024-05-12T12:30:45.123Z');
    assert.strictEqual(date, '2024-05-12');
  });

  it('应该正确处理YYYY-MM-DD格式', () => {
    const date = normalizeDateToUTC('2024-05-12');
    assert.strictEqual(date, '2024-05-12');
  });

  it('应该正确处理美国日期格式', () => {
    const date = normalizeDateToUTC('05/12/2024');
    assert.strictEqual(date, '2024-05-12');
  });

  it('空输入应该返回当前日期', () => {
    const date = normalizeDateToUTC();
    assert.ok(date.match(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('无效日期应该抛出错误', () => {
    assert.throws(() => normalizeDateToUTC('invalid-date'), /无效的日期格式/);
  });

  it('getCurrentDateInTimezone应该返回YYYY-MM-DD格式', () => {
    const date = getCurrentDateInTimezone();
    assert.ok(date.match(/^\d{4}-\d{2}-\d{2}$/));
  });

  it('不同时区日期应该被正确规范化', () => {
    const date1 = getCurrentDateInTimezone('America/New_York');
    const date2 = getCurrentDateInTimezone('Asia/Tokyo');
    assert.ok(date1.match(/^\d{4}-\d{2}-\d{2}$/));
    assert.ok(date2.match(/^\d{4}-\d{2}-\d{2}$/));
  });
});

describe('计划冲突检测增强验证', () => {
  it('极端体重用户的计划应该通过安全调整避免冲突', () => {
    const plan = generateWeeklyPlan({ age: 30, weight: 140, exerciseHabit: 'athlete', healthGoal: 'fat_loss' });
    assert.strictEqual(plan.conflictDetection.hasConflicts, false);
  });

  it('老年用户的计划应该避免高强度冲突', () => {
    const plan = generateWeeklyPlan({ age: 70, weight: 60, exerciseHabit: 'active', healthGoal: 'cardio' });
    const exerciseDays = plan.weeklyPlan.filter(d => d.type !== 'rest');
    const allSafe = exerciseDays.every(d => d.intensity !== '高强度');
    assert.ok(allSafe);
  });
});

describe('边界条件测试', () => {
  it('极端年轻年龄应该正常计算', () => {
    const plan = generateWeeklyPlan({ age: 10, weight: 40, exerciseHabit: 'light', healthGoal: 'fat_loss' });
    assert.ok(plan.bmr > 0);
    assert.ok(plan.weeklyPlan.length === 7);
  });

  it('极端年长年龄应该正常计算', () => {
    const plan = generateWeeklyPlan({ age: 80, weight: 60, exerciseHabit: 'light', healthGoal: 'cardio' });
    assert.ok(plan.bmr > 0);
    assert.ok(plan.weeklyPlan.length === 7);
  });

  it('极低体重应该正常计算', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 30, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok(plan.bmr > 0);
  });

  it('极高体重应该正常计算', () => {
    const plan = generateWeeklyPlan({ age: 25, weight: 200, exerciseHabit: 'moderate', healthGoal: 'fat_loss' });
    assert.ok(plan.bmr > 0);
  });

  it('所有运动目标都应该生成有效计划', () => {
    const goals = ['fat_loss', 'muscle_gain', 'cardio'];
    goals.forEach(goal => {
      const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: 'moderate', healthGoal: goal });
      assert.ok(plan.weeklyPlan.length === 7);
      assert.ok(plan.summary.exerciseDays >= 3);
    });
  });

  it('所有运动习惯都应该生成有效计划', () => {
    const habits = ['sedentary', 'light', 'moderate', 'active', 'athlete'];
    habits.forEach(habit => {
      const plan = generateWeeklyPlan({ age: 25, weight: 70, exerciseHabit: habit, healthGoal: 'fat_loss' });
      assert.ok(plan.weeklyPlan.length === 7);
    });
  });
});
