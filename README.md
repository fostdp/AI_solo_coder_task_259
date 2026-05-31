# 运动健康处方生成器

一个基于运动科学算法的全栈运动处方生成应用。

## 功能特性

- 📊 **个性化计算**: 基于年龄、体重、运动习惯和健康目标计算
- 🏃 **科学算法**: 使用BMR基础代谢率和METS代谢当量计算
- 📅 **周计划日历**: 可视化展示每周运动安排
- 💾 **数据持久化**: SQLite数据库保存历史计划
- 🎨 **美观界面**: 响应式设计，支持移动端

## 技术栈

### 后端
- Node.js + Express
- SQLite3 数据库
- CORS 跨域支持

### 前端
- React 18
- Axios HTTP客户端
- 响应式CSS设计

## 项目结构

```
.
├── backend/
│   ├── package.json
│   ├── server.js          # Express服务器
│   ├── database.js        # 数据库初始化
│   └── fitnessCalculator.js  # 运动处方计算逻辑
└── frontend/
    ├── package.json
    ├── public/
    │   └── index.html
    └── src/
        ├── index.js
        ├── index.css
        └── App.js
```

## 快速开始

### 1. 安装后端依赖

```bash
cd backend
npm install
```

### 2. 启动后端服务器

```bash
npm start
# 服务器将在 http://localhost:3001 运行
```

### 3. 安装前端依赖（新开一个终端）

```bash
cd frontend
npm install
```

### 4. 启动前端开发服务器

```bash
npm start
# 前端将在 http://localhost:3000 运行
```

## API 接口

### 生成运动处方
- **POST** `/api/generate`
- 请求体: `{ age, weight, exerciseHabit, healthGoal }`

### 保存计划
- **POST** `/api/plans`
- 请求体: `{ age, weight, exerciseHabit, healthGoal, bmr, weeklyPlan }`

### 获取所有计划
- **GET** `/api/plans`

### 获取单个计划
- **GET** `/api/plans/:id`

### 删除计划
- **DELETE** `/api/plans/:id`

## 健康目标选项

- `fat_loss` - 减脂
- `muscle_gain` - 增肌
- `cardio` - 提升心肺功能

## 运动习惯选项

- `sedentary` - 久坐不动
- `light` - 轻度运动 (每周1-2次)
- `moderate` - 中等运动 (每周3-4次)
- `active` - 积极运动 (每周5-6次)
- `athlete` - 运动员级 (每天运动)
