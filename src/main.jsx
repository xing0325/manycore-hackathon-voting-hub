import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { isConfigured, supabase } from './supabase'
import './styles.css'

const base = import.meta.env.BASE_URL

function Icon({ children }) {
  return <span className="icon" aria-hidden="true">{children}</span>
}

function Toast({ message }) {
  return message ? <div className="toast" role="status">{message}</div> : null
}

function normalizeName(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('zh-CN')
}

function accountEmail(name) {
  const bytes = new TextEncoder().encode(normalizeName(name))
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `u-${hex}@manycore.vote`
}

function AuthPanel({ session, onToast }) {
  const [name, setName] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState('login')
  const [busy, setBusy] = useState(false)

  async function submitAccount(event) {
    event.preventDefault()
    const cleanName = name.trim().replace(/\s+/g, ' ')
    if (!supabase || cleanName.length < 2) return onToast('请输入至少 2 个字符的本名')
    if (password.length < 6) return onToast('密码至少需要 6 位')
    setBusy(true)
    const email = accountEmail(cleanName)

    if (mode === 'register') {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: cleanName, normalized_name: normalizeName(cleanName), account_kind: 'manycore_name_password' } },
      })
      if (error) {
        setBusy(false)
        return onToast(error.message.includes('already') ? '这个本名已经注册' : error.message)
      }
      if (data.user?.identities?.length === 0) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        setBusy(false)
        return onToast(loginError ? '这个本名已经注册，请使用原密码登录' : '账号已存在，已为你登录')
      }
      if (!data.session) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password })
        if (loginError) { setBusy(false); return onToast(loginError.message) }
      }
      setBusy(false)
      onToast('注册成功，已自动登录')
      return
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    onToast(error ? '本名或密码不正确' : '登录成功')
  }

  if (session) {
    return (
      <div className="account-chip">
        <span className="status-dot" />
        <span>{session.user.user_metadata?.display_name || '参赛者'}</span>
        <button onClick={() => supabase.auth.signOut()}>退出</button>
      </div>
    )
  }

  return (
    <form className="auth-form" onSubmit={submitAccount}>
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="本名" autoComplete="username" required />
      <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="密码（至少 6 位）" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required />
      <button className="button small" disabled={busy}>{busy ? '处理中…' : mode === 'login' ? '登录' : '注册'}</button>
      <button className="auth-switch" type="button" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>{mode === 'login' ? '注册账号' : '返回登录'}</button>
    </form>
  )
}

function ProjectModal({ project, onClose }) {
  if (!project) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        <img src={project.cover_url || `${base}assets/hosted-b752385f33d6181e.jpg`} alt="" />
        <div className="modal-body">
          <span className="tag">{project.track}</span>
          <h2>{project.name}</h2>
          <p className="lead">{project.tagline}</p>
          <p>{project.description}</p>
          <div className="teamline">团队：{project.team_name}</div>
          <div className="links">
            {project.repo_url && <a href={project.repo_url} target="_blank" rel="noreferrer">GitHub 仓库 ↗</a>}
            {project.video_url && <a href={project.video_url} target="_blank" rel="noreferrer">演示视频 ↗</a>}
            {project.deck_url && <a href={project.deck_url} target="_blank" rel="noreferrer">查看 PPT ↗</a>}
          </div>
        </div>
      </article>
    </div>
  )
}

