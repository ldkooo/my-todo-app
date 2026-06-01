import { NextResponse } from 'next/server'
import OpenAI from 'openai'
import { CATEGORY_LABELS, type TaskCategory } from '@/lib/ai'

const client = new OpenAI({
  apiKey: process.env.MOONSHOT_API_KEY || process.env.NEXT_PUBLIC_MOONSHOT_API_KEY || '',
  baseURL: "https://api.moonshot.cn/v1",
})

export async function POST(request: Request) {
  try {
    const { text } = await request.json()
    
    if (!text) {
      return NextResponse.json({ error: '缺少文本' }, { status: 400 })
    }

    const response = await client.chat.completions.create({
      model: "kimi-k2.6",
      messages: [
        {
          role: "system",
          content: `你是一个任务分类助手。请分析用户输入的任务文本，将其分类到以下类别之一：
- 工作：会议、报告、项目、客户相关
- 学习：课程、考试、阅读、技能提升
- 生活：购物、家务、缴费、日常事务
- 健康：运动、就医、饮食、休息
- 娱乐：游戏、电影、旅行、社交

请只返回一个JSON对象，格式如下：
{"category": "类别名称", "confidence": 0.95}
其中confidence是0-1之间的置信度。只返回JSON，不要其他文字。`
        },
        {
          role: "user",
          content: `请分类这个任务：${text}`
        }
      ],
      temperature: 0.3,
      max_tokens: 100,
    })

    const content = response.choices[0]?.message?.content || ''
    
    // 尝试从响应中解析 JSON
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0])
      const category = result.category as TaskCategory
      
      // 验证分类是否有效
      if (CATEGORY_LABELS.includes(category)) {
        return NextResponse.json({
          category,
          confidence: result.confidence || 0.8
        })
      }
    }
    
    // 降级方案：基于关键词匹配
    return NextResponse.json(fallbackClassify(text))
  } catch (error) {
    console.error('AI分类失败:', error)
    // 降级方案
    const { text } = await request.json().catch(() => ({ text: '' }))
    return NextResponse.json(fallbackClassify(text))
  }
}

// 关键词降级分类（当 AI 调用失败时使用）
function fallbackClassify(text: string) {
  const lowerText = text.toLowerCase()
  
  const keywords: Record<TaskCategory, string[]> = {
    '工作': ['会议', '报告', '项目', '客户', '老板', '邮件', 'ppt', 'deadline', '加班', '需求', '评审', '周报', '例会', '汇报'],
    '学习': ['课程', '考试', '阅读', '学习', '技能', '培训', '证书', '论文', '复习', '预习', '作业', '题库', '编程', '算法', '英语'],
    '生活': ['购物', '家务', '缴费', '超市', '买菜', '做饭', '洗衣', '打扫', '快递', '银行', '水电', '房租', '物业', '日用品'],
    '健康': ['运动', '就医', '饮食', '休息', '跑步', '健身', '瑜伽', '游泳', '看病', '医院', '医生', '体检', '吃药', '睡眠', '早睡'],
    '娱乐': ['游戏', '电影', '旅行', '社交', '聚餐', 'ktv', '派对', '追剧', '听歌', '爬山', '逛街', '约会', '打牌', '麻将', '刷抖音']
  }
  
  let bestCategory: TaskCategory = '生活'
  let maxScore = 0
  
  for (const [category, words] of Object.entries(keywords)) {
    const score = words.reduce((acc, word) => acc + (lowerText.includes(word) ? 1 : 0), 0)
    if (score > maxScore) {
      maxScore = score
      bestCategory = category as TaskCategory
    }
  }
  
  return { category: bestCategory, confidence: maxScore > 0 ? 0.6 : 0.3 }
}
