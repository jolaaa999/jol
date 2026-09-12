-- jol blog — MySQL schema
-- 用法：mysql -u root -p < sql/schema.sql
-- 或先 CREATE DATABASE jol CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci; 再导入

CREATE DATABASE IF NOT EXISTS jol
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE jol;

CREATE TABLE IF NOT EXISTS articles (
  id          VARCHAR(64)  NOT NULL PRIMARY KEY,
  title       VARCHAR(255) NOT NULL,
  category    VARCHAR(32)  NOT NULL COMMENT '有感 | 诗文',
  content     MEDIUMTEXT   NOT NULL,
  tags        JSON         NULL,
  created_at  DATETIME(3)  NOT NULL,
  updated_at  DATETIME(3)  NOT NULL,
  INDEX idx_articles_category_created (category, created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 种子数据（可重复执行：已存在则跳过）
INSERT IGNORE INTO articles (id, title, category, content, tags, created_at, updated_at) VALUES
(
  'p-001', '静夜', '诗文',
  '月色落在窗棂上，\n像一段未完成的代码，\n等待被编译成梦。',
  NULL,
  '2026-05-12 20:00:00.000', '2026-05-12 20:00:00.000'
),
(
  'p-002', '风过草原', '诗文',
  '蒲公英解体的那一秒，\n整片草原都在悄悄重写自己的坐标系。',
  NULL,
  '2026-04-28 09:30:00.000', '2026-04-28 09:30:00.000'
),
(
  'p-003', '拓扑', '诗文',
  '节点与边构成世界，\n我们在毛玻璃后面，\n阅读自己的连接度。',
  NULL,
  '2026-03-15 14:15:00.000', '2026-03-15 14:15:00.000'
),
(
  'r-001', '关于克制', '有感',
  '## 噪声与信号\n\n好的界面像好的诗——每个元素都有存在的理由，其余皆是噪声。\n\n## 留白的价值\n\n暗色背景不是空虚，是留给内容的负空间。',
  JSON_ARRAY('design', 'philosophy'),
  '2026-06-01 10:00:00.000', '2026-06-01 10:00:00.000'
),
(
  'r-002', '物理与感知', '有感',
  '## 力的推导\n\nVerlet 积分教会我：平滑的动画不是插值出来的，而是被力推导出来的。\n\n```typescript\nvelocity += force * dt\nposition += velocity * dt\n```\n\n## 感知连续性\n\n人眼对加速度变化更敏感。',
  JSON_ARRAY('animation', 'physics', 'typescript'),
  '2026-05-20 16:45:00.000', '2026-05-20 16:45:00.000'
),
(
  'r-003', '终末地的灰', '有感',
  '## 工业灰\n\n暗色背景不是空虚，是留给内容的负空间。光只在需要的地方亮起。\n\n## 毛玻璃层次\n\nbackdrop-filter 与细边框叠加，构成可读的玻璃层次。',
  JSON_ARRAY('design', 'ui'),
  '2026-05-08 11:20:00.000', '2026-05-08 11:20:00.000'
),
(
  'r-004', '基建完成', '有感',
  '## 脚手架就绪\n\nVue3 + Go Serverless 同源部署脚手架已就绪。\n\n## 下一步\n\n独立文章页、RSS、搜索与评论系统。',
  JSON_ARRAY('engineering', 'vue'),
  '2026-06-17 08:00:00.000', '2026-06-17 08:00:00.000'
);
