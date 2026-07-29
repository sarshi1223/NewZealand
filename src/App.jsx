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
        </div>
      )}

      {status.branchDay && (
        <div className="branch-prompt">
          <div>
            <div className="eyebrow text-mint">TODAY NEEDS A BRANCH</div>
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

const prepSections = {
  pack: {
    title: '出發前 & 打包建議',
    icon: Luggage,
    intro: '九月底的南島是初春，白天和夜晚的溫差很大，山區、湖邊與城市的體感也完全不同。先把出發前的事情處理好，旅程會輕鬆很多。',
    blocks: [
      {
        title: 'NZeTA 電子簽證與 IVL 申辦（極重要）',
        lines: [
          '必須提前申請：台灣護照前往紐西蘭雖屬免簽證，但出發前必須線上申辦 NZeTA (New Zealand Electronic Travel Authority)，同時會一併強制徵收 IVL（國際遊客保育及旅遊稅）。',
          '注意事項：建議透過紐西蘭官方 App 或官方網站申辦，審核通常需要幾個工作天，千萬不要拖到機場才臨時抱佛腳！取得後建議將 PDF 存於手機或印出紙本備用。',
        ],
      },
      {
        title: '應對一天四季：洋蔥式穿搭法',
        lines: [
          '九月底的紐西蘭南島正值初春，日夜溫差極大，且山區與平地氣候迥異。請務必採用「洋蔥式穿搭」：',
          '內層（吸濕排汗）：建議穿著輕薄的排汗衫或發熱衣（推薦美麗諾羊毛材質，保暖且防臭）。',
          '中層（保暖蓄熱）：準備抓絨衣 (Fleece) 或輕薄的羽絨背心，方便在車內或室內隨時穿脫。',
          '外層（防風防水）：一件高係數的防風防水外套 (如 Gore-Tex) 是南島旅行的靈魂，能完美抵禦湖畔與峽谷的強風。',
        ],
      },
      {
        title: '防曬警告：不可輕忽的紫外線',
        lines: [
          '紐西蘭上空的臭氧層較薄，空氣極度純淨，這意味著紫外線（UV）直射非常強烈。即使氣溫只有 10 度，曝曬 15 分鐘也可能嚴重曬傷。',
          '必備清單：SPF 50+ 高係數防曬乳、具備抗 UV 功能的太陽眼鏡（雪地與湖面反光極強，沒戴墨鏡會非常刺眼）、寬沿遮陽帽。',
        ],
      },
      {
        title: '海關檢疫：全球最嚴格的生物安全防線',
        lines: [
          '紐西蘭對生態保護極度重視，海關檢疫非常嚴格，違規將面臨 $400 NZD 以上的立即罰款。',
          '裝備清潔：所有戶外裝備（尤其是登山鞋、運動鞋底、帳篷）務必在台灣就「徹底刷洗乾淨」，不得殘留任何泥土或植物種子。',
          '違禁品：絕對禁止攜帶任何肉類製品（包含泡麵內的肉塊）、生鮮蔬果、蜂蜜與乳製品。若有攜帶個人常備藥品，請保留原包裝與英文處方箋並誠實申報。',
        ],
      },
    ],
  },
  drive: {
    title: '自駕須知',
    icon: Car,
    intro: '南島的風景一半在路上。把交通規則讀懂，才能把心力留給山、湖與沿途轉彎後的驚喜。',
    blocks: [
      {
        title: '右駕與靠左行駛：顛覆直覺的挑戰',
        lines: [
          '紐西蘭為右駕國家，車輛必須「靠左行駛」。',
          '口訣：「駕駛座永遠靠近道路中線」。在轉彎、從停車場駛出、或是在沒有標線的鄉間小路時，副駕駛請務必隨時出聲提醒「靠左、靠左」。雨刷與方向燈的位置通常與台灣相反，請保持耐心。',
        ],
      },
      {
        title: '圓環 (Roundabout) 的絕對規則',
        lines: [
          '紐西蘭極少紅綠燈，多以圓環梳理交通。',
          '最高原則：「絕對禮讓右方來車」。在進入圓環前必須減速甚至停車，確認右側無車後才能駛入內圈。離開圓環前，請務必提早打「左轉燈」提醒後方車輛。',
        ],
      },
      {
        title: '單線橋樑 (One-lane bridge) 讓行邏輯',
        lines: [
          '南島郊區有非常多只能容納一輛車通過的單線橋樑。',
          '看懂號誌：上橋前請注意讓行標誌。如果你的方向是「藍底白色大箭頭」，代表你有優先權；如果你的方向是「紅圈黑色小箭頭」，代表你必須停車，禮讓對向車輛全數通過後才能上橋。',
        ],
      },
      {
        title: '春季路況與雪鏈 (Snow Chains)',
        lines: [
          '雖然已是春天，但在清晨穿越高山隘口（如 Crown Range Road）時，路面仍可能出現肉眼看不見的「黑冰 (Black Ice)」，極易打滑。請保持安全車距，避免急煞。若遇突發大雪，請遵照租車公司指示於規定路段安裝雪鏈。',
        ],
      },
    ],
  },
  local: {
    title: '當地旅遊須知',
    icon: Compass,
    intro: '這些看起來很小，但真的會影響每天的旅行流暢度。先把習慣和規則理解好，就不容易在現場手忙腳亂。',
    blocks: [
      {
        title: '飲水與餐飲文化',
        lines: [
          '水質純淨，多數水龍頭的「冷水」可直接生飲（熱水不可）；紐西蘭無強制小費文化，無需額外計算服務費。',
        ],
      },
      {
        title: '防範南島特產：沙蠅 (Sandflies)',
        lines: [
          '峽灣、西海岸或湖畔草地常有沙蠅，被咬會奇癢無比。防護重點：穿著淺色長袖長褲、減少皮膚裸露、遠離靜止水域，並務必塗抹含有 DEET 或強效配方的防蚊液。',
        ],
      },
      {
        title: '電源插座與電壓',
        lines: [
          '電壓為 230/240V，插座為八字形三扁腳插頭（與澳洲相同），請攜帶萬國轉接頭。',
        ],
      },
      {
        title: '超市採購與環保',
        lines: [
          '大型超市（Pak\'nSave, Countdown/Woolworths, New World）極度普及。當地重視環保，結帳時幾乎不提供免費塑膠袋，請自備環保袋。買酒務必帶護照查驗年齡。',
        ],
      },
      {
        title: '自助加油文化',
        lines: [
          '南島郊區多為自助。先停車、加油、記住加油機號碼 (Pump Number)，再到店內告知店員號碼並用信用卡（需預先開通預借現金 PIN 碼）結帳。',
        ],
      },
      {
        title: '網路與通訊',
        lines: [
          '建議在機場購買 Spark / One NZ 實體卡或 eSIM。山區訊號較弱，建議提前下載離線 Google Maps。',
        ],
      },
    ],
  },
  activities: {
    title: '特殊活動須知',
    icon: Sparkles,
    activities: [
      {
        id: 'ski',
        label: '卓越山脈春季滑雪 (9/21)',
        body: [
          '初春雪場特性與氣候：9 月底南島正值初春尾聲，山下可能春意盎然，但海拔近 2,000 公尺的 The Remarkables 雪場仍覆蓋厚雪。初春午後氣溫升高，雪質容易由硬雪轉為濕軟的「奶油雪 (Slush)」，滑行阻力增加，需特別注意重心調整。',
          '裝備防護與穿搭：高海拔紫外線經純白雪地反射後威力驚人，專業雪鏡 (Goggles) 是絕對剛需（不可用一般太陽眼鏡替代，否則側邊漏光易導致雪盲）。手套必須具備 100% 防水機能；臉部與頸部請使用高係數防水防曬乳並搭配防風脖圍 (Buff)，防止紫外線灼傷與高山強風凍傷。',
        ],
      },
      {
        id: 'horse',
        label: '魔戒河谷騎馬涉水 (9/22)',
        body: [
          '地形與人文背景：活動地點通常位於《魔戒》三部曲中壯麗的勒林頓 (Glenorchy) 箭河或 Dart River 河谷。這裡保留了純粹的毛利與拓荒者牧場風情，河谷地形開闊但風勢強勁。',
          '安全紀律與服裝規範：褲裝：務必穿著具彈性的厚長褲（絕對禁止穿短褲或裙子），否則在大腿與馬鞍長時間摩擦下，不到半小時就會破皮流血。',
          '安全紀律與服裝規範：鞋履：必須穿著完全包覆腳趾的包鞋或靴子，鞋跟需有一定防滑性，防止雙腳在行進間滑出馬鐙。',
          '安全紀律與服裝規範：禁忌：上半身衣物必須合身，嚴禁穿著寬鬆、下擺會隨風狂飄的雨衣或風衣，這極容易在空中發出聲響並驚嚇到敏感的馬匹。涉水時河水冰冷，鞋褲有微濕的心理準備。',
        ],
      },
      {
        id: 'jetboat',
        label: '峽谷噴射快艇 (9/23)',
        body: [
          '物理特性與刺激感：Shotover River 狹窄深邃，快艇駕駛會以高達 85 公里時速在僅有幾公尺寬的岩壁間進行 360 度急轉彎與甩尾（Spin）。',
          '極端防風與防寒對策：快艇高速行駛產生的強風，會讓初春的 10 度氣溫瞬間降至體感零下。活動方會提供救生衣與防水罩衫，但你自身內部必須穿著防風防水外套。強烈建議配戴能緊緊包覆頭部、絕不會被時速 85 公里強風吹走的緊身保暖毛帽，並準備一副運動墨鏡，防止冷風與水花強力拍打眼睛導致視線模糊。',
        ],
      },
      {
        id: 'cook',
        label: '庫克山 Hooker Valley Track 健行 (9/25)',
        body: [
          '高山微氣候與步道特徵：胡克山谷步道全長來回約 10 公里，沿途會經過三座高空懸吊索橋、冰河湖與壯麗雪山。庫克山區屬於典型的高山海洋性氣候，氣象預報常常失準，上一秒豔陽高照、下一秒山谷瞬間吹起狂風暴雨是家常便飯。',
          '裝備與能量補給：外層防護：洋蔥式穿搭的最外層必須是具備防風與防水機能的硬殼衣 (Hard Shell / Gore-Tex)。',
          '裝備與能量補給：鞋款：建議穿著抓地力強、具備防水功能的輕裝登山鞋或戶外健行鞋，步道雖鋪設完善但部分路段仍有碎石與泥濘。',
          '裝備與能量補給：補給：背包內必須攜帶至少 1-2 公升的飲水以及高熱量行動糧（如巧克力、能量棒、堅果），在高海拔與強風環境下消耗的熱量極大，隨時補充能有效預防低溫症。',
        ],
      },
      {
        id: 'twizel',
        label: '特威澤爾觀星與追極光',
        body: [
          '南極光科學認知：南極光 (Aurora Australis) 在中低緯度多呈現微弱的綠光、垂直光柱或地平線暈光，肉眼色彩通常不如北極圈鮮明。相機或手機長時間曝光能捕捉到相片中的震撼紅綠光，請建立正確期待。',
          '暗空保護區禮儀與紅光規定：Twizel 位於 Aoraki Mackenzie 國際黑暗天空保護區。在現場賞星時，全場絕對嚴禁使用手機白光或強烈手電筒亂照，這會瞬間破壞眾人辛苦累積的夜視力。所有尋路與操作器材的燈光，一律必須切換為「紅光模式」或用紅色玻璃紙包覆。',
          '極端低溫生存法則：深夜經常逼近 0 度甚至零下，守候極光需要長時間靜止站立。請穿上最厚重的羽絨衣、發熱衣、毛帽、雙層防風手套與高筒保暖鞋。',
          '攝影實戰設定：必須攜帶穩固的相機或手機腳架；手機開啟夜間長曝光模式（3-30秒）；相機使用大光圈手動對焦無限遠，白平衡設在 3500K 呈現乾淨夜空。',
        ],
      },
      {
        id: 'skyline',
        label: '皇后鎮天際纜車與 Luge 溜溜車 (Day 3)',
        body: [
          '纜車體驗： Skyline Gondola 是南半球最陡的纜車之一，隨著爬升，瓦卡蒂普湖與卓越山脈的壯闊全景盡收眼底。山頂風大較平地寒冷，建議備妥防風外套。',
          'Luge 溜溜車安全守則：這是一種無動力、靠地心引力下滑的刺激滑車。操控方式極為直覺（拉桿往後是煞車、往前是放鬆）。初次遊玩者強制規定必須選擇新手賽道 (Beginner Track)，過彎時務必遵守現場號誌與減速指示，且全程必須確實扣好安全帽帶。',
        ],
      },
      {
        id: 'onsen',
        label: 'Onsen Hot Pools 半露天溫泉 (Day 4)',
        body: [
          '沉浸式隱密景觀：皇后鎮頂級的半露天木造私人溫泉池，正對著壯麗的蕭托over河谷與懸崖峭壁，是融合自然與隱私的極致享受。',
          '注意事項：必須自備泳衣（男女皆須著裝）；店家會提供毛巾與礦泉水。由於高山泉水與初春氣候較為乾燥，泡湯結束後皮膚容易感到乾澀，建議隨身攜帶保濕乳液或身體乳滋潤。',
        ],
      },
      {
        id: 'steam',
        label: 'TSS 恩斯洛百年蒸汽船 (Day 5 - 休閒組)',
        body: [
          '百年工藝與湖上巡遊：建於 1912 年的 TSS Earnslaw 是南半球唯一仍在營運的燃煤百年蒸汽船，享有「湖中女王」的美譽。船艙內保留了復古的木造結構與巨大的運轉活塞機械，乘客甚至可以走到鍋爐房觀看工人鏟煤。',
          '氣溫與風向：航行於瓦卡蒂普湖單程約 45 分鐘。坐在室內船艙溫暖舒適，但若走到戶外甲板欣賞湖景，湖面風勢非常強勁寒冷，務必穿著防風外套與戴上毛帽。',
        ],
      },
    ],
  },
}

const packingChecklist = [
  {
    title: '證件與金錢類',
    items: [
      'NZeTA 電子簽證與 IVL 證明（強烈建議提前線上申辦並列印/儲存）',
      '護照正本（效期需在回國後 6 個月以上）',
      '國際駕照與台灣駕照正本',
      '信用卡（至少 2 張，需開通預借現金 PIN 碼供自助加油使用）',
      '紐西蘭幣現金（少量備用）',
      '機票與住宿預訂確認單',
    ],
  },
  {
    title: '電子與攝影類',
    items: [
      '澳紐規八字型三孔轉接頭 / 萬國轉接頭',
      '行動電源（限隨身行李）',
      '相機 / 手機腳架（星空攝影必備）',
      '充電線與多孔充電頭',
    ],
  },
  {
    title: '衣物與穿搭類（9月底初春）',
    items: [
      '吸濕排汗內層 / 發熱衣（約 3-4 套）',
      '保暖中層（抓絨衣、羽絨背心）',
      '防風防水外套 (Gore-Tex)',
      '彈性長褲（騎馬與健行用，禁止短褲）',
      '舒適好走的運動鞋或輕裝登山鞋',
      '禦寒配件：毛帽、厚手套、脖圍/圍巾',
    ],
  },
  {
    title: '藥品與個人防護類',
    items: [
      '個人常備藥品（保留原包裝）',
      '高係數防曬乳 (SPF 50+)',
      '抗 UV 太陽眼鏡',
      '強效防蚊液（含 DEET/Picaridin，對抗沙蠅）',
      '保濕乳液 / 護唇膏',
    ],
  },
  {
    title: '強烈建議補充的隨身好物',
    items: [
      '紅光手電筒（觀星與暗空保護區必備，保護夜視力）',
      '保溫瓶（隨時補充熱水，應對 10 度以下低溫）',
      '暖暖包（長時間戶外滑雪與觀星時極度好用）',
      '隨身小背包（健行與快艇時攜帶隨身物品）',
      '專業雪鏡與防水滑雪手套（滑雪日專用）',
    ],
  },
]

function PreparationTips() {
  const [active, setActive] = useState('pack')
  const [activeActivity, setActiveActivity] = useState('ski')
  const [checked, setChecked] = useState({})
  const section = prepSections[active] || prepSections.pack
  const activities = prepSections.activities.activities
  const activeActivityData = activities.find((entry) => entry.id === activeActivity) || activities[0]
  const SectionIcon = section.icon
  const ActivityIcon = Sparkles

  const toggleItem = (groupIndex, itemIndex) => {
    const key = `${groupIndex}-${itemIndex}`
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  return (
    <section id="preparation" className="section-shell scroll-mt-24">
      <SectionHeading
        index="04"
        overline="PREPARATION & TIPS"
        title="行前準備與行李指南"
        text="以頂級旅行社旅遊手冊的方式，分章節呈現出發前提醒、當地須知、活動專頁與行李清單。"
      />

      <div className="prep-shell">
        <div className="prep-main">
          <div className="prep-tabs" role="tablist" aria-label="行前準備分類">
            {Object.entries(prepSections).map(([id, entry]) => {
              const EntryIcon = entry.icon
              return (
                <button
                  key={id}
                  role="tab"
                  aria-selected={id === active}
                  className={id === active ? 'active' : ''}
                  onClick={() => setActive(id)}
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
                <div className="eyebrow text-forest/45">PRE-DEPARTURE GUIDE</div>
                <h3>{section.title}</h3>
              </div>
              <span className="prep-icon"><SectionIcon size={24} /></span>
            </div>
            <div className="prep-copy">
              {section.intro && <p className="prep-intro">{section.intro}</p>}
              {section.blocks && section.blocks.map((block, index) => (
                <details key={block.title} className="prep-block" open={index === 0}>
                  <summary>{block.title}</summary>
                  <div>
                    {block.lines.map((line) => <p key={line}>{line}</p>)}
                  </div>
                </details>
              ))}
              {active === 'activities' && (
                <>
                  <div className="prep-activities-head">
                    <div className="eyebrow text-forest/45">ACTIVITIES GUIDE</div>
                    <h4>特殊活動詳細指南</h4>
                  </div>
                  <div className="prep-tabs prep-tabs-compact" role="tablist" aria-label="活動子分頁">
                    {activities.map((entry) => (
                      <button
                        key={entry.id}
                        role="tab"
                        aria-selected={entry.id === activeActivity}
                        className={entry.id === activeActivity ? 'active' : ''}
                        onClick={() => setActiveActivity(entry.id)}
                      >
                        <span>{entry.label}</span>
                      </button>
                    ))}
                  </div>
                  <div className="prep-activity">
                    <div className="prep-activity-head">
                      <h4>{activeActivityData.label}</h4>
                    </div>
                    {activeActivityData.body.map((line) => <p key={line}>{line}</p>)}
                    <div className="prep-note">
                      <strong>補充提醒</strong>
                      <p>若遇強風、降雨、山區結冰或能見度驟降，請以現場安全規範與活動單位指示為先，活動當天也建議依體感與天氣微調裝備層次。</p>
                    </div>
                  </div>
                </>
              )}
            </div>
          </article>

          <article className="prep-card prep-checklist">
            <div className="prep-card-head">
              <div>
                <div className="eyebrow text-forest/45">PACKING CHECKLIST</div>
                <h3>互動式行李打包勾選清單</h3>
              </div>
              <span className="prep-icon"><Luggage size={24} /></span>
            </div>

            <div className="checklist-grid">
              {packingChecklist.map((group, groupIndex) => (
                <section key={group.title} className="checklist-group">
                  <h4>{group.title}</h4>
                  {group.items.map((item, itemIndex) => {
                    const key = `${groupIndex}-${itemIndex}`
                    const isChecked = Boolean(checked[key])
                    return (
                      <label key={item} className={`check-item ${isChecked ? 'checked' : ''}`}>
                        <input type="checkbox" checked={isChecked} onChange={() => toggleItem(groupIndex, itemIndex)} />
                        <span>{item}</span>
                      </label>
                    )
                  })}
                </section>
              ))}
            </div>
          </article>
        </div>
      </div>
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
  { id: 'tracker', label: '追蹤', icon: Clock3 },
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
            <a className="hero-cta" href="#tracker"><Clock3 size={16} />即時追蹤 Live Tracker</a>
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
