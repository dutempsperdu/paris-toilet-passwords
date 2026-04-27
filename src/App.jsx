import Home from './pages/Home'
import { Analytics } from '@vercel/analytics/react'
import { SpeedInsights } from '@vercel/speed-insights/react'  // 添加这一行

function App() {
  return (
    <>
      <Home />
      <Analytics />
      <SpeedInsights />  {/* 添加这一行 */}
    </>
  )
}

export default App