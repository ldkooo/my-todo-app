'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

interface Todo {
  id: number
  title: string
  completed: boolean
  created_at: string
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)

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

    try {
      const { data, error } = await supabase
        .from('todos')
        .insert([{ title: newTodo, completed: false }])
        .select()
        .single()

      if (error) throw error
      setTodos([data, ...todos])
      setNewTodo('')
    } catch (error) {
      console.error('添加失败:', error)
      alert('添加失败')
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

  if (loading) return <div>加载中...</div>

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
      <h1>📝 我的 Todo List</h1>
      
      <form onSubmit={addTodo} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          value={newTodo}
          onChange={(e) => setNewTodo(e.target.value)}
          placeholder="输入新任务..."
          style={{ padding: '10px', width: '70%', fontSize: '16px' }}
        />
        <button type="submit" style={{ padding: '10px 20px', marginLeft: '10px', fontSize: '16px' }}>
          添加
        </button>
      </form>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {todos.map(todo => (
          <li key={todo.id} style={{
            padding: '15px', marginBottom: '10px', background: '#f5f5f5',
            borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px'
          }}>
            <input type="checkbox" checked={todo.completed} onChange={() => toggleTodo(todo)} />
            <span style={{ textDecoration: todo.completed ? 'line-through' : 'none', flex: 1 }}>
              {todo.title}
            </span>
            <button onClick={() => deleteTodo(todo.id)} style={{ color: 'red', border: 'none', background: 'none', cursor: 'pointer' }}>
              ❌
            </button>
          </li>
        ))}
      </ul>

      {todos.length === 0 && <p>还没有 Todo，添加一个吧！</p>}
    </div>
  )
}
