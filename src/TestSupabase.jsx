import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'

function TestSupabase() {
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function fetchData() {
      try {
        console.log('开始获取数据...')
        const { data, error } = await supabase
          .from('venues')
          .select('*')
        
        if (error) throw error
        
        console.log('获取到的数据:', data)
        setVenues(data || [])
      } catch (err) {
        console.error('错误:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    fetchData()
  }, [])

  if (loading) return <div className="p-8 text-center">加载中...</div>
  if (error) return <div className="p-8 text-center text-red-500">错误: {error}</div>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Supabase 测试</h1>
      <p className="mb-4">找到 {venues.length} 个地点</p>
      {venues.map(venue => (
        <div key={venue.id} className="border p-4 mb-2 rounded">
          <p><strong>{venue.name}</strong></p>
          <p>品牌: {venue.brand}</p>
          <p>坐标: {venue.lat}, {venue.lng}</p>
        </div>
      ))}
    </div>
  )
}

export default TestSupabase