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

function Home() {
  const { t, i18n } = useTranslation()
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
  
  // Fetch dashboard stats from Supabase
  const fetchDashboardStats = async () => {
    try {
      const { data: codesData } = await supabase.from('codes').select('*')
      const { data: mbtiData } = await supabase.from('mbti_contributions').select('*')
      
      const worksCount = codesData?.filter(c => c.status === 'working').length || 0
      const brokenCount = codesData?.filter(c => c.status === 'broken').length || 0
      const totalContributions = (codesData?.length || 0) + (mbtiData?.length || 0)
      
      const mbtiCounts = {}
      MBTI_TYPES.forEach(type => { mbtiCounts[type] = 0 })
      mbtiData?.forEach(item => {
        const type = item.mbti_type
        if (mbtiCounts[type] !== undefined) mbtiCounts[type]++
      })
      
      setDashboardStats({ totalContributions, worksCount, brokenCount, mbtiCounts })
    } catch (err) {
      console.error('Error fetching dashboard stats:', err)
    }
  }
  
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
          code: latestCodes[venue.id]?.code || 'No code yet',
          lastUpdated: latestCodes[venue.id]?.created_at || venue.created_at,
          status: latestCodes[venue.id]?.status || 'unknown'
        }))
        
        // 只显示最近的3个地点
        setVenues(mergedVenues.slice(0, 3))
        
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
  }, [userLocation])
  
  const changeLanguage = (lng) => {
    setLanguage(lng)
    i18n.changeLanguage(lng)
  }
  
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
    // ========== localStorage 限流 ==========
    const lastMbtiTime = localStorage.getItem('last_mbti_time');
    const now = Date.now();
    
    if (lastMbtiTime && (now - parseInt(lastMbtiTime)) < 60 * 60 * 1000) {
      alert(t('rate_limit_message') || '💚 你一小时内已经分享过 MBTI 啦，请稍后再来 ~');
      return;
    }
    
    localStorage.setItem('last_mbti_time', now);
    // ========== 限流代码结束 ==========
    
    setSelectedMbti(prev => ({ ...prev, [venueId]: mbtiType }))
    setOpenDropdown(null)
    
    try {
      await supabase.from('mbti_contributions').insert([{
        venue_id: venueId,
        mbti_type: mbtiType,
        created_at: new Date().toISOString()
      }])
      await fetchDashboardStats()
    } catch (err) {
      console.error('Error saving MBTI:', err)
    }
  }
  
  const handleVote = async (venueId, voteType) => {
     // ========== localStorage 限流（每个用户每小时只能投1次）==========
  const lastVoteTime = localStorage.getItem('last_vote_time');
  const now = Date.now();
  
  if (lastVoteTime && (now - parseInt(lastVoteTime)) < 60 * 60 * 1000) {
    alert(t('rate_limit_message') || '💚 你一小时内已经投过票啦，请稍后再来 ~');
    return;
  }
  
  localStorage.setItem('last_vote_time', now);
  // ========== 限流代码结束 ==========
    try {
      const venue = venues.find(v => v.id === venueId)
      
      await supabase.from('codes').insert([{
        venue_id: venueId,
        code: venue.code,
        status: voteType,
        confirmations: 1,
        created_at: new Date().toISOString()
      }])
      
      alert(t(voteType === 'working' ? 'vote_works' : 'vote_broken') + ' ' + venue.name)
      
      setVenues(prev => prev.map(v => 
        v.id === venueId 
          ? { ...v, status: voteType, lastUpdated: new Date().toISOString() }
          : v
      ))
      
      await fetchDashboardStats()
    } catch (err) {
      console.error('Error saving vote:', err)
      alert(t('vote_error'))
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
    try {
      await supabase.from('codes').insert([{
        venue_id: venueId,
        code: newCodeValue,
        status: 'pending',
        confirmations: 0,
        created_at: new Date().toISOString()
      }])
      
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
            
            {/* Cards - 只显示最近的3个地点，没有状态标签 */}
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

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200">
        <div className="flex max-w-md mx-auto">
          <button onClick={() => setActivePage('home')} className={`flex-1 py-3 text-center transition-colors ${
            activePage === 'home' ? 'text-green-500 border-t-2 border-green-500 -mt-px' : 'text-gray-400'
          }`}>
            <div className="text-sm">{t('nearby_access')}</div>
          </button>
          <button onClick={() => setActivePage('dashboard')} className={`flex-1 py-3 text-center transition-colors ${
            activePage === 'dashboard' ? 'text-green-500 border-t-2 border-green-500 -mt-px' : 'text-gray-400'
          }`}>
            <div className="text-sm">{t('dashboard')}</div>
          </button>
        </div>
      </nav>
    </div>
  )
}

export default Home