function Gallery({ projects, session, selected, setSelected, submitVotes, loading, onOpen, onToast }) {
  const [query, setQuery] = useState('')
  const [track, setTrack] = useState('全部')
  const tracks = ['全部', ...new Set(projects.map((p) => p.track).filter(Boolean))]
  const visible = projects.filter((p) => {
    const text = `${p.name} ${p.team_name} ${p.tagline} ${p.description}`.toLowerCase()
    return (track === '全部' || p.track === track) && text.includes(query.toLowerCase())
  })

  function toggle(id) {
    if (selected.includes(id)) return setSelected(selected.filter((item) => item !== id))
    if (selected.length === 3) return onToast('每位观众最多选择 3 个作品')
    setSelected([...selected, id])
  }

  return (
    <>
      <section className="hero">
        <div>
          <p className="eyebrow">2025 AI × 空间计算黑客松</p>
          <h1>作品展厅<br /><span>投出你的三票</span></h1>
          <p>登录后选择三个不同项目，一次提交，结果立即进入实时榜单。</p>
        </div>
        <div className="vote-console">
          <div className="console-top"><span>YOUR BALLOT</span><strong>{selected.length}/3</strong></div>
          <div className="vote-slots">
            {[0, 1, 2].map((i) => {
              const item = projects.find((p) => p.id === selected[i])
              return <div className={item ? 'slot filled' : 'slot'} key={i}>{item ? item.name : `选择第 ${i + 1} 票`}</div>
            })}
          </div>
          <button className="button wide" disabled={!session || selected.length !== 3 || loading} onClick={submitVotes}>
            {!session ? '请先登录后投票' : loading ? '提交中…' : '确认提交三票'}
          </button>
        </div>
      </section>

      <section className="toolbar">
        <div className="filters">{tracks.map((item) => <button key={item} className={track === item ? 'active' : ''} onClick={() => setTrack(item)}>{item}</button>)}</div>
        <label className="search"><Icon>⌕</Icon><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索项目、团队或技术…" /></label>
      </section>

      <section className="project-grid">
        {visible.map((project) => {
          const chosen = selected.includes(project.id)
          return (
            <article className={chosen ? 'project-card selected' : 'project-card'} key={project.id}>
              <button className="cover" onClick={() => onOpen(project)}>
                <img src={project.cover_url || `${base}assets/hosted-b752385f33d6181e.jpg`} alt={`${project.name} 封面`} />
                <span className="vote-count">▲ {project.vote_count || 0}</span>
              </button>
              <div className="card-body">
                <div className="card-meta"><span className="tag">{project.track}</span><span>{project.team_name}</span></div>
                <h3 onClick={() => onOpen(project)}>{project.name}</h3>
                <p>{project.tagline}</p>
                <div className="card-actions">
                  <button className={chosen ? 'vote chosen' : 'vote'} onClick={() => toggle(project.id)}>{chosen ? '✓ 已选择' : '+ 投一票'}</button>
                  <button className="ghost" onClick={() => onOpen(project)}>查看详情</button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
    </>
  )
}

function Submission({ session, onSubmitted, onToast }) {
  const [busy, setBusy] = useState(false)

  async function submit(event) {
    event.preventDefault()
    if (!session) return onToast('请先登录，再提交作品')
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const stamp = Date.now()
    const root = `${session.user.id}/${stamp}`
    let coverUrl = ''
    let deckUrl = ''

    for (const [field, file] of [['cover', form.get('cover')], ['deck', form.get('deck')]]) {
      if (!(file instanceof File) || !file.size) continue
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `${root}/${field}-${cleanName}`
      const { error } = await supabase.storage.from('project-assets').upload(path, file, { upsert: false })
      if (error) { setBusy(false); return onToast(error.message) }
      const { data } = supabase.storage.from('project-assets').getPublicUrl(path)
      if (field === 'cover') coverUrl = data.publicUrl
      if (field === 'deck') deckUrl = data.publicUrl
    }

    const { error } = await supabase.from('projects').insert({
      owner_id: session.user.id,
      name: form.get('name'), team_name: form.get('team'), track: form.get('track'),
      tagline: form.get('tagline'), description: form.get('description'),
      repo_url: form.get('repo_url') || null, video_url: form.get('video_url') || null,
      cover_url: coverUrl || null, deck_url: deckUrl || null,
    })
    setBusy(false)
    if (error) return onToast(error.message)
    event.currentTarget.reset()
    onToast('作品提交成功，已进入展厅')
    onSubmitted()
  }

  return (
    <section className="form-page">
      <div className="section-heading"><p className="eyebrow">SUBMIT PROJECT</p><h1>作品提交申报</h1><p>代码仓库和演示视频保存链接；封面与 PPT 上传至 Supabase Storage。</p></div>
      {!session && <div className="notice">请先在页面顶部使用邮箱登录。</div>}
      <form className="submission-form" onSubmit={submit}>
        <div className="two"><label>作品名称<input name="name" required /></label><label>团队名称<input name="team" required /></label></div>
        <div className="two"><label>赛道<select name="track"><option>空间智能</option><option>实时渲染</option><option>生成式 AI</option><option>开放创新</option></select></label><label>一句话亮点<input name="tagline" required /></label></div>
        <label>项目介绍<textarea name="description" rows="6" required /></label>
        <div className="two"><label>GitHub 仓库 URL<input name="repo_url" type="url" placeholder="https://github.com/…" /></label><label>演示视频 URL<input name="video_url" type="url" placeholder="B站 / YouTube / Drive" /></label></div>
        <div className="two"><label className="upload">项目封面<input name="cover" type="file" accept="image/*" /><small>JPG / PNG / WebP</small></label><label className="upload">项目 PPT<input name="deck" type="file" accept=".pdf,.ppt,.pptx" /><small>PDF / PPT / PPTX</small></label></div>
        <button className="button wide" disabled={!session || busy}>{busy ? '正在上传并提交…' : '提交作品'}</button>
      </form>
    </section>
  )
}

function Leaderboard({ projects }) {
  const ranked = [...projects].sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))
  return (
    <section className="leaderboard-page">
      <div className="section-heading"><p className="eyebrow">LIVE RANKING</p><h1>全场人气实时榜单</h1><p>榜单自动读取 Supabase 中的有效选票。</p></div>
      <div className="podium">
        {ranked.slice(0, 3).map((p, index) => <div className={`podium-card rank-${index + 1}`} key={p.id}><span>#{index + 1}</span><img src={p.cover_url || `${base}assets/hosted-b752385f33d6181e.jpg`} alt="" /><h3>{p.name}</h3><strong>{p.vote_count || 0} 票</strong></div>)}
      </div>
      <div className="rank-list">{ranked.map((p, index) => <div className="rank-row" key={p.id}><b>{String(index + 1).padStart(2, '0')}</b><span>{p.name}<small>{p.team_name} · {p.track}</small></span><strong>{p.vote_count || 0}</strong></div>)}</div>
    </section>
  )
}

function App() {
  const [page, setPage] = useState('gallery')
  const [session, setSession] = useState(null)
  const [projects, setProjects] = useState([])
  const [selected, setSelected] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [message, setMessage] = useState('')

  const toast = useCallback((text) => {
    setMessage(text)
    window.clearTimeout(window.__toastTimer)
    window.__toastTimer = window.setTimeout(() => setMessage(''), 3500)
  }, [])

  const loadProjects = useCallback(async () => {
    if (!supabase) return
    const { data, error } = await supabase.rpc('get_leaderboard')
    if (error) toast(error.message)
    else setProjects(data || [])
    setLoading(false)
  }, [toast])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    loadProjects()
    const timer = window.setInterval(loadProjects, 10000)
    return () => { listener.subscription.unsubscribe(); window.clearInterval(timer) }
  }, [loadProjects])

  async function submitVotes() {
    if (!session) return toast('请先登录')
    setLoading(true)
    const { error } = await supabase.rpc('submit_ballot', { project_ids: selected })
    if (error) toast(error.message)
    else { toast('投票成功，感谢参与！'); setSelected([]) }
    await loadProjects()
  }

  const nav = useMemo(() => [
    ['gallery', '◇', '作品展厅'], ['submit', '＋', '提交作品'], ['leaderboard', '▥', '实时榜单'],
  ], [])

  return (
    <div className="app-shell">
      <header>
        <button className="brand" onClick={() => setPage('gallery')}><img src={`${base}assets/hosted-622882c9e1bd6021.png`} alt="ManyCore" /><span>ManyCore<br /><small>HACKATHON HUB</small></span></button>
        <AuthPanel session={session} onToast={toast} />
      </header>
      {!isConfigured && <div className="config-error">Supabase 环境变量尚未配置。</div>}
      <main>
        {page === 'gallery' && <Gallery {...{ projects, session, selected, setSelected, submitVotes, loading, onOpen: setModal, onToast: toast }} />}
        {page === 'submit' && <Submission session={session} onSubmitted={() => { loadProjects(); setPage('gallery') }} onToast={toast} />}
        {page === 'leaderboard' && <Leaderboard projects={projects} />}
      </main>
      <nav>{nav.map(([key, icon, label]) => <button className={page === key ? 'active' : ''} onClick={() => { setPage(key); window.scrollTo({ top: 0, behavior: 'smooth' }) }} key={key}><Icon>{icon}</Icon><span>{label}</span></button>)}</nav>
      <ProjectModal project={modal} onClose={() => setModal(null)} />
      <Toast message={message} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
