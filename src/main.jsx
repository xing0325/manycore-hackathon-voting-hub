import React, { useCallback, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { isConfigured, supabase } from './supabase'
import './styles.css'

const base = import.meta.env.BASE_URL
const demoCards = {
  '11111111-1111-4111-8111-111111111111': ['示例卡片 · 作品怎么提交', '占位示例：队名、作品名、GitHub 和 PPT 都是必填项。', '这是教学用占位卡片，不代表真实参赛作品。每个参赛组限提交一份作品，提交后只能编辑自己的作品。'],
  '22222222-2222-4222-8222-222222222222': ['示例卡片 · GitHub + PPT', '占位示例：仓库填 URL，PPT 上传到本平台。', '这是教学用占位卡片：GitHub 仓库必须填写，PPT 必须上传，视频链接可选。'],
  '33333333-3333-4333-8333-333333333333': ['示例卡片 · 视频链接可选', '占位示例：演示视频可以留空，提交后仍可编辑。', '这是教学用占位卡片：赛道支持自定义，也可以填写“其他”。'],
  '44444444-4444-4444-8444-444444444444': ['示例卡片 · 没有封面也可以', '占位示例：不上传封面时自动生成群核海报封面。', '这是教学用占位卡片：封面可选，缺少封面时系统会使用群核海报并叠加作品名。'],
}

function decorateProject(project) {
  const demo = demoCards[project.id]
  return demo ? { ...project, name: demo[0], tagline: demo[1], description: demo[2], cover_url: null, is_demo: true, vote_count: 0 } : project
}

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

async function accountCredential(name, teamName) {
  const value = `${normalizeName(name)}::${normalizeName(teamName)}::manycore-identity-v2`
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  const hex = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('')
  return `mc-${hex}-A9!`
}

function AuthPanel({ session, onToast }) {
  const [name, setName] = useState('')
  const [teamName, setTeamName] = useState('')
  const [busy, setBusy] = useState(false)

  async function submitAccount(event) {
    event.preventDefault()
    const cleanName = name.trim().replace(/\s+/g, ' ')
    const cleanTeamName = teamName.trim().replace(/\s+/g, ' ')
    if (!supabase || cleanName.length < 2) return onToast('请输入至少 2 个字符的本名')
    if (cleanTeamName.length < 2) return onToast('请输入至少 2 个字符的组名')
    setBusy(true)
    const email = accountEmail(cleanName)
    const credential = await accountCredential(cleanName, cleanTeamName)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: credential })
    if (!error) {
      const savedTeam = data.user?.user_metadata?.team_name || ''
      if (normalizeName(savedTeam) !== normalizeName(cleanTeamName)) {
        await supabase.auth.signOut()
        setBusy(false)
        return onToast('本名或组名不正确')
      }
      setBusy(false)
      return onToast('登录成功')
    }

    const { data: created, error: signupError } = await supabase.auth.signUp({
      email,
      password: credential,
      options: { data: { display_name: cleanName, team_name: cleanTeamName, normalized_name: normalizeName(cleanName), normalized_team_name: normalizeName(cleanTeamName), account_kind: 'manycore_name_password' } },
    })
    if (signupError) {
      setBusy(false)
      return onToast(signupError.message.includes('already') ? '这个本名已经注册，请使用原组名进入' : signupError.message)
    }
    if (created.user?.identities?.length === 0) {
      setBusy(false)
      return onToast('这个本名已经注册，请使用原组名进入')
    }
    if (!created.session) {
      const { error: loginError } = await supabase.auth.signInWithPassword({ email, password: credential })
      if (loginError) { setBusy(false); return onToast(loginError.message) }
    }
    setBusy(false)
    onToast('已创建账号并进入系统')
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
      <input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="组名" autoComplete="organization" required />
      <button className="button small" disabled={busy}>{busy ? '进入中…' : '进入系统'}</button>
    </form>
  )
}

function ProjectModal({ project, onClose }) {
  if (!project) return null
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <article className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={onClose}>×</button>
        {project.cover_url ? <img src={project.cover_url} alt="" /> : <div className="fallback-cover"><img src={`${base}assets/hosted-622882c9e1bd6021.png`} alt="" /><strong>{project.name}</strong></div>}
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
    if (projects.find((project) => project.id === id)?.is_demo) return onToast('这是提交说明示例，不参与投票')
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
                {project.cover_url ? <img src={project.cover_url} alt={`${project.name} 封面`} /> : <div className="fallback-cover"><img src={`${base}assets/hosted-622882c9e1bd6021.png`} alt="" /><strong>{project.name}</strong></div>}
                <span className="vote-count">▲ {project.vote_count || 0}</span>
              </button>
              <div className="card-body">
                <div className="card-meta"><span className="tag">{project.track}</span><span>{project.team_name}</span></div>
                <h3 onClick={() => onOpen(project)}>{project.name}</h3>
                <p>{project.tagline}</p>
                <div className="card-actions">
                  <button className={chosen ? 'vote chosen' : 'vote'} disabled={project.is_demo} onClick={() => toggle(project.id)}>{project.is_demo ? '教学示例 · 不参与投票' : chosen ? '✓ 已选择' : '+ 投一票'}</button>
                  <button className="ghost" onClick={() => onOpen(project)}>查看详情</button>
                </div>
              </div>
            </article>
          )
        })}
      </section>
      {visible.length === 0 && <div className="notice">暂时没有作品。参赛组可以先到“提交作品”页面上传唯一作品。</div>}
    </>
  )
}

