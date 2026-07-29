import { useEffect, useMemo, useState } from 'react'
import {
  ArrowRight, CalendarDays, Car, ChevronDown, ChevronRight, Clock3, Compass,
  ExternalLink, Home, Info, Luggage, Map, MapPin, Navigation, Search, Sparkles, Users, X,
} from 'lucide-react'
import { highlights, itinerary, regions, tripMeta } from './data'

const pad = (n) => String(n).padStart(2, '0')
const mapUrl = (place) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`
const branchLabels = {
  ski: '🎿 滑雪行程',
  sightseeing: '🚶 觀光行程',
  jetboat: '🚤 快艇行程',
  leisure: '☕ 休閒行程',
  food: '🍽️ 美食行程',
  british: '🛶 英倫行程',
}
const branchPairs = {
  3: ['ski', 'sightseeing'],
  5: ['jetboat', 'leisure'],
  9: ['food', 'british'],
}

const branchDayByDate = {
  '2026-09-21': 3,
  '2026-09-23': 5,
  '2026-09-27': 9,
}

function toDate(day, time) {
  const [year, month, date] = day.date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  return new Date(year, month - 1, date, hour, minute)
}

const allEvents = itinerary.flatMap((day) =>
  day.items.map((event) => ({
    ...event,
    day: day.day,
    date: day.date,
    city: day.city,
    theme: day.theme,
    at: toDate(day, event.time),
  })),
).sort((a, b) => a.at - b.at)

const branchStorageKey = 'southern-notes-branch-selections'

function getBranchDay(day) {
  return branchPairs[day] || null
}

function getBranchEvents(events, branch) {
  return events.filter((event) => event.branch === 'all' || event.branch === branch)
}

function getBranchSelection(dayDate, currentBranchSelections, fallbackBranch) {
  return currentBranchSelections[dayDate] || fallbackBranch || null
}

function getVisibleBranchItems(dayItems, selectedBranch) {
  const allowed = new Set(['all', selectedBranch].filter(Boolean))
  return [...dayItems]
    .filter((event) => allowed.has(event.branch))
    .sort((a, b) => a.at - b.at)
}

function formatNow(date) {
  return new Intl.DateTimeFormat('zh-TW', {
    month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date)
}

function JourneyTracker() {
  const [mode, setMode] = useState('live')
  const [now, setNow] = useState(new Date())
  const [customDate, setCustomDate] = useState('2026-09-23')
  const [customTime, setCustomTime] = useState('14:15')
  const [branchSelections, setBranchSelections] = useState({})

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000)
    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(branchStorageKey)
      if (raw) setBranchSelections(JSON.parse(raw))
    } catch {
      /* noop */
    }
  }, [])

  useEffect(() => {
    try {
      window.localStorage.setItem(branchStorageKey, JSON.stringify(branchSelections))
    } catch {
      /* noop */
    }
  }, [branchSelections])

  const queryTime = mode === 'live' ? now : new Date(`${customDate}T${customTime}:00`)
  const status = useMemo(() => {
    const currentDay = itinerary.find((day) => day.date === `${queryTime.getFullYear()}-${pad(queryTime.getMonth() + 1)}-${pad(queryTime.getDate())}`)
    const branchDay = currentDay ? getBranchDay(currentDay.day) : null
    const selectedBranch = branchDay ? getBranchSelection(currentDay.date, branchSelections, branchDay[0]) : null
    const schedule = branchDay && selectedBranch
      ? allEvents.filter((event) => {
        if (event.date !== currentDay.date) return true
        return event.branch === 'all' || event.branch === selectedBranch
      })
      : allEvents

    const first = schedule[0]
    const last = schedule[schedule.length - 1]
    const sameDateEvents = schedule.filter((event) => event.date === `${queryTime.getFullYear()}-${pad(queryTime.getMonth() + 1)}-${pad(queryTime.getDate())}`)
    const startedToday = sameDateEvents.filter((event) => event.at <= queryTime)
    const current = startedToday.at(-1) || null
    const next = schedule.find((event) => event.at > queryTime) || null

    if (queryTime < first.at) return { state: 'before', current: null, next: first }
    if (queryTime > last.at) return { state: 'after', current: null, next: null }
    if (!current && sameDateEvents.length) return { state: 'waiting', current: null, next: sameDateEvents[0] }
    if (!sameDateEvents.length) return { state: 'gap', current: null, next }
    return {
      state: 'active',
      current,
      next,
      branchDay,
      selectedBranch,
      currentDay,
      branchDate: currentDay?.date || null,
      branchOptions: branchDay,
    }
  }, [queryTime.getTime(), branchSelections, mode])

  const setBranchForDate = (date, branch) => {
    setBranchSelections((prev) => ({ ...prev, [date]: branch }))
  }

  return (
    <section id="tracker" className="tracker-card overflow-hidden">
      <div className="tracker-top">
        <div>
          <div className="eyebrow text-mint"><span className="live-dot" /> LIVE JOURNEY</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white md:text-3xl">現在，旅程走到哪裡？</h2>
          <p className="mt-2 text-sm text-white/60">{mode === 'live' ? `裝置時間 · ${formatNow(now)}` : `自訂時間 · ${formatNow(queryTime)}`}</p>
        </div>
        <div className="mode-switch" role="group" aria-label="時間模式">
          <button className={mode === 'live' ? 'active' : ''} onClick={() => setMode('live')}>Live</button>
          <button className={mode === 'custom' ? 'active' : ''} onClick={() => setMode('custom')}>自訂查詢</button>
        </div>
      </div>

      {mode === 'custom' && (
        <div className="custom-panel">
          <label><span>旅程日期</span><input type="date" min="2026-09-19" max="2026-09-29" value={customDate} onChange={(e) => setCustomDate(e.target.value)} /></label>
          <label><span>當地時間</span><input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} /></label>
          <p><Sparkles size={15} /> 試著選擇 9/23 14:15，預覽快艇與蒸汽船的分組時刻。</p>
        </div>
      )}

      {status.branchDay && (
        <div className="branch-prompt">
          <div>
            <div className="eyebrow text-mint">TODAY NEEDS A BRANCH</div>
            <p className="mt-2 text-sm text-white/75">今天是分組日，請先選擇你要追蹤的行程分支，這樣 Now / Up Next 才會準確。</p>
          </div>
          <div className="branch-choice-row">
            {status.branchDay.map((branch) => (
              <button
                key={branch}
                className={`branch-choice ${status.selectedBranch === branch ? 'active' : ''}`}
                onClick={() => setBranchForDate(status.branchDate, branch)}
              >
                {branchLabels[branch]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="tracker-grid">
          <TrackerItem
            label="正在進行 NOW"
            event={status.current}
            emptyTitle={status.state === 'after' ? '旅程已圓滿結束' : status.state === 'before' ? '旅程尚未開始' : status.state === 'gap' ? '今日沒有排定行程' : '今天還在慢慢醒來'}
            emptyDetail={status.state === 'after' ? '帶著滿滿回憶回家了。' : status.state === 'before' ? '首站將於 9/19 15:30 開始。' : status.branchDay ? '請先選擇今天的分支。' : '下一站已經為你準備好了。'}
            primary
          />
          <TrackerItem
            label="下一個行程 UP NEXT"
            event={status.next}
            emptyTitle={status.branchDay ? '尚未選擇分支' : '沒有下一個行程'}
            emptyDetail={status.branchDay ? '選完分支後就會顯示精準的下一站。' : '好好享受旅程的餘韻。'}
          />
      </div>
    </section>
  )
}

function TrackerItem({ label, event, emptyTitle, emptyDetail, primary = false }) {
  return (
    <div className={`tracker-item ${primary ? 'primary' : ''}`}>
      <div className="eyebrow">{label}</div>
      {event ? (
        <>
          <div className="mt-4 flex items-center gap-2 text-sm opacity-70">
            <span>DAY {pad(event.day)}</span><span>·</span><span>{event.date.replaceAll('-', '.')}</span>
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em]">{event.title}</h3>
          {event.branch && event.branch !== 'all' && <span className="group-pill mt-3">{branchLabels[event.branch]}</span>}
          <div className="mt-5 flex items-center justify-between gap-3 border-t border-current/10 pt-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm"><Clock3 size={15} /><strong>{event.time}</strong></div>
              <div className="mt-2 flex items-start gap-2 text-sm opacity-75"><MapPin className="mt-0.5 shrink-0" size={15} /><span className="truncate">{event.place}</span></div>
            </div>
            <a className="nav-button" href={mapUrl(event.place)} target="_blank" rel="noreferrer" aria-label={`導航到 ${event.place}`}>
              <Navigation size={17} /><span>導航</span>
            </a>
          </div>
        </>
      ) : (
        <div className="py-7">
          <h3 className="text-xl font-semibold">{emptyTitle}</h3>
          <p className="mt-2 text-sm opacity-60">{emptyDetail}</p>
        </div>
      )}
    </div>
  )
}

function Itinerary() {
  const [activeDay, setActiveDay] = useState(0)
  const [dayBranches, setDayBranches] = useState({})
  const day = itinerary[activeDay]
  const branchDay = getBranchDay(day.day)
  const selectedBranch = branchDay ? dayBranches[day.day] || branchDay[0] : null
  const visibleItems = branchDay
    ? getVisibleBranchItems(day.items, selectedBranch)
    : [...day.items].sort((a, b) => a.at - b.at)

  return (
    <section id="itinerary" className="section-shell scroll-mt-24">
      <SectionHeading index="01" overline="ITINERARY" title="十一天，不趕路的南島時間軸" text="點選天數，查看當日分組、交通、預算與重要提醒。" />
      <div className="itinerary-layout">
        <div className="day-rail" role="tablist" aria-label="選擇行程天數">
          {itinerary.map((entry, index) => (
            <button key={entry.day} role="tab" aria-selected={index === activeDay} className={index === activeDay ? 'active' : ''} onClick={() => setActiveDay(index)}>
              <span className="day-number">Day {pad(entry.day)}</span>
              <span className="day-copy"><strong>{entry.date.slice(5).replace('-', '/')} ({entry.weekday})</strong><small>{entry.city}</small></span>
              <ChevronRight size={17} />
            </button>
          ))}
        </div>

        <article className="day-detail" key={day.day}>
          <header className="day-header">
            <div>
              <div className="eyebrow text-forest/50">DAY {pad(day.day)} · {day.date.replaceAll('-', '.')}（{day.weekday}）</div>
              <h3>{day.theme}</h3>
              <p><MapPin size={16} /> 今晚住在 {day.stay}</p>
            </div>
            <span className="day-symbol">{day.icon}</span>
          </header>
          {branchDay && (
            <div className="branch-toggle-shell">
              {branchDay.map((branch) => (
                <button
                  key={branch}
                  className={selectedBranch === branch ? 'active' : ''}
                  onClick={() => setDayBranches((prev) => ({ ...prev, [day.day]: branch }))}
                >
                  {branchLabels[branch]}
                </button>
              ))}
            </div>
          )}
          <div className="timeline">
            {visibleItems.map((event, index) => (
              <TimelineEvent key={`${event.time}-${event.title}-${index}`} event={event} />
            ))}
          </div>
          <div className="day-facts">
            <div><Car size={18} /><span><small>交通</small>{day.transport}</span></div>
            <div><Info size={18} /><span><small>預算</small>{day.budget}</span></div>
          </div>
          <div className="note-box"><Sparkles size={18} /><p><strong>旅人提醒</strong>{day.note}</p></div>
        </article>
      </div>
    </section>
  )
}

function TimelineEvent({ event }) {
  return (
    <div className="timeline-row">
      <time>{event.time}</time>
      <span className="timeline-dot" />
      <div className={`event-card ${event.branch && event.branch !== 'all' ? `branch-${event.branch}` : 'branch-all'}`}>
        <div className="flex flex-wrap items-center gap-2">
          <h4>{event.title}</h4>
          {event.branch && event.branch !== 'all' && <span className="group-pill">{branchLabels[event.branch]}</span>}
        </div>
        {event.detail && <p>{event.detail}</p>}
        <div className="event-place">
          <MapPin size={14} /><span>{event.place}</span>
          <a href={mapUrl(event.place)} target="_blank" rel="noreferrer">Google Maps <ExternalLink size={12} /></a>
        </div>
      </div>
    </div>
  )
}

function Explore() {
  const [regionId, setRegionId] = useState('queenstown')
  const [view, setView] = useState('restaurants')
  const [category, setCategory] = useState('全部')
  const [search, setSearch] = useState('')
  const region = regions.find((entry) => entry.id === regionId)
  const data = view === 'restaurants' ? region.restaurants : region.sights
  const categories = ['全部', ...new Set(data.map((entry) => entry.type))]
  const filtered = data.filter((entry) => (category === '全部' || entry.type === category) && `${entry.name}${entry.note}${entry.type}`.toLowerCase().includes(search.toLowerCase()))

  useEffect(() => { setCategory('全部'); setSearch('') }, [regionId, view])

  return (
    <section id="explore" className="section-shell scroll-mt-24">
      <SectionHeading index="02" overline="EXPLORE BY REGION" title="主行程之外，留給臨時起意的私藏清單" text="所有推薦均避開主行程既定地點；依料理類型、雨天或戶外情境快速篩選。" />
      <div className="region-tabs">
        {regions.map((entry) => <button key={entry.id} className={entry.id === regionId ? 'active' : ''} onClick={() => setRegionId(entry.id)}><span>{entry.name}</span><small>{entry.en}</small></button>)}
      </div>
      <div className="explore-toolbar">
        <div>
          <div className="eyebrow text-forest/45">{region.en.toUpperCase()} FIELD NOTES</div>
          <h3>{region.tagline}</h3>
        </div>
        <div className="view-switch">
          <button className={view === 'restaurants' ? 'active' : ''} onClick={() => setView('restaurants')}>必吃餐廳 <span>{region.restaurants.length}</span></button>
          <button className={view === 'sights' ? 'active' : ''} onClick={() => setView('sights')}>備用景點 <span>{region.sights.length}</span></button>
        </div>
      </div>
      <div className="filter-row">
        <div className="category-scroll">
          {categories.map((type) => <button key={type} className={type === category ? 'active' : ''} onClick={() => setCategory(type)}>{type}</button>)}
        </div>
        <label className="search-box"><Search size={17} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="搜尋名稱或特色" /><span className="sr-only">搜尋推薦</span></label>
      </div>
      <div className="recommendation-grid">
        {filtered.map((entry, index) => (
          <article className="recommendation-card" key={entry.name}>
            <div className="card-number">{pad(index + 1)}</div>
            <span className="type-chip">{entry.type}</span>
            <h4>{entry.name}</h4>
            <p>{entry.note}</p>
            <a href={mapUrl(entry.name)} target="_blank" rel="noreferrer"><Navigation size={15} /> 在地圖開啟</a>
          </article>
        ))}
      </div>
    </section>
  )
}

function Highlights() {
  return (
    <section id="highlights" className="section-shell scroll-mt-24">
      <SectionHeading index="03" overline="TRIP DNA" title="這趟旅程的五種質地" text="進可攻，退可守。不是只去過南島，而是在那裡生活了十一天。" />
      <div className="highlight-grid">
        {highlights.map(([number, title, text]) => <article key={number}><span>{number}</span><h3>{title}</h3><p>{text}</p></article>)}
      </div>
    </section>
  )
}

const prepCategories = [
  {
    id: 'pack',
    title: '出發前 & 打包建議',
    icon: Luggage,
    items: [
      '九月底是初春，請採洋蔥式穿搭：薄上衣、保暖中層、防風外套分層準備，方便隨時增減。',
      '南島紫外線依然很強，請帶高係數防曬乳、太陽眼鏡與帽子，尤其在雪地與水邊反光更明顯。',
      '紐西蘭入境檢疫非常嚴格，登山鞋、運動鞋底的泥土務必刷洗乾淨，絕對不要攜帶肉類或生鮮食材。',
    ],
  },
  {
    id: 'drive',
    title: '自駕須知',
    icon: Car,
    items: [
      '紐西蘭靠左行駛，轉彎、變換車道與出車位前都要先提醒自己方向感。',
      '圓環規則通常是禮讓右方來車，進入前先確認內圈車流再匯入。',
      '遇到單線橋樑請留意讓行標誌與對向來車，先確認誰有優先通行權。',
      '春季部分高山路段仍可能結冰或降雪，若行程會翻越山區，建議備妥雪鏈。',
    ],
  },
  {
    id: 'local',
    title: '當地旅遊須知',
    icon: Compass,
    items: [
      '水龍頭冷水通常可直接飲用，出門可帶水瓶節省購買瓶裝水。',
      '紐西蘭沒有普遍的小費文化，多數餐廳沒有強制加收服務費的習慣。',
      '湖畔與草地要注意沙蠅 Sandflies，建議隨身準備防蚊液，特別是傍晚時段。',
    ],
  },
  {
    id: 'activities',
    title: '特殊活動須知',
    icon: Sparkles,
    items: [
      '滑雪（9/21）：必備防水手套、雪鏡、脖圍，臉部也要做好防曬。',
      '騎馬（9/22）：務必穿長褲與包鞋，避免穿著會隨風飄揚的寬鬆衣物。',
      '峽谷噴射快艇（9/23）：峽谷風勢強又冷，請帶防風外套與能緊戴的毛帽，建議配戴墨鏡擋風。',
      '庫克山健行（9/25）：Hooker Valley Track 雖平緩，仍請採洋蔥式穿搭，帶足飲水、行動糧，並穿舒適運動鞋或輕裝登山鞋。',
      '觀星與追極光（Twizel）：夜晚接近零度，請穿最保暖的羽絨衣、毛帽與手套；可下載 Aurora App 監測 KP 值，拍照建議帶腳架並使用紅光手電筒。',
    ],
  },
]

function PreparationTips() {
  const [active, setActive] = useState('pack')
  const activeCategory = prepCategories.find((entry) => entry.id === active) || prepCategories[0]
  const Icon = activeCategory.icon

  return (
    <section id="preparation" className="section-shell scroll-mt-24">
      <SectionHeading
        index="04"
        overline="PREPARATION & TIPS"
        title="行前準備與行李指南"
        text="把出發前的提醒、駕車規則與特殊活動注意事項整理成可快速切換的閱讀區。"
      />
      <div className="prep-tabs" role="tablist" aria-label="行前準備分類">
        {prepCategories.map((entry) => {
          const EntryIcon = entry.icon
          return (
            <button
              key={entry.id}
              role="tab"
              aria-selected={entry.id === active}
              className={entry.id === active ? 'active' : ''}
              onClick={() => setActive(entry.id)}
            >
              <EntryIcon size={16} />
              <span>{entry.title}</span>
            </button>
          )
        })}
      </div>
      <article className="prep-card">
        <div className="prep-card-head">
          <div>
            <div className="eyebrow text-forest/45">CHECKLIST</div>
            <h3>{activeCategory.title}</h3>
          </div>
          <span className="prep-icon"><Icon size={24} /></span>
        </div>
        <div className="prep-list">
          {activeCategory.items.map((item) => (
            <div className="prep-item" key={item}>
              <span />
              <p>{item}</p>
            </div>
          ))}
        </div>
      </article>
    </section>
  )
}

function SectionHeading({ index, overline, title, text }) {
  return (
    <div className="section-heading">
      <div className="section-index">{index}</div>
      <div><div className="eyebrow text-forest/45">{overline}</div><h2>{title}</h2><p>{text}</p></div>
    </div>
  )
}

const navItems = [
  { id: 'home', label: '首頁', icon: Home },
  { id: 'itinerary', label: '行程', icon: CalendarDays },
  { id: 'explore', label: '探索', icon: Compass },
  { id: 'preparation', label: '準備', icon: Luggage },
  { id: 'highlights', label: '亮點', icon: Sparkles },
]

function NavigationShell() {
  const [active, setActive] = useState('home')
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
      if (visible) setActive(visible.target.id)
    }, { rootMargin: '-20% 0px -65%', threshold: [0, 0.2, 0.6] })
    navItems.forEach(({ id }) => { const el = document.getElementById(id); if (el) observer.observe(el) })
    return () => observer.disconnect()
  }, [])
  const go = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
  return (
    <>
      <aside className="sidebar">
        <button className="brand" onClick={() => go('home')} aria-label="回到首頁"><span>SN</span><div>Southern<small>Notes</small></div></button>
        <nav>{navItems.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => go(id)}><Icon size={19} /><span>{label}</span></button>)}</nav>
        <div className="sidebar-foot"><span>NZ</span><p>South Island<br />2026</p></div>
      </aside>
      <nav className="mobile-nav">{navItems.map(({ id, label, icon: Icon }) => <button className={active === id ? 'active' : ''} key={id} onClick={() => go(id)}><Icon size={20} /><span>{label}</span></button>)}</nav>
    </>
  )
}

function App() {
  return (
    <div>
      <NavigationShell />
      <main className="page">
        <section id="home" className="hero">
          <div className="hero-orb orb-one" /><div className="hero-orb orb-two" />
          <header className="mobile-header"><span className="mobile-logo">SN</span><span>南島慢旅</span><small>2026</small></header>
          <div className="hero-copy">
            <div className="eyebrow text-mint">AOTEAROA · SOUTH ISLAND</div>
            <h1>把南島的壯闊，<br /><em>走成自己的步調。</em></h1>
            <p>一份為 5 位旅人準備的慢旅行手冊。春雪、星空、湖泊與好好吃飯的十一天。</p>
            <div className="hero-meta">
              <span><CalendarDays size={17} />{tripMeta.dates}</span>
              <span><Users size={17} />{tripMeta.people}</span>
              <span><Map size={17} />{tripMeta.nights}</span>
            </div>
          </div>
          <div className="route-line" aria-label="旅程路線">
            <span>Queenstown</span><i /><span>Twizel</span><i /><span>Christchurch</span>
          </div>
        </section>
        <div className="content-wrap">
          <JourneyTracker />
          <Itinerary />
          <Explore />
          <PreparationTips />
          <Highlights />
          <footer><span className="footer-mark">SN</span><p>南島慢旅 · Southern Notes</p><small>Made for the road, 2026.</small></footer>
        </div>
      </main>
    </div>
  )
}

export default App
