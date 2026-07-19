// 假資料：高保真原型用。金額以該旅程主幣別整數表示。

export const CATEGORIES = {
  flight:    { label: '機票',   color: 'var(--cat-hotel)', icon: 'plane' },
  hotel:     { label: '住宿',   color: 'var(--cat-hotel)', icon: 'bed' },
  transport: { label: '交通',   color: 'var(--cat-transport)', icon: 'train' },
  food:      { label: '餐飲',   color: 'var(--cat-food)', icon: 'utensils' },
  ticket:    { label: '門票',   color: 'var(--cat-ticket)', icon: 'ticket' },
  shopping:  { label: '購物',   color: 'var(--cat-shopping)', icon: 'bag' },
  souvenir:  { label: '伴手禮', color: 'var(--cat-souvenir)', icon: 'gift' },
  sim:       { label: '網卡',   color: 'var(--cat-sim)', icon: 'wifi' },
  other:     { label: '其他',   color: 'var(--cat-other)', icon: 'dots' },
}

// 行程分類（時間軸用）
export const ITIN_CAT = {
  sight:     { label: '景點', color: 'var(--cat-sight)', icon: 'camera' },
  food:      { label: '餐廳', color: 'var(--cat-food)', icon: 'utensils' },
  transport: { label: '交通', color: 'var(--cat-transport)', icon: 'train' },
  shopping:  { label: '購物', color: 'var(--cat-shopping)', icon: 'bag' },
  hotel:     { label: '住宿', color: 'var(--cat-hotel)', icon: 'bed' },
}

