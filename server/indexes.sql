-- 性能索引优化（执行：node setup-index.js）
USE MyBlog;

-- 文章表索引
ALTER TABLE articles ADD INDEX idx_status_created (status, created_at);
ALTER TABLE articles ADD INDEX idx_author_id (author_id);

-- 文章标签表索引
ALTER TABLE article_tags ADD INDEX idx_article_id (article_id);
ALTER TABLE article_tags ADD INDEX idx_tag (tag);

-- 项目表索引
ALTER TABLE projects ADD INDEX idx_author_id (author_id);
ALTER TABLE projects ADD INDEX idx_created_at (created_at);

-- 评论表索引
ALTER TABLE comments ADD INDEX idx_article_id (article_id);
ALTER TABLE comments ADD INDEX idx_author_id (author_id);
ALTER TABLE comments ADD INDEX idx_parent_id (parent_id);

-- 用户表索引
ALTER TABLE users ADD INDEX idx_email (email);

SELECT '索引创建完成' AS message;
