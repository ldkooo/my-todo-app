'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { classifyTask, CATEGORY_COLORS, CATEGORY_LABELS, type TaskCategory } from '@/lib/ai'

interface Todo {
  id: number
  title: string
  completed: boolean
  category: TaskCategory | null
  created_at: string
}

// 安全获取分类颜色
function getCategoryColor(category: TaskCategory | null | undefined): string {
  if (!category || !CATEGORY_COLORS[category]) {
    return '#6b7280' // 灰色默认值
  }
  return CATEGORY_COLORS[category]
}

// 安全获取分类名称
function getCategoryName(category: TaskCategory | null | undefined): string {
  if (!category || !CATEGORY_LABELS.includes(category)) {
    return '生活' // 默认分类
  }
  return category
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskCategory | '全部'>('全部')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    fetchTodos()
  }, [])

  async function fetchTodos() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setTodos(data || [])
    } catch (error) {
      console.error('获取数据失败:', error)
      alert('获取数据失败，请检查控制台')
    } finally {
      setLoading(false)
    }
  }

  async function addTodo(e: React.FormEvent) {
    e.preventDefault()
    if (!newTodo.trim()) return

    setAiLoading(true)
    try {
      // 1. AI 智能分类
      const { category } = await classifyTask(newTodo)
      
      // 2. 保存到数据库
      const { data, error } = await supabase
        .from('todos')
        .insert([{ 
          title: newTodo, 
          completed: false,
          category: category
        }])
        .select()
        .single()

      if (error) throw error
      setTodos([data, ...todos])
      setNewTodo('')
    } catch (error) {
      console.error('添加失败:', error)
      alert('添加失败')
    } finally {
      setAiLoading(false)
    }
  }

  async function toggleTodo(todo: Todo) {
    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', todo.id)

      if (error) throw error
      setTodos(todos.map(t =>
        t.id === todo.id ? { ...t, completed: !t.completed } : t
      ))
    } catch (error) {
      console.error('更新失败:', error)
    }
  }

  async function deleteTodo(id: number) {
    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)

      if (error) throw error
      setTodos(todos.filter(t => t.id !== id))
    } catch (error) {
      console.error('删除失败:', error)
    }
  }

  // 按分类筛选
  const filteredTodos = filter === '全部' 
    ? todos 
    : todos.filter(t => t.category === filter)

  // 统计各分类数量
  const categoryCount = CATEGORY_LABELS.reduce((acc, cat) => {
    acc[cat] = todos.filter(t => t.category === cat).length
    return acc
  }, {} as Record<string, number>)

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>加载中...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ marginBottom: '10px' }}>📝 我的 Todo List</h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        AI 智能分类 | 自动识别任务类型
      </p>

      {/* 添加任务表单 */}
      <form onSubmit={addTodo} style={{ marginBottom: '25px', display: 'flex', gap: '10px' }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="输入新任务，AI 会自动分类..."
          style={{ 
            padding: '12px', 
            flex: 1, 
            fontSize: '16px', 
            border: '2px solid #e5e7eb',
            borderRadius: '8px',
            outline: 'none'
          }}
        />
        <button 
          type="submit" 
          disabled={aiLoading}
          style={{ 
            padding: '12px 24px', 
            fontSize: '16px',
            background: aiLoading ? '#ccc' : '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: aiLoading ? 'not-allowed' : 'pointer',
            fontWeight: 'bold'
          }}
        >
          {aiLoading ? '🤔 分析中...' : '➕ 添加'}
        </button>
      </form>

      {/* 分类筛选器 */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setFilter('全部')}
          style={{
            padding: '6px 14px',
            borderRadius: '20px',
            border: 'none',
            background: filter === '全部' ? '#374151' : '#f3f4f6',
            color: filter === '全部' ? 'white' : '#374151',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          全部 ({todos.length})
        </button>
        {CATEGORY_LABELS.map(cat => (
          <button
            key={cat}
            onClick={() => setFilter(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '20px',
              border: 'none',
              background: filter === cat ? CATEGORY_COLORS[cat] : '#f3f4f6',
              color: filter === cat ? 'white' : CATEGORY_COLORS[cat],
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            {cat} ({todos.filter(t => t.category === cat).length})
          </button>
        ))}
      </div>

      {/* 任务列表 */}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {filteredTodos.map(todo => (
          <li key={todo.id} style={{
            padding: '16px', 
            marginBottom: '12px', 
            background: '#f9fafb',
            borderRadius: '12px', 
            display: 'flex', 
            alignItems: 'center', 
            gap: '12px',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s'
          }}>
            <input 
              type="checkbox" 
              checked={todo.completed} 
              onChange={() => toggleTodo(todo)} 
              style={{ width: '20px', height: '20px', cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ 
                textDecoration: todo.completed ? 'line-through' : 'none',
                color: todo.completed ? '#9ca3af' : '#111827',
                fontSize: '16px',
                marginBottom: '4px'
              }}>
                {todo.title}
              </div>
              <span style={{
                display: 'inline-block',
                padding: '2px 10px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
                background: getCategoryColor(todo.category) + '20',
                color: getCategoryColor(todo.category)
              }}>
                {getCategoryName(todo.category)}
              </span>
            </div>
            <button 
              onClick={() => deleteTodo(todo.id)} 
              style={{ 
                color: '#ef4444', 
                border: 'none', 
                background: 'none', 
                cursor: 'pointer',
                fontSize: '18px',
                padding: '4px'
              }}
            >
              ❌
            </button>
          </li>
        ))}
      </ul>

      {filteredTodos.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
          {filter === '全部' ? '📝 还没有 Todo，添加一个吧！' : `🔍 该分类下暂无任务`}
        </div>
      )}

      {/* 底部统计 */}
      <div style={{ marginTop: '20px', padding: '16px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px', color: '#6b7280' }}>
        总计: {todos.length} 个任务 | 已完成: {todos.filter(t => t.completed).length} | 待完成: {todos.filter(t => !t.completed).length}
      </div>
    </div>
  )
}
