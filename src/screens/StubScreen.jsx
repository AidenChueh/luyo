import { useEffect, useState } from 'react'
import Icon from '../components/Icon'
import { useStore } from '../store'
import { getTheme, applyTheme } from '../lib/theme'
import { getApiKey, setApiKey } from '../lib/ai'
import { getProfile, setProfile, getPrefs, setPrefs, CURRENCY_OPTIONS } from '../lib/settings'
import { pickImage } from '../lib/image'

const Group = ({ title, children }) => (
  <div className="pad section set-group">
    <div className="set-group-title">{title}</div>
    <div className="card set-card">{children}</div>
  </div>
)

const Toggle = ({ on }) => <span className={`toggle ${on ? 'on' : ''}`} aria-hidden="true"><i /></span>

export default function StubScreen() {
  const { reset } = useStore()
  const [installEvt, setInstallEvt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [theme, setTheme] = useState(getTheme())
  const toggleTheme = () => { const t = theme === 'dark' ? 'light' : 'dark'; applyTheme(t); setTheme(t) }

  const [profile, setProfileState] = useState(getProfile())
  const [editing, setEditing] = useState(false)
  const [draftName, setDraftName] = useState(profile.name)
  const [draftAvatar, setDraftAvatar] = useState(profile.avatar)
  const startEdit = () => { setDraftName(profile.name); setDraftAvatar(profile.avatar); setEditing(true) }
  const saveProfile = () => {
    const next = { name: draftName.trim() || profile.name, avatar: draftAvatar }
    setProfile(next); setProfileState((p) => ({ ...p, ...next })); setEditing(false)
  }

  const [prefs, setPrefsState] = useState(getPrefs())
  const updatePref = (patch) => { setPrefs(patch); setPrefsState((p) => ({ ...p, ...patch })) }

  const [aiKey, setAiKey] = useState(getApiKey())
  const [keySaved, setKeySaved] = useState(!!getApiKey())
  const saveKey = () => { setApiKey(aiKey.trim()); setKeySaved(!!aiKey.trim()) }
  const clearKey = () => { setApiKey(''); setAiKey(''); setKeySaved(false) }

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setInstallEvt(e) }
    const onInstalled = () => { setInstalled(true); setInstallEvt(null) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    if (window.matchMedia?.('(display-mode: standalone)').matches) setInstalled(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  const doReset = () => {
    if (confirm('重設為範例資料？目前在記帳新增的紀錄會被清除。')) reset()
  }
  const doInstall = async () => {
    if (!installEvt) { alert('此瀏覽器可從網址列 / 選單的「安裝」或「加入主畫面」安裝。'); return }
    installEvt.prompt()
    await installEvt.userChoice
    setInstallEvt(null)
  }

  return (
    <div className="scroll">
      <header className="topbar solid"><h1>我的</h1></header>

      <div className="pad section" style={{ marginTop: 6 }}>
        <div className="card profile-card">
          <span className="profile-avatar" style={{ background: (editing ? draftAvatar : profile.avatar) ? `center/cover url(${editing ? draftAvatar : profile.avatar})` : 'var(--primary)' }}>
            {!(editing ? draftAvatar : profile.avatar) && ((editing ? draftName : profile.name)?.[0] || '?')}
          </span>
          {editing ? (
            <div style={{ flex: 1, minWidth: 0 }}>
              <input className="profile-name-input" value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder="你的名字" autoFocus />
              <div className="row" style={{ gap: 8, marginTop: 10 }}>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => pickImage(setDraftAvatar)}><Icon name="image" size={16} /> 換頭像</button>
                {draftAvatar && <button className="btn btn-ghost" onClick={() => setDraftAvatar('')}>移除</button>}
              </div>
              <div className="row" style={{ gap: 8, marginTop: 8 }}>
                <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveProfile}><Icon name="check" size={16} /> 儲存</button>
                <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setEditing(false)}>取消</button>
              </div>
            </div>
          ) : (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="profile-name">{profile.name}</div>
                <div className="muted" style={{ fontSize: 12.5 }}>個人資料 · 本機儲存</div>
              </div>
              <button className="iconbtn ghost" onClick={startEdit} aria-label="編輯個人資料"><Icon name="dots" size={18} /></button>
            </>
          )}
        </div>
      </div>

      <Group title="外觀">
        <button className="set-row" onClick={toggleTheme} role="switch" aria-checked={theme === 'dark'}>
          <span className="set-ic"><Icon name={theme === 'dark' ? 'moon' : 'sun'} size={18} /></span>
          <span className="set-label">深色模式</span>
          <Toggle on={theme === 'dark'} />
        </button>
      </Group>

      <Group title="偏好">
        <div className="set-row">
          <span className="set-ic"><Icon name="wallet" size={18} /></span>
          <span className="set-label">新旅程預設幣別</span>
          <select className="set-select" value={prefs.currency} onChange={(e) => updatePref({ currency: e.target.value })}>
            {CURRENCY_OPTIONS.map((c) => <option key={c.code} value={c.code}>{c.code}</option>)}
          </select>
        </div>
        <button className="set-row" onClick={() => updatePref({ notifications: !prefs.notifications })} role="switch" aria-checked={prefs.notifications}>
          <span className="set-ic"><Icon name="bell" size={18} /></span>
          <span className="set-label">通知<span className="muted" style={{ fontWeight: 500, fontSize: 11.5, display: 'block' }}>首頁鈴鐺提醒（站內）</span></span>
          <Toggle on={prefs.notifications} />
        </button>
      </Group>

      {/* API key 設定暫時收起（AI 功能目前一律走範例生成）。aiKey/saveKey/clearKey
          與 lib/ai.js 的 getApiKey/setApiKey 都保留，要開啟時把這段註解拿掉即可。
      <Group title="AI">
        <div style={{ padding: 16 }}>
          <div className="field" style={{ marginTop: 0 }}>
            <label>Anthropic API key</label>
            <input type="password" value={aiKey} onChange={(e) => setAiKey(e.target.value)} placeholder="sk-ant-..." style={{ width: '100%' }} />
          </div>
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn btn-primary" style={{ flex: 1 }} onClick={saveKey}><Icon name="check" size={16} /> 儲存</button>
            <button className="btn btn-ghost" style={{ flex: 1 }} onClick={clearKey}>清除</button>
          </div>
          <p className="muted" style={{ fontSize: 11.5, lineHeight: 1.6, marginTop: 8 }}>
            {keySaved ? '已啟用 Claude 生成。' : '目前使用範例生成。'}
            <br />
            ⚠ key 只存在這台裝置的瀏覽器，會直接從前端呼叫 Anthropic API，有外洩與費用風險，僅建議個人 demo 使用。
          </p>
        </div>
      </Group>
      */}

      <Group title="資料與 App">
        {installed ? (
          <div className="set-row" style={{ cursor: 'default' }}>
            <span className="set-ic" style={{ color: 'var(--accent)' }}><Icon name="check" size={18} /></span>
            <span className="set-label">已安裝為 App</span>
          </div>
        ) : (
          <button className="set-row" onClick={doInstall}>
            <span className="set-ic"><Icon name="download" size={18} /></span>
            <span className="set-label">安裝到主畫面</span>
            <Icon name="chevronRight" size={17} style={{ color: 'var(--muted)' }} />
          </button>
        )}
        <button className="set-row" onClick={doReset}>
          <span className="set-ic" style={{ color: 'var(--danger)' }}><Icon name="copy" size={18} /></span>
          <span className="set-label" style={{ color: 'var(--danger)' }}>重設為範例資料</span>
        </button>
      </Group>

      <Group title="關於">
        <div className="set-row" style={{ cursor: 'default' }}>
          <span className="set-ic"><Icon name="sparkles" size={18} /></span>
          <span className="set-label">luyo<span className="muted" style={{ fontWeight: 500, fontSize: 11.5, display: 'block' }}>個人旅遊規劃 · 原型 v1.24</span></span>
        </div>
      </Group>

      <p className="pad muted" style={{ fontSize: 11.5, lineHeight: 1.6, paddingBottom: 8 }}>
        所有設定與資料僅存在這台裝置的瀏覽器，未上傳雲端。
      </p>
    </div>
  )
}
