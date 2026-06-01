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
    return '#6b7280'
  }
  return CATEGORY_COLORS[category]
}

function getCategoryName(category: TaskCategory | null | undefined): string {
  if (!category || !CATEGORY_LABELS.includes(category)) {
    return '生活'
  }
  return category
}

export default function TodoList() {
  const [todos, setTodos] = useState<Todo[]>([])
  const [newTodo, setNewTodo] = useState('')
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<TaskCategory | '全部'>('全部')
  const [aiLoading, setAiLoading] = useState(false)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [manualCategory, setManualCategory] = useState<TaskCategory | 'auto'>('auto')

  // 日历状态
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

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
      // 1. 判断分类：手动选择或 AI 自动分类
      let category: TaskCategory
      
      if (manualCategory === 'auto') {
        // AI 自动分类
        const result = await classifyTask(newTodo)
        category = result.category
      } else {
        // 使用手动选择的分类
        category = manualCategory
      }
      
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
      setManualCategory('auto') // 重置为自动分类
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

  // 日历逻辑
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay()
  const today = new Date().toISOString().split('T')[0]

  // 按日期分组任务
  const todosByDate = todos.reduce((acc, todo) => {
    const date = todo.created_at.split('T')[0]
    if (!acc[date]) acc[date] = []
    acc[date].push(todo)
    return acc
  }, {} as Record<string, Todo[]>)

  // 获取某日期任务的主要分类颜色（用于日历标记）
  function getDateDotColor(dateStr: string): string | null {
    const dayTodos = todosByDate[dateStr]
    if (!dayTodos || dayTodos.length === 0) return null
    // 返回第一个未完成任务的颜色，或第一个任务的颜色
    const todo = dayTodos.find(t => !t.completed) || dayTodos[0]
    return getCategoryColor(todo.category)
  }

  // 选中日期显示任务
  const selectedDateTodos = selectedDate ? todosByDate[selectedDate] || [] : []

  const monthNames = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  function prevMonth() {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  function nextMonth() {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>加载中...</div>

  return (
    <div style={{ maxWidth: '700px', margin: '0 auto', padding: '20px', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <h1 style={{ marginBottom: '10px' }}>📝 我的 Todo List</h1>
      <p style={{ color: '#666', marginBottom: '20px', fontSize: '14px' }}>
        AI 智能分类 | 自动识别任务类型
      </p>

      {/* 视图切换 + 添加任务 */}
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <form onSubmit={addTodo} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', flex: 1, minWidth: '250px' }}>
          <input
            type="text"
            value={newTodo}
            onChange={(e) => setNewTodo(e.target.value)}
            placeholder="输入新任务..."
            style={{ 
              padding: '12px', 
              flex: 1, 
              fontSize: '16px', 
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              outline: 'none',
              minWidth: '150px'
            }}
          />
          
          <select
            value={manualCategory}
            onChange={(e) => setManualCategory(e.target.value as TaskCategory | 'auto')}
            style={{
              padding: '12px',
              fontSize: '14px',
              border: '2px solid #e5e7eb',
              borderRadius: '8px',
              background: 'white',
              cursor: 'pointer',
              minWidth: '120px'
            }}
          >
            <option value="auto">🤖 自动分类</option>
            {CATEGORY_LABELS.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          
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
              fontWeight: 'bold',
              whiteSpace: 'nowrap'
            }}
          >
            {aiLoading ? '🤔' : '➕'}
          </button>
        </form>
        
        <p style={{ color: '#9ca3af', fontSize: '12px', margin: '8px 0 0 0', width: '100%' }}>
          {manualCategory === 'auto' ? '💡 选择"自动分类"让 AI 智能识别，或手动选择分类' : `💡 将使用手动分类：${manualCategory}`}
        </p>
        
        <div style={{ display: 'flex', gap: '4px', background: '#f3f4f6', padding: '4px', borderRadius: '8px' }}>
          <button
            onClick={() => setView('list')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: view === 'list' ? 'white' : 'transparent',
              color: view === 'list' ? '#111827' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: view === 'list' ? 'bold' : 'normal',
              boxShadow: view === 'list' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📋 列表
          </button>
          <button
            onClick={() => setView('calendar')}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: 'none',
              background: view === 'calendar' ? 'white' : 'transparent',
              color: view === 'calendar' ? '#111827' : '#6b7280',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: view === 'calendar' ? 'bold' : 'normal',
              boxShadow: view === 'calendar' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
            }}
          >
            📅 日历
          </button>
        </div>
      </div>

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

      {/* 日历视图 */}
      {view === 'calendar' && (
        <div>
          {/* 日历头部 */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <button onClick={prevMonth} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>◀</button>
            <h2 style={{ margin: 0, fontSize: '20px' }}>{currentYear}年 {monthNames[currentMonth]}</h2>
            <button onClick={nextMonth} style={{ padding: '8px 16px', border: '1px solid #e5e7eb', borderRadius: '8px', background: 'white', cursor: 'pointer', fontSize: '16px' }}>▶</button>
          </div>

          {/* 星期标题 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px', marginBottom: '8px' }}>
            {weekDays.map(day => (
              <div key={day} style={{ textAlign: 'center', padding: '8px', fontSize: '14px', color: '#6b7280', fontWeight: 'bold' }}>
                {day}
              </div>
            ))}
          </div>

          {/* 日历格子 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
            {/* 空白填充 */}
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div key={`empty-${i}`} style={{ padding: '8px', minHeight: '60px' }} />
            ))}
            
            {/* 日期 */}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1
              const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
              const isToday = dateStr === today
              const isSelected = dateStr === selectedDate
              const dotColor = getDateDotColor(dateStr)
              const dayTodoCount = todosByDate[dateStr]?.length || 0

              return (
                <div
                  key={day}
                  onClick={() => setSelectedDate(dateStr)}
                  style={{
                    padding: '8px',
                    minHeight: '60px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #3b82f6' : '1px solid #e5e7eb',
                    background: isToday ? '#eff6ff' : isSelected ? '#f0f9ff' : 'white',
                    cursor: 'pointer',
                    textAlign: 'center',
                    position: 'relative',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ 
                    fontSize: '14px', 
                    fontWeight: isToday ? 'bold' : 'normal',
                    color: isToday ? '#3b82f6' : '#111827'
                  }}>
                    {day}
                  </div>
                  {dotColor && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '2px', marginTop: '4px' }}>
                      <div style={{ 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        background: dotColor 
                      }} />
                      {dayTodoCount > 1 && (
                        <span style={{ fontSize: '10px', color: '#6b7280' }}>+{dayTodoCount - 1}</span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* 选中日期任务列表 */}
          {selectedDate && (
            <div style={{ marginTop: '20px', padding: '16px', background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px' }}>
                  📅 {selectedDate} 的任务
                  <span style={{ color: '#6b7280', fontSize: '14px', marginLeft: '8px' }}>
                    ({selectedDateTodos.length} 个)
                  </span>
                </h3>
                <button 
                  onClick={() => setSelectedDate(null)}
                  style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px', color: '#6b7280' }}
                >
                  ✕
                </button>
              </div>
              
              {selectedDateTodos.length === 0 ? (
                <p style={{ color: '#9ca3af', textAlign: 'center', padding: '20px' }}>📭 该日期暂无任务</p>
              ) : (
                <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                  {selectedDateTodos.map(todo => (
                    <li key={todo.id} style={{
                      padding: '10px 12px',
                      marginBottom: '8px',
                      background: 'white',
                      borderRadius: '8px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      border: '1px solid #e5e7eb'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={todo.completed} 
                        onChange={() => toggleTodo(todo)} 
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <span style={{ 
                        flex: 1,
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        color: todo.completed ? '#9ca3af' : '#111827',
                        fontSize: '14px'
                      }}>
                        {todo.title}
                      </span>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        background: getCategoryColor(todo.category) + '20',
                        color: getCategoryColor(todo.category)
                      }}>
                        {getCategoryName(todo.category)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {/* 列表视图 */}
      {view === 'list' && (
        <>
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
        </>
      )}

      {/* 底部统计 */}
      <div style={{ marginTop: '20px', padding: '16px', background: '#f3f4f6', borderRadius: '8px', fontSize: '13px', color: '#6b7280' }}>
        总计: {todos.length} 个任务 | 已完成: {todos.filter(t => t.completed).length} | 待完成: {todos.filter(t => !t.completed).length}
      </div>
    </div>
  )
}
