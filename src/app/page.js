"use client";

import { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const [todos, setTodos] = useState([]);
  const [newTodo, setNewTodo] = useState("");
  const [loading, setLoading] = useState(true);

  // 页面加载时获取所有待办事项
  useEffect(() => {
    fetchTodos();
  }, []);

  async function fetchTodos() {
    setLoading(true);
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("获取数据失败:", error);
    } else {
      setTodos(data || []);
    }
    setLoading(false);
  }

  // 添加新待办
  async function addTodo(e) {
    e.preventDefault();
    if (!newTodo.trim()) return;

    const { data, error } = await supabase
      .from("todos")
      .insert([{ title: newTodo.trim(), completed: false }])
      .select();

    if (error) {
      console.error("添加失败:", error);
    } else {
      setTodos([data[0], ...todos]);
      setNewTodo("");
    }
  }

  // 切换完成状态
  async function toggleTodo(id, completed) {
    const { error } = await supabase
      .from("todos")
      .update({ completed: !completed })
      .eq("id", id);

    if (error) {
      console.error("更新失败:", error);
    } else {
      setTodos(
        todos.map((todo) =>
          todo.id === id ? { ...todo, completed: !completed } : todo
        )
      );
    }
  }

  // 删除待办
  async function deleteTodo(id) {
    const { error } = await supabase.from("todos").delete().eq("id", id);

    if (error) {
      console.error("删除失败:", error);
    } else {
      setTodos(todos.filter((todo) => todo.id !== id));
    }
  }

  return (
    <main className="container">
      <h1>📝 我的待办事项</h1>

      {/* 添加新任务 */}
      <form onSubmit={addTodo} className="add-form">
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="输入新任务..."
          className="todo-input"
        />
        <button type="submit" className="add-btn">
          ➕ 添加
        </button>
      </form>

      {/* 待办列表 */}
      {loading ? (
        <p className="loading">加载中...</p>
      ) : todos.length === 0 ? (
        <p className="empty">还没有待办事项，添加一个吧！</p>
      ) : (
        <ul className="todo-list">
          {todos.map((todo) => (
            <li key={todo.id} className={`todo-item ${todo.completed ? "completed" : ""}`}>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => toggleTodo(todo.id, todo.completed)}
                className="checkbox"
              />
              <span className="todo-title">{todo.title}</span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="delete-btn"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* 统计 */}
      <div className="stats">
        共 {todos.length} 项，已完成 {todos.filter((t) => t.completed).length} 项
      </div>
    </main>
  );
}
