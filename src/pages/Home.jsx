import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../lib/supabase'

// Fix Leaflet marker icons
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

const MBTI_TYPES = [
  'INTJ', 'INTP', 'ENTJ', 'ENTP',
  'INFJ', 'INFP', 'ENFJ', 'ENFP',
  'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
  'ISTP', 'ISFP', 'ESTP', 'ESFP',
  'OTHER'
]

// 巴黎各区（20个）的中心坐标（近似）
const ARRONDISSEMENTS = [
  { code: '75001', label: '75001 - Louvre', lat: 48.862, lng: 2.336 },
  { code: '75002', label: '75002 - Bourse', lat: 48.868, lng: 2.340 },
  { code: '75003', label: '75003 - Temple', lat: 48.864, lng: 2.362 },
  { code: '75004', label: '75004 - Hôtel-de-Ville', lat: 48.856, lng: 2.350 },
  { code: '75005', label: '75005 - Panthéon', lat: 48.845, lng: 2.344 },
  { code: '75006', label: '75006 - Luxembourg', lat: 48.847, lng: 2.330 },
  { code: '75007', label: '75007 - Bourbon', lat: 48.855, lng: 2.316 },
  { code: '75008', label: '75008 - Élysée', lat: 48.874, lng: 2.312 },
  { code: '75009', label: '75009 - Opéra', lat: 48.876, lng: 2.335 },
  { code: '75010', label: '75010 - Entrepôt', lat: 48.875, lng: 2.358 },
  { code: '75011', label: '75011 - Popincourt', lat: 48.858, lng: 2.376 },
  { code: '75012', label: '75012 - Reuilly', lat: 48.840, lng: 2.387 },
  { code: '75013', label: '75013 - Gobelins', lat: 48.832, lng: 2.353 },
  { code: '75014', label: '75014 - Observatoire', lat: 48.833, lng: 2.326 },
  { code: '75015', label: '75015 - Vaugirard', lat: 48.841, lng: 2.316 },
  { code: '75016', label: '75016 - Passy', lat: 48.865, lng: 2.277 },
  { code: '75017', label: '75017 - Batignolles', lat: 48.886, lng: 2.317 },
  { code: '75018', label: '75018 - Butte-Montmartre', lat: 48.891, lng: 2.342 },
  { code: '75019', label: '75019 - Buttes-Chaumont', lat: 48.883, lng: 2.381 },
  { code: '75020', label: '75020 - Ménilmontant', lat: 48.868, lng: 2.397 }
];

function Home() {
  const { t, i18n } = useTranslation()
  const [selectedArr, setSelectedArr] = useState('')
  const [showDisclaimer, setShowDisclaimer] = useState(true)
  const [selectedBrand, setSelectedBrand] = useState('')
  const [activePage, setActivePage] = useState('home')
  const [selectedMbti, setSelectedMbti] = useState({})
  const [openDropdown, setOpenDropdown] = useState(null)
  const [language, setLanguage] = useState('en')
  const [editingCode, setEditingCode] = useState(null)
  const [newCodeValue, setNewCodeValue] = useState('')
  const [showConfirmModal, setShowConfirmModal] = useState(null)
  const [venues, setVenues] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [dashboardStats, setDashboardStats] = useState({
    totalContributions: 0,
    worksCount: 0,
    brokenCount: 0,
    mbtiCounts: {}
  })
  

  
  // Get user location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          })
        },
        (error) => {
          console.error('Geolocation error:', error)
          setUserLocation({ lat: 48.8566, lng: 2.3522 })
        }
      )
    } else {
      setUserLocation({ lat: 48.8566, lng: 2.3522 })
    }
  }, [])
  
  // Calculate distance between two coordinates
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return Math.round(R * c * 1000)
  }
  

  
