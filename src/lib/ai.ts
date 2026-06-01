export type TaskCategory = '工作' | '学习' | '生活' | '健康' | '娱乐'

export interface ClassificationResult {
  category: TaskCategory
  confidence: number
}

export const CATEGORY_COLORS: Record<TaskCategory, string> = {
  '工作': '#ef4444',
  '学习': '#3b82f6',
  '生活': '#f59e0b',
  '健康': '#10b981',
  '娱乐': '#8b5cf6',
}

export const CATEGORY_LABELS: TaskCategory[] = ['工作', '学习', '生活', '健康', '娱乐']

export async function classifyTask(text: string): Promise<ClassificationResult> {
  try {
    const response = await fetch('/api/classify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    })

    if (!response.ok) {
      throw new Error('分类请求失败')
    }

    const result = await response.json()
    
    // 验证分类是否有效
    if (CATEGORY_LABELS.includes(result.category)) {
      return {
        category: result.category,
        confidence: result.confidence || 0.8
      }
    }
    
    return fallbackClassify(text)
  } catch (error) {
    console.error('AI分类失败:', error)
    return fallbackClassify(text)
  }
}

// 关键词降级分类（当 API 调用失败时使用）
function fallbackClassify(text: string): ClassificationResult {
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
