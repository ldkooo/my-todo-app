-- 为现有 todos 表添加 category 字段
alter table todos add column if not exists category varchar(20) default '生活';

-- 为已有数据设置一个默认分类（可选：你也可以根据标题内容手动更新）
update todos set category = '生活' where category is null;