// Fetch dashboard stats from Supabase（只从 codes 表统计）
const fetchDashboardStats = async () => {
  try {
    const { data: codesData } = await supabase.from('codes').select('*')
    
    const worksCount = codesData?.filter(c => c.status === 'working').length || 0
    const brokenCount = codesData?.filter(c => c.status === 'broken').length || 0
    const totalContributions = codesData?.length || 0
    
    // 从 codes 表的 mbti_type 字段统计 MBTI 分布
    const mbtiCounts = {}
    MBTI_TYPES.forEach(type => { mbtiCounts[type] = 0 })
    codesData?.forEach(item => {
      const type = item.mbti_type
      if (type && mbtiCounts[type] !== undefined) {
        mbtiCounts[type]++
      }
    })
    
    setDashboardStats({ totalContributions, worksCount, brokenCount, mbtiCounts })
  } catch (err) {
    console.error('Error fetching dashboard stats:', err)
  }
}
  
  // Fetch venues from Supabase
  // Fetch venues from Supabase
  useEffect(() => {
    const fetchVenues = async () => {
      try {
        setLoading(true)
        
        const { data: venuesData, error: venuesError } = await supabase
          .from('venues')
          .select('*')
        
        if (venuesError) throw venuesError
        
        const { data: codesData, error: codesError } = await supabase
          .from('codes')
          .select('*')
          .order('created_at', { ascending: false })
        
        if (codesError) throw codesError
        
        const latestCodes = {}
        codesData?.forEach(code => {
          if (!latestCodes[code.venue_id] || 
              new Date(code.created_at) > new Date(latestCodes[code.venue_id].created_at)) {
            latestCodes[code.venue_id] = code
          }
        })
        
        let venuesWithDistance = venuesData || []
        if (userLocation) {
          venuesWithDistance = venuesWithDistance.map(venue => ({
            ...venue,
            distance: getDistance(
              userLocation.lat,
              userLocation.lng,
              venue.lat,
              venue.lng
            )
          })).sort((a, b) => a.distance - b.distance)
        }
        
        const mergedVenues = venuesWithDistance.map(venue => ({
          ...venue,
          code: latestCodes[venue.id]?.code || 'none',
          lastUpdated: latestCodes[venue.id]?.created_at || venue.created_at,
          status: latestCodes[venue.id]?.status || 'unknown'
        }))

        // 1. 先获取前20个最近的地点（为品牌筛选提供足够的数据）
        let filteredVenues = mergedVenues.slice(0, 20);
        
        // 2. 应用品牌筛选逻辑
        if (selectedBrand) {
          filteredVenues = filteredVenues.filter(venue => venue.brand === selectedBrand);
        }
        
        // 3. 最终只显示前5个符合条件的地点
        setVenues(filteredVenues.slice(0, 5));
        
        await fetchDashboardStats()
      } catch (err) {
        console.error('Error fetching venues:', err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    
    if (userLocation) {
      fetchVenues()
    }
    // 当 userLocation 或 selectedBrand 变化时，重新获取数据
  }, [userLocation, selectedBrand])

  
  const handleArrondissementChange = (e) => {
    const code = e.target.value
    setSelectedArr(code)
    if (code === '') return
    const arr = ARRONDISSEMENTS.find(a => a.code === code)
    if (arr) {
      setUserLocation({ lat: arr.lat, lng: arr.lng })
      alert(`📍 已定位到 ${arr.label}`)
    }
  }
  const handleBrandChange = (e) => {
    setSelectedBrand(e.target.value)
  }

  const changeLanguage = (lng) => {
    setLanguage(lng);
    i18n.changeLanguage(lng);
  };
  
  const formatLastUpdated = (dateString) => {
    if (!dateString) return t('unknown')
    const date = new Date(dateString)
    const now = new Date()
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60))
    
    if (diffHours < 1) return t('just_now')
    if (diffHours < 24) return t('hours_ago', { count: diffHours })
    if (diffHours < 48) return t('yesterday')
    return t('days_ago', { count: Math.floor(diffHours / 24) })
  }
  
  const handleMbtiSelect = async (venueId, mbtiType) => {
    // ========== 限流：每小时最多20次 ==========
    const RATE_LIMIT_MAX = 20;
    const RATE_LIMIT_HOURS = 1;
    const key = 'mbti_ratelimit'; // 全局计数
    const now = Date.now();
    let records = JSON.parse(localStorage.getItem(key) || '[]');
    // 清除超过1小时的旧记录
    records = records.filter(ts => (now - ts) < RATE_LIMIT_HOURS * 60 * 60 * 1000);
    if (records.length >= RATE_LIMIT_MAX) {
      alert(t('rate_limit_message') || `💚 你每小时只能选择 MBTI ${RATE_LIMIT_MAX} 次，请稍后再来 ~`);
      return;
    }
    records.push(now);
    localStorage.setItem(key, JSON.stringify(records));
    // ========== 限流结束 ==========
    
    // 只存储到本地 state，不再插入数据库
    setSelectedMbti(prev => ({ ...prev, [venueId]: mbtiType }));
    setOpenDropdown(null);
    
    alert(`✓ 已选择 MBTI 类型: ${mbtiType}，现在可以投票或修改密码了`);
  }
  
  const handleVote = async (venueId, voteType) => {
    // ========== 限流：每小时最多20次（全局，不分场地） ==========
    const RATE_LIMIT_MAX = 20;
    const RATE_LIMIT_HOURS = 1;
    const key = `vote_ratelimit_${venueId}`;
    const now = Date.now();
    let records = JSON.parse(localStorage.getItem(key) || '[]');
    records = records.filter(ts => (now - ts) < RATE_LIMIT_HOURS * 60 * 60 * 1000);
    if (records.length >= RATE_LIMIT_MAX) {
      alert(t('rate_limit_message') || `💚 你每小时只能投票 ${RATE_LIMIT_MAX} 次，请稍后再来 ~`);
      return;
    }
    records.push(now);
    localStorage.setItem(key, JSON.stringify(records));
    // ========== 限流结束 ==========
    
    // 1. 检查是否已选择 MBTI
    const userMbti = selectedMbti[venueId];
    if (!userMbti) {
      alert('请先在上方选择你的 MBTI 类型，再投票 🙏');
      return;
    }
    
    // 2. 执行投票
    try {
      const venue = venues.find(v => v.id === venueId);
      
      await supabase.from('codes').insert([{
        venue_id: venueId,
        code: venue.code,
        status: voteType,
        confirmations: 1,
        mbti_type: userMbti,        // 记录这次投票所使用的 MBTI
        created_at: new Date().toISOString()
      }]);
      
      alert(`${t(voteType === 'working' ? 'vote_works' : 'vote_broken')} ${venue.name}`);
      
      // 3. 清空该场地的 MBTI 选择（可选，鼓励下次重新选）
      setSelectedMbti(prev => ({ ...prev, [venueId]: null }));
      
      // 4. 更新前端显示
      setVenues(prev => prev.map(v =>
        v.id === venueId
          ? { ...v, status: voteType, lastUpdated: new Date().toISOString() }
          : v
      ));
      
      // 5. 刷新统计数据
      await fetchDashboardStats();
    } catch (err) {
      console.error('Error saving vote:', err);
      alert(t('vote_error') || '投票失败，请重试');
    }
  }
  
  const startEditCode = (venue) => {
    setEditingCode(venue.id)
    setNewCodeValue(venue.code)
  }
  
  const confirmCodeChange = (venueId) => {
    setShowConfirmModal(venueId)
  }
  
  const saveCodeChange = async (venueId) => {
    // 检查是否已选择 MBTI
    const userMbti = selectedMbti[venueId]
    if (!userMbti) {
      alert('请先在上方选择你的 MBTI 类型，再修改密码 🙏')
      return
    }
    
    try {
      await supabase.from('codes').insert([{
        venue_id: venueId,
        code: newCodeValue,
        status: 'working',           // 注意：改为 'working' 而不是 'pending'
        confirmations: 1,
        mbti_type: userMbti,         // ← 新增：记录 MBTI
        created_at: new Date().toISOString()
      }])
      
      // 清空该地点的 MBTI 选择
      setSelectedMbti(prev => ({ ...prev, [venueId]: null }))
      
      setVenues(prev => prev.map(venue => 
        venue.id === venueId 
          ? { ...venue, code: newCodeValue, lastUpdated: new Date().toISOString() }
          : venue
      ))
      
      setEditingCode(null)
      setNewCodeValue('')
      setShowConfirmModal(null)
      alert(t('code_updated'))
      await fetchDashboardStats()
    } catch (err) {
      console.error('Error saving code:', err)
      alert(t('code_error'))
    }
  }
  
  const cancelEdit = () => {
    setEditingCode(null)
    setNewCodeValue('')
  }
  
  const getMbtiPercentage = (type) => {
    const total = Object.values(dashboardStats.mbtiCounts).reduce((a, b) => a + b, 0)
    if (total === 0) return 0
    return Math.round((dashboardStats.mbtiCounts[type] || 0) / total * 100)
  }
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">{t('loading')}</p>
        </div>
      </div>
    )
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>{t('error')}: {error}</p>
          <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg">
            {t('retry')}
          </button>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with Language Switcher */}
      <header className="sticky top-0 z-20 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex justify-between items-center">
          <h1 className="text-lg font-semibold text-gray-900">{t('app_title')}</h1>
          <div className="flex gap-1">
            {['en', 'fr', 'zh', 'ko'].map((lng) => (
              <button
                key={lng}
                onClick={() => changeLanguage(lng)}
                className={`px-2 py-1 text-xs rounded-md transition ${
                  language === lng 
                    ? 'bg-green-500 text-white' 
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {lng.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="flex-1 px-4 py-3 pb-32">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-5">
          <button
            onClick={() => setActivePage('home')}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activePage === 'home' 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('nearby_access')}
          </button>
          <button
            onClick={() => setActivePage('dashboard')}
            className={`flex-1 py-2.5 rounded-xl font-medium text-sm transition-all ${
              activePage === 'dashboard' 
                ? 'bg-green-500 text-white shadow-md' 
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            {t('dashboard')}
          </button>
        </div>
        
        {/* HOME PAGE */}
        {activePage === 'home' && (
          <>
            <div className="mb-3">
              <h2 className="text-xl font-bold text-gray-900">{t('nearby_access')}</h2>
              <p className="text-xs text-gray-500">{t('verified')}</p>
            </div>
            
            {/* ========== 新增：手动位置选择器 ========== */}
            <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
  <p className="text-xs font-medium text-blue-700 mb-2 flex items-center gap-1">
    <span>🗺️</span> {t('select_arrondissement') || '选择巴黎的区'}
  </p>
  <select
    value={selectedArr}
    onChange={handleArrondissementChange}
    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
  >
    <option value="">{t('select_placeholder') || '-- 请选择 --'}</option>
    {ARRONDISSEMENTS.map(arr => (
      <option key={arr.code} value={arr.code}>{arr.label}</option>
    ))}
  </select>
  <p className="text-[10px] text-blue-400 mt-1.5">
    {t('select_hint') || '选择后将重新计算附近的厕所位置'}
  </p>
</div>
                        {/* ========== 新增：品牌筛选器（添加这段） ========== */}
                        <div className="mb-4 p-3 bg-green-50 rounded-xl border border-green-100">
              <p className="text-xs font-medium text-green-700 mb-2 flex items-center gap-1">
                <span>🏷️</span> {t('filter_by_brand') || '按餐厅筛选'}
              </p>
              <select
                value={selectedBrand}
                onChange={handleBrandChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 bg-white"
              >
                <option value="">{t('all_brands') || '所有品牌'}</option>
                <option value="McDonald's">McDonald's</option>
                <option value="Burger King">Burger King</option>
                <option value="KFC">KFC</option>
                <option value="Starbucks">Starbucks</option>
                <option value="Pret A Manger">Pret A Manger</option>
                <option value="Quick">Quick</option>
              </select>
              <p className="text-[10px] text-green-400 mt-1.5">
                {t('select_brand_hint') || '选择后将只显示特定品牌的厕所'}
              </p>
            </div>

            {/* Cards - 只显示最近的5个地点，没有状态标签 */}
            <div className="space-y-3 mb-5">
              {venues.length === 0 ? (
                <div className="text-center py-8 text-gray-500">{t('no_venues')}</div>
              ) : (
                venues.map((venue) => (
                  <div key={venue.id} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
                    {/* Venue Header - 没有状态标签 */}
                    <div className="mb-2">
                      <h3 className="font-semibold text-sm text-gray-900">{venue.name}</h3>
                      <p className="text-xs text-gray-500">{venue.brand || 'Independent'} • {venue.distance || 0}m</p>
                    </div>
                    
                    {/* Code Box */}
                    <div className="mb-2">
                      {editingCode === venue.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={newCodeValue}
                            onChange={(e) => setNewCodeValue(e.target.value)}
                            className="w-full px-3 py-2 text-center font-mono text-xl font-bold border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                            placeholder={t('enter_code')}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button onClick={() => confirmCodeChange(venue.id)} className="flex-1 bg-green-500 text-white py-1.5 rounded-lg text-sm font-medium">
                              {t('confirm')}
                            </button>
                            <button onClick={cancelEdit} className="flex-1 border border-gray-300 text-gray-600 py-1.5 rounded-lg text-sm font-medium">
                              {t('cancel')}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div onClick={() => startEditCode(venue)} className="bg-gray-50 rounded-lg p-2 text-center cursor-pointer hover:bg-gray-100 transition">
                          <code className="text-xl font-mono font-bold tracking-wider">{venue.code}</code>
                          <p className="text-xs text-gray-400 mt-1">{t('tap_to_edit')}</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Last Update Date */}
                    <div className="text-center mb-3">
                      <p className="text-xs text-gray-400">{t('last_update')}: {formatLastUpdated(venue.lastUpdated)}</p>
                    </div>
                    
                    {/* MBTI Dropdown */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-medium text-gray-600">{t('your_mbti')}</label>
                        <a href="https://www.16personalities.com" target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 underline">
                          {t('take_test')}
                        </a>
                      </div>
                      
                      <div className="relative">
                        <button onClick={() => setOpenDropdown(openDropdown === venue.id ? null : venue.id)} className="w-full px-2 py-1.5 text-left bg-white border border-gray-300 rounded-lg text-xs flex justify-between items-center">
                          <span className={selectedMbti[venue.id] ? 'text-gray-900' : 'text-gray-400'}>
                            {selectedMbti[venue.id] || t('select_type')}
                          </span>
                          <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        
                        {openDropdown === venue.id && (
                          <div className="absolute bottom-full mb-1 z-10 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
                            {MBTI_TYPES.map((type) => (
                              <button key={type} onClick={() => handleMbtiSelect(venue.id, type)} className={`w-full px-3 py-1.5 text-left text-xs hover:bg-gray-50 ${
                                selectedMbti[venue.id] === type ? 'bg-green-50 text-green-600' : 'text-gray-700'
                              }`}>
                                {type}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <button onClick={() => handleVote(venue.id, 'working')} className="bg-green-500 text-white py-2 rounded-lg text-sm font-medium">
                        ✓ {t('still_works')}
                      </button>
                      <button onClick={() => handleVote(venue.id, 'broken')} className="border border-red-500 text-red-500 py-2 rounded-lg text-sm font-medium bg-white">
                        ✗ {t('not_working')}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {/* MAP SECTION */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-2">{t('location_map')}</h3>
              <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm h-64">
                <MapContainer center={userLocation || [48.8566, 2.3522]} zoom={14} className="h-full w-full" style={{ background: '#f0f0f0' }}>
                  <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  {venues.map((venue) => (
                    <Marker key={venue.id} position={[venue.lat, venue.lng]}>
                      <Popup>
                        <div className="text-xs">
                          <p className="font-semibold">{venue.name}</p>
                          <p className="text-gray-600">{venue.brand || 'Independent'}</p>
                          <p className="text-gray-500">{venue.distance || 0}m away</p>
                          <p className="font-mono text-sm mt-1">{t('code')}: {venue.code}</p>
                          <p className="text-gray-400 text-xs mt-1">{t('updated')}: {formatLastUpdated(venue.lastUpdated)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
              <p className="text-xs text-gray-400 text-center mt-2">{t('showing_locations')}</p>
            </div>
          </>
        )}
        
        {/* DASHBOARD PAGE - 同步的数据 */}
        {activePage === 'dashboard' && (
          <>
            <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white text-center mb-4">
              <p className="text-4xl font-bold">{dashboardStats.totalContributions}</p>
              <p className="text-xs opacity-90">{t('total_contributions')}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-green-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{t('works_count')}</p>
                <p className="text-2xl font-bold text-green-600">{dashboardStats.worksCount}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">{t('broken_count')}</p>
                <p className="text-2xl font-bold text-red-600">{dashboardStats.brokenCount}</p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="font-semibold text-sm text-gray-900 mb-1">{t('mbti_breakdown')}</h3>
              <p className="text-xs text-gray-500 mb-3">{t('community_insights')}</p>

              {MBTI_TYPES.map((type) => {
                const percentage = getMbtiPercentage(type)
                if (percentage === 0) return null
                return (
                  <div key={type} className="flex items-center gap-2 mb-2">
                    <span className="w-10 text-xs font-medium text-gray-600">{type}</span>
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all duration-300" style={{ width: `${percentage}%` }} />
                    </div>
                    <span className="w-10 text-xs text-gray-500 text-right">{percentage}%</span>
                  </div>
                )
              })}
              
              {Object.values(dashboardStats.mbtiCounts).reduce((a, b) => a + b, 0) === 0 && (
                <p className="text-center text-gray-400 text-xs py-4">{t('no_mbti_data')}</p>
              )}
            </div>
          </>
        )}
      </div>
      
      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-5 max-w-sm w-full">
            <h3 className="font-semibold text-gray-900 mb-2">{t('confirm_title')}</h3>
            <p className="text-sm text-gray-600 mb-4">{t('confirm_message', { code: newCodeValue })}</p>
            <div className="flex gap-3">
              <button onClick={() => saveCodeChange(showConfirmModal)} className="flex-1 bg-green-500 text-white py-2 rounded-lg font-medium">
                {t('confirm')}
              </button>
              <button onClick={() => setShowConfirmModal(null)} className="flex-1 border border-gray-300 text-gray-600 py-2 rounded-lg font-medium">
                {t('cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer Note */}
      <div className="fixed bottom-16 left-0 right-0 px-4 py-2">
        <p className="text-center text-xs text-gray-400">
          {t('footer_text')}
          <a 
            href="mailto:christophe.hyj@proton.me" 
            className="hover:text-green-500 underline ml-1"
          >
            {t('footer_contact')}
          </a>
        </p>
      </div>
      
      {/* ============================================ */}
      {/* 免责声明 - 可关闭版本 */}
      {/* ============================================ */}
      {showDisclaimer && (
        <div className="fixed bottom-16 left-0 right-0 z-40 px-4 py-2 bg-amber-50/95 backdrop-blur-md border-t border-amber-200/50 shadow-sm">
          <div className="max-w-md mx-auto relative">
            {/* 关闭按钮 */}
            <button 
              onClick={() => setShowDisclaimer(false)}
              className="absolute top-0 right-0 text-amber-500 hover:text-amber-700 transition"
              aria-label="关闭"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="flex items-center justify-center gap-1 mb-1">
              <span className="text-xs">⚠️</span>
              <p className="text-[10px] font-semibold text-amber-700 text-center tracking-wide">
                {t('disclaimer_title')}
              </p>
            </div>
            <p className="text-[9px] text-amber-600/90 text-center leading-relaxed pr-4">
              {t('disclaimer_line1')}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 mt-1 pr-4">
              <p className="text-[9px] text-amber-600/80 text-center">
                {t('disclaimer_line2')}
              </p>
              <span className="text-[8px] text-amber-400">•</span>
              <p className="text-[9px] text-amber-600/80 text-center">
                {t('disclaimer_line3')}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 shadow-lg">
        <div className="flex max-w-md mx-auto">
          <button 
            onClick={() => setActivePage('home')} 
            className={`flex-1 py-3.5 text-center transition-all duration-200 ${
              activePage === 'home' 
                ? 'text-green-500 border-t-2 border-green-500 -mt-px' 
                : 'text-gray-400 hover:text-gray-500'
            }`}
          >
            <div className="text-sm font-medium">{t('nearby_access')}</div>
          </button>
          <button 
            onClick={() => setActivePage('dashboard')} 
            className={`flex-1 py-3.5 text-center transition-all duration-200 ${
              activePage === 'dashboard' 
                ? 'text-green-500 border-t-2 border-green-500 -mt-px' 
                : 'text-gray-400 hover:text-gray-500'
            }`}
          >
            <div className="text-sm font-medium">{t('dashboard')}</div>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default Home