export const STATUS = {
  planning:  { label: '規劃中', color: 'var(--planning)',  soft: 'var(--planning-soft)' },
  ongoing:   { label: '進行中', color: 'var(--ongoing)',   soft: 'var(--ongoing-soft)' },
  completed: { label: '已完成', color: 'var(--completed)', soft: 'var(--completed-soft)' },
}

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`

export const trips = [
  {
    id: 'kyoto',
    name: '京都・大阪輕旅行',
    country: '日本',
    city: '京都・大阪',
    cover: img('photo-1493976040374-85c8e12f0c0e'),
    gradient: 'linear-gradient(150deg, #C2410C 0%, #E8743B 55%, #D9A03A 100%)',
    start: '2026-06-12',
    end: '2026-06-16',
    days: 5,
    status: 'ongoing',
    currentDay: 3,
    favorite: true,
    archived: false,
    currency: 'JPY',
    sym: '¥',
    budget: 250000,
    spent: 138400,
    companions: 2,
    weather: { tmp: 27, cond: '多雲時晴', hi: 29, lo: 22, icon: 'cloud-sun' },
    stats: { doneItin: 11, places: 18, photos: 64 },
  },
  {
    id: 'seoul',
    name: '首爾美食週末',
    country: '韓國',
    city: '首爾',
    cover: img('photo-1538485399081-7191377e8241'),
    gradient: 'linear-gradient(150deg, #2F6E8F 0%, #3E7C5A 60%, #7Fae8f 100%)',
    start: '2026-09-19',
    end: '2026-09-22',
    days: 4,
    status: 'planning',
    favorite: false,
    archived: false,
    currency: 'KRW',
    sym: '₩',
    budget: 900000,
    spent: 120000,
    companions: 1,
    weather: { tmp: 24, cond: '晴', hi: 26, lo: 18, icon: 'sun' },
    stats: { doneItin: 0, places: 7, photos: 0 },
  },
  {
    id: 'sydney',
    name: '雪梨跨年',
    country: '澳洲',
    city: '雪梨',
    cover: img('photo-1506973035872-a4ec16b8e8d9'),
    gradient: 'linear-gradient(150deg, #8C6BB1 0%, #C2410C 70%, #E8743B 100%)',
    start: '2025-12-29',
    end: '2026-01-02',
    days: 5,
    status: 'completed',
    favorite: false,
    archived: false,
    currency: 'AUD',
    sym: '$',
    budget: 3200,
    spent: 3010,
    companions: 3,
    weather: { tmp: 26, cond: '晴朗', hi: 28, lo: 19, icon: 'sun' },
    stats: { doneItin: 14, places: 22, photos: 180 },
  },
]

// 京都行程時間軸（節錄重點，含一處時間衝突示意）
export const itinerary = {
  kyoto: {
    1: [
      { id: 'k1a', start: '08:30', end: '12:00', cat: 'transport', title: '關西機場 → 京都', loc: 'HARUKA 特急', note: '已購 ICOCA & HARUKA 套票', est: 3600, act: 3600, rating: 0 },
      { id: 'k1b', start: '13:00', end: '14:00', cat: 'hotel', title: '飯店寄放行李 Check-in', loc: '京都站前 Vischio Hotel', note: '14:00 後才能正式入住', est: 0, act: 0, rating: 0 },
      { id: 'k1c', start: '14:30', end: '17:30', cat: 'sight', title: '清水寺 & 二年坂散步', loc: '清水寺', note: '夕陽時段人最多，提早去', est: 500, act: 500, rating: 5 },
      { id: 'k1d', start: '18:30', end: '20:00', cat: 'food', title: '晚餐 — 京町家割烹', loc: '祇園 ぎをん 山乃尾', note: '已訂位 2 人', est: 16000, act: 14800, rating: 5 },
    ],
    2: [
      { id: 'k2a', start: '08:00', end: '09:00', cat: 'food', title: '早餐 — % Arabica 咖啡', loc: '嵐山店', note: '河畔座位', est: 1400, act: 1400, rating: 4 },
      { id: 'k2b', start: '09:30', end: '12:00', cat: 'sight', title: '嵐山竹林 & 渡月橋', loc: '嵐山', note: '', est: 0, act: 0, rating: 5 },
      { id: 'k2c', start: '11:30', end: '13:00', cat: 'sight', title: '天龍寺庭園', loc: '天龍寺', note: '與竹林時段重疊，需調整', est: 500, act: 0, rating: 0 },
      { id: 'k2d', start: '14:00', end: '16:30', cat: 'shopping', title: '錦市場掃街', loc: '錦市場', note: '伴手禮 & 漬物', est: 5000, act: 6200, rating: 4 },
    ],
    3: [
      { id: 'k3a', start: '09:00', end: '11:30', cat: 'sight', title: '伏見稻荷大社千本鳥居', loc: '伏見稻荷', note: '建議爬到四つ辻看夜景前的景', est: 0, act: 0, rating: 5 },
      { id: 'k3b', start: '12:30', end: '13:30', cat: 'food', title: '午餐 — 鰻魚飯', loc: 'うなぎ 京都きんぶん', note: '', est: 4800, act: 4500, rating: 4 },
      { id: 'k3c', start: '15:00', end: '18:00', cat: 'transport', title: '京都 → 大阪 移動', loc: '京阪本線', note: '換大阪難波住宿', est: 420, act: 420, rating: 0 },
    ],
    4: [
      { id: 'k4a', start: '10:00', end: '14:00', cat: 'sight', title: '大阪環球影城 USJ', loc: 'USJ', note: '已購快速通關', est: 9800, act: 9800, rating: 5 },
      { id: 'k4b', start: '18:00', end: '20:30', cat: 'food', title: '道頓堀章魚燒 & 串炸', loc: '道頓堀', note: '', est: 4000, act: 0, rating: 0 },
    ],
    5: [
      { id: 'k5a', start: '09:00', end: '11:00', cat: 'shopping', title: '心齋橋最後採買', loc: '心齋橋筋', note: '藥妝 & 伴手禮', est: 12000, act: 0, rating: 0 },
      { id: 'k5b', start: '12:30', end: '15:30', cat: 'transport', title: '難波 → 關西機場 → 賦歸', loc: '南海電鐵 ラピート', note: '', est: 1450, act: 0, rating: 0 },
    ],
  },
}

// 京都記帳
export const expenses = {
  kyoto: [
    { id: 'e1', date: '2026-06-01', cat: 'flight', title: '台北⇄關西 來回機票', amt: 42000, loc: '長榮航空' },
    { id: 'e2', date: '2026-06-05', cat: 'hotel', title: '京都+大阪 4 晚住宿', amt: 48000, loc: 'Booking' },
    { id: 'e3', date: '2026-06-05', cat: 'sim', title: 'eSIM 8 日無限', amt: 1200, loc: 'Airalo' },
    { id: 'e4', date: '2026-06-12', cat: 'transport', title: 'HARUKA + ICOCA', amt: 3600, loc: '關西機場' },
    { id: 'e5', date: '2026-06-12', cat: 'ticket', title: '清水寺拜觀料', amt: 500, loc: '清水寺' },
    { id: 'e6', date: '2026-06-12', cat: 'food', title: '祇園割烹晚餐', amt: 14800, loc: '山乃尾', payer: 'me', split: ['me', 'c1', 'c2'] },
    { id: 'e7', date: '2026-06-13', cat: 'food', title: '% Arabica + 午餐', amt: 3200, loc: '嵐山' },
    { id: 'e8', date: '2026-06-13', cat: 'shopping', title: '錦市場伴手禮', amt: 6200, loc: '錦市場', payer: 'c1', split: ['me', 'c1'] },
    { id: 'e9', date: '2026-06-14', cat: 'food', title: '伏見稻荷鰻魚飯', amt: 4500, loc: 'きんぶん' },
    { id: 'e10', date: '2026-06-14', cat: 'transport', title: '京阪電車 + 地鐵', amt: 1400, loc: '京都→大阪' },
    { id: 'e11', date: '2026-06-14', cat: 'ticket', title: 'USJ 門票 x2', amt: 9800, loc: 'USJ', payer: 'c2', split: ['me', 'c1', 'c2'] },
  ],
}

// 預算分級警示
export const BUDGET_ALERTS = [
  { level: 50, label: '已使用一半', color: 'var(--amber)' },
  { level: 85, label: '即將超支', color: 'var(--danger)' },
  { level: 100, label: '已超支', color: 'var(--danger)' },
]

export const getTrip = (id) => trips.find((t) => t.id === id)

// ---- 行前準備 ----
export const PREP_PRIORITY = {
  high: { label: '高', color: 'var(--danger)' },
  mid: { label: '中', color: 'var(--amber)' },
  low: { label: '低', color: 'var(--muted)' },
}
export const PACK_CATS = {
  documents: { label: '證件', icon: 'journal' },
  clothing: { label: '衣物', icon: 'bag' },
  electronics: { label: '電子', icon: 'wifi' },
  toiletries: { label: '盥洗', icon: 'sparkles' },
  medicine: { label: '藥品', icon: 'plus' },
}

const pk = (cat, text, done = false) => ({ id: 't' + Math.random().toString(36).slice(2, 8), cat, text, done })

// 新旅程的起手範本
export const prepTemplate = () => ({
  todo: [
    { id: pk().id, text: '確認護照效期（六個月以上）', priority: 'high', due: '', done: false },
    { id: pk().id, text: '投保旅遊保險', priority: 'mid', due: '', done: false },
    { id: pk().id, text: '換匯 / 準備外幣', priority: 'mid', due: '', done: false },
  ],
  packing: [
    pk('documents', '護照'), pk('clothing', '換洗衣物'),
    pk('electronics', '充電器 / 行動電源'), pk('toiletries', '盥洗用品'), pk('medicine', '常備藥'),
  ],
  shopping: [],
})

// ---- 同行者 ----
export const ME = { id: 'me', name: '我', color: 'var(--primary)' }
export const companions = {
  kyoto: [
    { id: 'c1', name: '小美', color: '#3E7C5A', contact: 'LINE: meimei' },
    { id: 'c2', name: '阿哲', color: '#2F6E8F', contact: '0912-345-678' },
  ],
}

// ---- 相簿 ----
const PG = [
  'linear-gradient(160deg, #C2410C, #E8743B)',
  'linear-gradient(160deg, #2F6E8F, #3E7C5A)',
  'linear-gradient(160deg, #D9A03A, #C77B1E)',
  'linear-gradient(160deg, #8C6BB1, #C2410C)',
  'linear-gradient(160deg, #3E7C5A, #7FAE8F)',
  'linear-gradient(160deg, #B5557E, #E8743B)',
]
export const photos = {
  kyoto: [
    { id: 'ph1', day: 1, ar: '4 / 5', cap: '清水寺舞台的黃昏', loc: '清水寺', gradient: PG[0], url: 'https://images.unsplash.com/photo-1545569341-9eb8b30979d9?auto=format&fit=crop&w=600&q=70' },
    { id: 'ph2', day: 1, ar: '3 / 4', cap: '二年坂石板路', loc: '二年坂', gradient: PG[2], url: '' },
    { id: 'ph3', day: 1, ar: '1 / 1', cap: '祇園的夜', loc: '祇園', gradient: PG[3], url: '' },
    { id: 'ph4', day: 2, ar: '3 / 4', cap: '嵐山竹林小徑', loc: '嵐山', gradient: PG[4], url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=600&q=70' },
    { id: 'ph5', day: 2, ar: '5 / 4', cap: '渡月橋', loc: '嵐山', gradient: PG[1], url: '' },
    { id: 'ph6', day: 2, ar: '1 / 1', cap: '錦市場的玉子燒', loc: '錦市場', gradient: PG[2], url: '' },
    { id: 'ph7', day: 3, ar: '3 / 5', cap: '千本鳥居', loc: '伏見稻荷', gradient: PG[0], url: '' },
    { id: 'ph8', day: 3, ar: '1 / 1', cap: '鰻魚飯', loc: 'きんぶん', gradient: PG[2], url: '' },
    { id: 'ph9', day: 4, ar: '5 / 4', cap: '環球影城', loc: 'USJ', gradient: PG[5], url: '' },
    { id: 'ph10', day: 4, ar: '3 / 4', cap: '道頓堀的霓虹', loc: '道頓堀', gradient: PG[3], url: '' },
    { id: 'ph11', day: 5, ar: '1 / 1', cap: '心齋橋最後採買', loc: '心齋橋', gradient: PG[1], url: '' },
  ],
}
export const PHOTO_GRADIENTS = PG

// ---- 機票 ----
export const flights = {
  kyoto: [
    { id: 'f1', dir: 'outbound', airline: '長榮航空', no: 'BR132', date: '2026-06-12', dep: '08:55', depAp: 'TPE 桃園', arr: '12:35', arrAp: 'KIX 關西', terminal: 'T1', seat: '34A / 34B', baggage: '23kg × 2' },
    { id: 'f2', dir: 'return', airline: '長榮航空', no: 'BR131', date: '2026-06-16', dep: '13:40', depAp: 'KIX 關西', arr: '15:35', arrAp: 'TPE 桃園', terminal: 'T2', seat: '28C / 28D', baggage: '23kg × 2' },
  ],
}

// ---- 住宿 ----
export const stays = {
  kyoto: [
    { id: 'h1', name: 'Vischio Kyoto by GRANVIA', address: '京都市下京区東塩小路町', phone: '+81 75-341-0700', bookingNo: 'BK-583921', checkin: '2026-06-12', checkout: '2026-06-15', price: 36000, url: 'https://www.granvia-kyoto.co.jp' },
    { id: 'h2', name: 'OMO7 大阪 by 星野集團', address: '大阪市浪速区恵美須西', phone: '+81 6-1234-5678', bookingNo: 'BK-771203', checkin: '2026-06-15', checkout: '2026-06-16', price: 12000, url: '' },
  ],
}

// ---- 地點庫 ----
export const PLACE_TYPE = {
  sight: { label: '景點', icon: 'camera', color: 'var(--cat-sight)' },
  food: { label: '餐廳', icon: 'utensils', color: 'var(--cat-food)' },
  cafe: { label: '咖啡', icon: 'coffee', color: 'var(--cat-shopping)' },
  mall: { label: '商場', icon: 'bag', color: 'var(--cat-hotel)' },
}
export const PLACE_TAG = {
  must: { label: '必去', color: 'var(--danger)', soft: 'var(--danger-soft)' },
  alt: { label: '替代', color: 'var(--planning)', soft: 'var(--planning-soft)' },
  done: { label: '已完成', color: 'var(--accent)', soft: 'var(--accent-soft)' },
}
// type → 行程分類
export const PLACE_TO_ITIN = { sight: 'sight', food: 'food', cafe: 'food', mall: 'shopping' }

export const places = {
  kyoto: [
    { id: 'pl1', type: 'sight', tag: 'done', name: '清水寺', rating: 5, note: '二年坂、三年坂一路逛上去', maps: 'https://maps.google.com/?q=清水寺' },
    { id: 'pl2', type: 'sight', tag: 'must', name: '伏見稻荷大社', rating: 5, note: '千本鳥居建議早上去人少', maps: 'https://maps.google.com/?q=伏見稻荷大社' },
    { id: 'pl3', type: 'sight', tag: 'must', name: '嵐山竹林', rating: 5, note: '渡月橋一起排', maps: '' },
    { id: 'pl4', type: 'food', tag: 'done', name: '祇園 山乃尾', rating: 5, note: '京町家割烹，已訂位', maps: '' },
    { id: 'pl5', type: 'food', tag: 'must', name: 'うなぎ きんぶん', rating: 4, note: '伏見稻荷附近鰻魚飯', maps: '' },
    { id: 'pl6', type: 'cafe', tag: 'must', name: '% Arabica 嵐山', rating: 4, note: '河畔座位，會排隊', maps: '' },
    { id: 'pl7', type: 'mall', tag: 'done', name: '錦市場', rating: 4, note: '伴手禮、漬物、玉子燒', maps: '' },
    { id: 'pl8', type: 'mall', tag: 'must', name: '心齋橋筋', rating: 4, note: '藥妝、最後採買', maps: '' },
  ],
}

// ---- 旅遊日誌 ----
export const MOODS = [
  { v: 1, emoji: '😞', label: '低落' },
  { v: 2, emoji: '😕', label: '普通' },
  { v: 3, emoji: '🙂', label: '還行' },
  { v: 4, emoji: '😄', label: '開心' },
  { v: 5, emoji: '🤩', label: '超棒' },
]

export const journal = {
  kyoto: [
    { id: 'j1', date: '2026-06-12', title: '抵達京都，清水寺的黃昏', mood: 5,
      content: '# Day 1\n\n搭 HARUKA 進京都，放完行李直奔**清水寺**。\n\n- 二年坂的店家很好逛\n- 晚餐祇園割烹超讚\n\n夕陽下的清水舞台真的值得。' },
    { id: 'j2', date: '2026-06-13', title: '嵐山與錦市場', mood: 4,
      content: '早上去 **嵐山竹林**，人潮比想像多。\n\n午後到 *錦市場* 掃街，買了不少漬物跟伴手禮。' },
    { id: 'j3', date: '2026-06-14', title: '千本鳥居', mood: 5,
      content: '**伏見稻荷** 的千本鳥居一路爬，腿很痠但超值得。\n\n下午移動到大阪，晚上吃道頓堀。' },
  ],
}

export const prep = {
  kyoto: {
    todo: [
      { id: 'td1', text: '申請 Visit Japan Web', priority: 'high', due: '2026-06-10', done: true },
      { id: 'td2', text: '換日幣現金 ¥50,000', priority: 'high', due: '2026-06-08', done: true },
      { id: 'td3', text: '旅遊保險投保', priority: 'mid', due: '2026-06-09', done: true },
      { id: 'td4', text: '山乃尾割烹訂位', priority: 'high', due: '2026-05-20', done: true },
      { id: 'td5', text: 'USJ 快速通關購買', priority: 'mid', due: '2026-06-01', done: false },
      { id: 'td6', text: '手機加入 Suica（西瓜卡）', priority: 'low', due: '2026-06-11', done: false },
    ],
    packing: [
      pk('documents', '護照', true), pk('documents', '機票電子檔', true), pk('documents', '飯店訂房證明'),
      pk('clothing', '薄外套', true), pk('clothing', '換洗衣物 x5'), pk('clothing', '好走的鞋'),
      pk('electronics', '行動電源', true), pk('electronics', '萬國轉接頭'), pk('electronics', '相機'),
      pk('toiletries', '牙刷組'), pk('toiletries', '隱形眼鏡', true),
      pk('medicine', '常備藥'), pk('medicine', '腸胃藥'),
    ],
    shopping: [
      { id: 'sh1', name: '白色戀人', qty: 2, price: 1500, done: false },
      { id: 'sh2', name: '抹茶 KitKat', qty: 5, price: 1200, done: true },
      { id: 'sh3', name: '資生堂藥妝', qty: 1, price: 8000, done: false },
      { id: 'sh4', name: 'Royce 生巧克力', qty: 3, price: 2400, done: false },
    ],
  },
}