function Submission({ session, onSubmitted, onToast }) {
  const [busy, setBusy] = useState(false)
  const [existing, setExisting] = useState(null)
  const [loadingExisting, setLoadingExisting] = useState(Boolean(session))

  useEffect(() => {
    let active = true
    if (!session || !supabase) { setExisting(null); setLoadingExisting(false); return () => { active = false } }
    setLoadingExisting(true)
    supabase.from('projects').select('*').eq('owner_id', session.user.id).order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data, error }) => { if (active) { if (error) onToast(error.message); setExisting(data || null); setLoadingExisting(false) } })
    return () => { active = false }
  }, [session, onToast])

  async function submit(event) {
    event.preventDefault()
    if (!session) return onToast('请先登录，再提交作品')
    setBusy(true)
    const form = new FormData(event.currentTarget)
    const teamName = String(form.get('team') || '').trim().replace(/\s+/g, ' ')
    const { data: teamProjects, error: teamLookupError } = await supabase.from('projects').select('id, team_name, owner_id').not('owner_id', 'is', null)
    if (teamLookupError) { setBusy(false); return onToast(teamLookupError.message) }
    const sameTeam = (teamProjects || []).find((project) => project.id !== existing?.id && normalizeName(project.team_name) === normalizeName(teamName))
    if (sameTeam) { setBusy(false); return onToast('这个组已经提交过作品，只能编辑原作品') }
    const stamp = Date.now()
    const root = `${session.user.id}/${stamp}`
    let coverUrl = ''
    let deckUrl = ''

    for (const [field, file] of [['cover', form.get('cover')], ['deck', form.get('deck')]]) {
      if (field === 'deck' && existing && (!(file instanceof File) || !file.size) && existing.deck_url) continue
      if (!(file instanceof File) || !file.size) continue
      const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `${root}/${field}-${cleanName}`
      const { error } = await supabase.storage.from('project-assets').upload(path, file, { upsert: false })
      if (error) { setBusy(false); return onToast(error.message) }
      const { data } = supabase.storage.from('project-assets').getPublicUrl(path)
      if (field === 'cover') coverUrl = data.publicUrl
      if (field === 'deck') deckUrl = data.publicUrl
    }

    const payload = {
      owner_id: session.user.id,
      name: form.get('name'), team_name: teamName, track: form.get('track') || '其他',
      tagline: form.get('tagline'), description: form.get('description'),
      repo_url: form.get('repo_url') || null, video_url: form.get('video_url') || null,
      cover_url: coverUrl || existing?.cover_url || null, deck_url: deckUrl || existing?.deck_url || null,
    }
    const { error } = existing
      ? await supabase.from('projects').update({ name: payload.name, team_name: payload.team_name, track: payload.track, tagline: payload.tagline, description: payload.description, repo_url: payload.repo_url, video_url: payload.video_url, cover_url: payload.cover_url, deck_url: payload.deck_url, updated_at: new Date().toISOString() }).eq('id', existing.id).eq('owner_id', session.user.id)
      : await supabase.from('projects').insert(payload)
    setBusy(false)
    if (error) return onToast(error.message)
    event.currentTarget.reset()
    onToast(existing ? '作品已更新' : '作品提交成功，已进入展厅')
    onSubmitted()
  }

  return (
    <section className="form-page">
      <div className="section-heading"><p className="eyebrow">SUBMIT PROJECT</p><h1>作品提交申报</h1><p className="limit-note">每个参赛组限提交 1 份作品。{existing ? '你正在编辑本组已提交的作品，不能新建第二份。' : '提交后如需修改，只能编辑自己之前的作品。'}</p><p>代码仓库和演示视频保存链接；封面与 PPT 上传至 Supabase Storage。</p></div>
      {!session && <div className="notice">请先在页面顶部使用本名和组名进入系统。</div>}
      {session && loadingExisting && <div className="notice">正在检查本组已有作品…</div>}
      <form className="submission-form" key={existing?.id || 'new'} onSubmit={submit}>
        <div className="two"><label>作品名称 *<input name="name" defaultValue={existing?.name || ''} required /></label><label>团队名称 *<input name="team" defaultValue={existing?.team_name || session?.user?.user_metadata?.team_name || ''} required /></label></div>
        <div className="two"><label>赛道（可自定义）<input name="track" list="track-options" defaultValue={existing?.track || ''} placeholder="填写赛道或选择常用项" /><datalist id="track-options"><option value="空间智能" /><option value="实时渲染" /><option value="生成式 AI" /><option value="其他" /></datalist></label><label>一句话亮点<input name="tagline" defaultValue={existing?.tagline || ''} required /></label></div>
        <label>项目介绍<textarea name="description" rows="6" defaultValue={existing?.description || ''} required /></label>
        <div className="two"><label>GitHub 仓库 URL *<input name="repo_url" type="url" defaultValue={existing?.repo_url || ''} placeholder="https://github.com/…" required /></label><label>演示视频 URL（可选）<input name="video_url" type="url" defaultValue={existing?.video_url || ''} placeholder="B站 / YouTube / Drive" /></label></div>
        <div className="two"><label className="upload">项目封面（可选）<input name="cover" type="file" accept="image/*" /><small>不上传时自动使用群核海报 + 作品名称</small></label><label className="upload">项目 PPT *<input name="deck" type="file" accept=".pdf,.ppt,.pptx" required={!existing} /><small>{existing?.deck_url ? '已有 PPT；重新选择可替换' : 'PDF / PPT / PPTX，必填'}</small></label></div>
        <button className="button wide" disabled={!session || busy || loadingExisting}>{busy ? '正在上传并保存…' : existing ? '保存我的作品修改' : '提交我的唯一作品'}</button>
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
        {ranked.slice(0, 3).map((p, index) => <div className={`podium-card rank-${index + 1}`} key={p.id}><span>#{index + 1}</span>{p.cover_url ? <img src={p.cover_url} alt="" /> : <div className="fallback-cover"><img src={`${base}assets/hosted-622882c9e1bd6021.png`} alt="" /></div>}<h3>{p.name}</h3><strong>{p.vote_count || 0} 票</strong></div>)}
      </div>
      <div className="rank-list">{ranked.map((p, index) => <div className="rank-row" key={p.id}><b>{String(index + 1).padStart(2, '0')}</b><span>{p.name}<small>{p.team_name} · {p.track}</small></span><strong>{p.vote_count || 0}</strong></div>)}</div>
    </section>
  )
}

function LoginGate({ onToast }) {
  return (
    <section className="login-page">
      <div className="login-card">
        <img src={`${base}assets/hosted-622882c9e1bd6021.png`} alt="ManyCore" />
        <p className="eyebrow">MANYCORE HACKATHON</p>
        <h1>先登录，再提交作品</h1>
        <p>请输入姓名和组名。每个本名只能创建一个账号；登录后默认进入作品提交页。</p>
        <AuthPanel session={null} onToast={onToast} />
      </div>
    </section>
  )
}

function App() {
  const [page, setPage] = useState('submit')
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
    else setProjects((data || []).map(decorateProject))
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
    if (selected.some((id) => demoCards[id])) return toast('教学示例不参与投票，请选择真实参赛作品')
    setLoading(true)
    const { error } = await supabase.rpc('submit_ballot', { project_ids: selected })
    if (error) toast(error.message)
    else { toast('投票成功，感谢参与！'); setSelected([]) }
    await loadProjects()
  }

  return (
    <div className="app-shell">
      {session && <header>
        <button className="brand" onClick={() => setPage('gallery')}><img src={`${base}assets/hosted-622882c9e1bd6021.png`} alt="ManyCore" /><span>ManyCore<br /><small>HACKATHON HUB</small></span></button>
        <AuthPanel session={session} onToast={toast} />
      </header>}
      {!isConfigured && <div className="config-error">Supabase 环境变量尚未配置。</div>}
      <main>
        {!session && <LoginGate onToast={toast} />}
        {session && page === 'gallery' && <Gallery {...{ projects, session, selected, setSelected, submitVotes, loading, onOpen: setModal, onToast: toast }} />}
        {session && page === 'submit' && <Submission session={session} onSubmitted={() => { loadProjects(); setPage('submit') }} onToast={toast} />}
      </main>
      {session && <nav>{[['submit', '＋', '提交作品'], ['gallery', '◇', '作品展厅']].map(([key, icon, label]) => <button className={page === key ? 'active' : ''} onClick={() => { setPage(key); window.scrollTo({ top: 0, behavior: 'smooth' }) }} key={key}><Icon>{icon}</Icon><span>{label}</span></button>)}</nav>}
      <ProjectModal project={modal} onClose={() => setModal(null)} />
      <Toast message={message} />
    </div>
  )
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
