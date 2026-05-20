import { useEffect, useMemo, useState } from 'react'
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hammer,
  History,
  Layers3,
  Plus,
  Save,
  Search,
  Shield,
  SlidersHorizontal,
  Trash2,
  XCircle,
} from 'lucide-react'
import './App.css'

type ItemId = 'ram7' | 'ammo556'
type Status = 'Dalam Proses' | 'Selesai' | 'Dibatalkan'
type Resources = Record<string, number>

type CraftLine = {
  id: number
  itemId: ItemId
  quantity: number
}

type Session = {
  id: number
  name: string
  createdAt: string
  status: Status
  cancelNote?: string
  lines: CraftLine[]
  resources: Resources
}

type PendingFinalization = {
  status: Exclude<Status, 'Dalam Proses'>
  cancelNote: string
}

const recipes: Record<
  ItemId,
  {
    name: string
    unit: string
    accent: string
    image: string
    description: string
    output?: string
    resources: Resources
  }
> = {
  ram7: {
    name: 'RAM-7',
    unit: 'senjata',
    accent: 'weapon',
    image: '/resource/ram7.svg',
    description: 'Assault rifle illegal crafting',
    resources: {
      'Blueprint RAM-7': 1,
      'Gun Oil': 3,
      Gold: 10,
      Emerald: 10,
      Steel: 15,
      Silver: 15,
      'Olahan Kayu': 20,
      Copper: 20,
    },
  },
  ammo556: {
    name: 'Ammo 5.56x45',
    unit: 'peluru',
    accent: 'ammo',
    image: '/resource/ammo-556.svg',
    description: '1 craft clip menghasilkan 45 peluru',
    output: '45 peluru per craft',
    resources: {
      'Gun Powder': 1,
      'Blueprint 5.56x45MM': 1,
      Gold: 5,
      'Olahan Kayu': 8,
      Silver: 15,
      Iron: 15,
      Copper: 20,
    },
  },
}

const resourceImages: Record<string, string> = {
  'Blueprint RAM-7': '/resource/blueprint.svg',
  'Blueprint 5.56x45MM': '/resource/blueprint.svg',
  'Gun Oil': '/resource/gun-oil.svg',
  Gold: '/resource/gold.svg',
  Emerald: '/resource/emerald.svg',
  Steel: '/resource/steel.svg',
  Silver: '/resource/silver.svg',
  'Olahan Kayu': '/resource/wood.svg',
  Copper: '/resource/copper.svg',
  'Gun Powder': '/resource/gun-powder.svg',
  Iron: '/resource/iron.svg',
}

const initialLines: CraftLine[] = [
  { id: 1, itemId: 'ram7', quantity: 5 },
  { id: 2, itemId: 'ammo556', quantity: 900 },
]

const initialSessions: Session[] = [
  {
    id: 101,
    name: 'Restock markas minggu ini',
    createdAt: '2026-05-20T08:30:00.000Z',
    status: 'Dalam Proses',
    lines: initialLines,
    resources: {
      'Blueprint RAM-7': 5,
      'Gun Oil': 15,
      Gold: 150,
      Emerald: 50,
      Steel: 75,
      Silver: 375,
      'Olahan Kayu': 260,
      Copper: 500,
      'Gun Powder': 20,
      'Blueprint 5.56x45MM': 20,
      Iron: 300,
    },
  },
  {
    id: 102,
    name: 'Batch kecil ammo',
    createdAt: '2026-05-19T16:10:00.000Z',
    status: 'Selesai',
    lines: [{ id: 3, itemId: 'ammo556', quantity: 450 }],
    resources: {
      'Gun Powder': 10,
      'Blueprint 5.56x45MM': 10,
      Gold: 50,
      'Olahan Kayu': 80,
      Silver: 150,
      Iron: 150,
      Copper: 200,
    },
  },
]

const storageKey = 'sotcraft.sessions'

function getInitialSessions() {
  try {
    const savedSessions = window.localStorage.getItem(storageKey)
    return savedSessions ? (JSON.parse(savedSessions) as Session[]) : initialSessions
  } catch {
    return initialSessions
  }
}

function getCraftCount(line: CraftLine) {
  if (line.itemId === 'ammo556') {
    return Math.ceil(line.quantity / 45)
  }

  return line.quantity
}

function getProducedAmount(line: CraftLine) {
  if (line.itemId === 'ammo556') {
    return getCraftCount(line) * 45
  }

  return line.quantity
}

function calculateResources(lines: CraftLine[]) {
  return lines.reduce<Resources>((total, line) => {
    const recipe = recipes[line.itemId]
    const craftCount = getCraftCount(line)

    Object.entries(recipe.resources).forEach(([resource, amount]) => {
      total[resource] = (total[resource] ?? 0) + amount * craftCount
    })

    return total
  }, {})
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function App() {
  const [activePage, setActivePage] = useState<'calculator' | 'history'>(
    'calculator',
  )
  const [lines, setLines] = useState<CraftLine[]>(initialLines)
  const [sessionName, setSessionName] = useState('Operasi crafting malam ini')
  const [sessions, setSessions] = useState<Session[]>(getInitialSessions)
  const [statusFilter, setStatusFilter] = useState<Status | 'Semua'>('Semua')
  const [pendingFinalization, setPendingFinalization] = useState<
    Record<number, PendingFinalization>
  >({})

  const resources = useMemo(() => calculateResources(lines), [lines])
  const sortedResources = useMemo(
    () => Object.entries(resources).sort((a, b) => b[1] - a[1]),
    [resources],
  )
  const totalCrafts = lines.reduce((total, line) => total + getCraftCount(line), 0)
  const topResource = sortedResources[0]
  const filteredSessions = sessions.filter(
    (session) => statusFilter === 'Semua' || session.status === statusFilter,
  )

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(sessions))
  }, [sessions])

  function updateLine(id: number, payload: Partial<CraftLine>) {
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...payload } : line)),
    )
  }

  function addLine() {
    setLines((current) => [
      ...current,
      { id: Date.now(), itemId: 'ram7', quantity: 1 },
    ])
  }

  function removeLine(id: number) {
    setLines((current) => current.filter((line) => line.id !== id))
  }

  function saveSession() {
    const nextSession: Session = {
      id: Date.now(),
      name: sessionName.trim() || 'Crafting tanpa nama',
      createdAt: new Date().toISOString(),
      status: 'Dalam Proses',
      lines,
      resources,
    }

    setSessions((current) => [nextSession, ...current])
    setActivePage('history')
  }

  function startFinalization(
    session: Session,
    status: Exclude<Status, 'Dalam Proses'>,
  ) {
    if (session.status !== 'Dalam Proses') {
      return
    }

    setPendingFinalization((current) => ({
      ...current,
      [session.id]: {
        status,
        cancelNote: status === 'Dibatalkan' ? (session.cancelNote ?? '') : '',
      },
    }))
  }

  function cancelFinalization(id: number) {
    setPendingFinalization((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function updatePendingCancelNote(id: number, cancelNote: string) {
    setPendingFinalization((current) => ({
      ...current,
      [id]: {
        status: 'Dibatalkan',
        cancelNote,
      },
    }))
  }

  function confirmFinalization(id: number) {
    const pending = pendingFinalization[id]

    if (!pending) {
      return
    }

    setSessions((current) =>
      current.map((session) =>
        session.id === id
          ? {
              ...session,
              status: pending.status,
              cancelNote:
                pending.status === 'Dibatalkan'
                  ? pending.cancelNote.trim()
                  : undefined,
            }
          : session,
      ),
    )

    cancelFinalization(id)
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <Shield size={22} />
          </div>
          <div>
            <p className="eyebrow">SOT Craft Ops</p>
            <h1>Illegal Crafting Control</h1>
          </div>
        </div>

        <nav className="nav-list" aria-label="Main navigation">
          <button
            className={activePage === 'calculator' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('calculator')}
            type="button"
          >
            <Hammer size={18} />
            Calculator
          </button>
          <button
            className={activePage === 'history' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('history')}
            type="button"
          >
            <History size={18} />
            History
          </button>
        </nav>

        <div className="sidebar-panel">
          <p className="panel-label">Quick Intel</p>
          <div className="intel-row">
            <span>Active sessions</span>
            <strong>{sessions.filter((item) => item.status === 'Dalam Proses').length}</strong>
          </div>
          <div className="intel-row">
            <span>Total records</span>
            <strong>{sessions.length}</strong>
          </div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Management tool</p>
            <h2>{activePage === 'calculator' ? 'Crafting Calculator' : 'Crafting History'}</h2>
          </div>
          <div className="operator-chip">
            <span className="status-dot" />
            Mafia Crew Mode
          </div>
        </header>

        {activePage === 'calculator' ? (
          <div className="calculator-grid">
            <section className="planner">
              <div className="section-heading">
                <div>
                  <p className="eyebrow">Batch builder</p>
                  <h3>Rencana Crafting</h3>
                </div>
                <button className="icon-button" onClick={addLine} type="button" aria-label="Tambah item">
                  <Plus size={18} />
                </button>
              </div>

              <div className="craft-lines">
                {lines.map((line) => {
                  const recipe = recipes[line.itemId]
                  const craftCount = getCraftCount(line)
                  const produced = getProducedAmount(line)

                  return (
                    <article className="craft-line" key={line.id}>
                      <div className={`item-token ${recipe.accent}`}>
                        <img src={recipe.image} alt="" />
                      </div>
                      <div className="line-main">
                        <div className="line-controls">
                          <label>
                            Item
                            <select
                              value={line.itemId}
                              onChange={(event) =>
                                updateLine(line.id, {
                                  itemId: event.target.value as ItemId,
                                  quantity: 1,
                                })
                              }
                            >
                              <option value="ram7">RAM-7</option>
                              <option value="ammo556">Ammo 5.56x45</option>
                            </select>
                          </label>
                          <label>
                            Jumlah {recipe.unit}
                            <input
                              min="1"
                              type="number"
                              value={line.quantity}
                              onChange={(event) =>
                                updateLine(line.id, {
                                  quantity: Math.max(1, Number(event.target.value)),
                                })
                              }
                            />
                          </label>
                        </div>
                        <div className="line-meta">
                          <span>{recipe.description}</span>
                          <strong>
                            {craftCount}x craft
                            {line.itemId === 'ammo556' ? ` -> ${produced} peluru final` : ''}
                          </strong>
                        </div>
                      </div>
                      <button
                        className="ghost-button danger"
                        onClick={() => removeLine(line.id)}
                        type="button"
                        aria-label="Hapus item"
                        disabled={lines.length === 1}
                      >
                        <Trash2 size={17} />
                      </button>
                    </article>
                  )
                })}
              </div>

              <div className="save-panel">
                <label>
                  Nama session
                  <input
                    value={sessionName}
                    onChange={(event) => setSessionName(event.target.value)}
                    placeholder="Contoh: Restock markas malam Jumat"
                  />
                </label>
                <button className="primary-button" onClick={saveSession} type="button">
                  <Save size={18} />
                  Simpan Perhitungan
                </button>
              </div>
            </section>

            <aside className="summary">
              <div className="metric-grid">
                <div className="metric">
                  <Clock3 size={18} />
                  <span>Total craft</span>
                  <strong>{totalCrafts}</strong>
                </div>
                <div className="metric">
                  <Layers3 size={18} />
                  <span>Resource unik</span>
                  <strong>{sortedResources.length}</strong>
                </div>
                <div className="metric wide">
                  <Archive size={18} />
                  <span>Paling banyak</span>
                  <strong>{topResource ? `${topResource[0]} (${topResource[1]})` : '-'}</strong>
                </div>
              </div>

              <section className="resource-card">
                <div className="section-heading">
                  <div>
                    <p className="eyebrow">Merged total</p>
                    <h3>Resource Summary</h3>
                  </div>
                  <SlidersHorizontal size={18} />
                </div>

                <div className="resource-list">
                  {sortedResources.map(([name, amount], index) => {
                    const maxAmount = sortedResources[0]?.[1] ?? 1
                    return (
                        <div className="resource-row" key={name}>
                          <div>
                          <span className="resource-name">
                            <img src={resourceImages[name]} alt="" />
                            {name}
                          </span>
                          <strong>{amount.toLocaleString('id-ID')}</strong>
                        </div>
                        <div className="bar-track">
                          <span
                            className="bar-fill"
                            style={{ width: `${Math.max(10, (amount / maxAmount) * 100)}%` }}
                          />
                        </div>
                        {index === 0 && <em>Top priority</em>}
                      </div>
                    )
                  })}
                </div>
              </section>
            </aside>
          </div>
        ) : (
          <section className="history-page">
            <div className="history-tools">
              <div className="search-box">
                <Search size={18} />
                <span>Filter status</span>
              </div>
              <div className="status-tabs">
                {(['Semua', 'Dalam Proses', 'Selesai', 'Dibatalkan'] as const).map((status) => (
                  <button
                    className={statusFilter === status ? 'status-tab active' : 'status-tab'}
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    type="button"
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div className="session-list">
              {filteredSessions.map((session) => {
                const pending = pendingFinalization[session.id]
                const isLocked = session.status !== 'Dalam Proses'
                const cancelNote = pending?.cancelNote ?? session.cancelNote ?? ''

                return (
                <article className={isLocked ? 'session-card locked' : 'session-card'} key={session.id}>
                  <div className="session-head">
                    <div>
                      <p className="eyebrow">{formatDate(session.createdAt)}</p>
                      <h3>{session.name}</h3>
                    </div>
                    <span className={`status-pill ${session.status.toLowerCase().replaceAll(' ', '-')}`}>
                      {session.status === 'Selesai' && <CheckCircle2 size={15} />}
                      {session.status === 'Dalam Proses' && <ClipboardList size={15} />}
                      {session.status === 'Dibatalkan' && <XCircle size={15} />}
                      {session.status}
                    </span>
                  </div>

                  <div className="session-items">
                    {session.lines.map((line) => (
                      <span key={line.id}>
                        <img src={recipes[line.itemId].image} alt="" />
                        {recipes[line.itemId].name}: {line.quantity} {recipes[line.itemId].unit}
                      </span>
                    ))}
                  </div>

                  <div className="compact-resources">
                    {Object.entries(session.resources)
                      .sort((a, b) => b[1] - a[1])
                      .slice(0, 6)
                      .map(([name, amount]) => (
                        <span key={name}>
                          <img src={resourceImages[name]} alt="" />
                          {name} <strong>{amount}</strong>
                        </span>
                      ))}
                  </div>

                  <div className="session-actions">
                    {(['Dalam Proses', 'Selesai', 'Dibatalkan'] as Status[]).map((status) => (
                      <button
                        className={session.status === status ? 'small-button active' : 'small-button'}
                        key={status}
                        onClick={() => {
                          if (status !== 'Dalam Proses') {
                            startFinalization(session, status)
                          }
                        }}
                        type="button"
                        disabled={isLocked || session.status === status}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {pending?.status === 'Selesai' && (
                    <div className="confirm-panel">
                      <div>
                        <strong>Konfirmasi selesai</strong>
                        <p>
                          Setelah dikonfirmasi, status session ini akan terkunci
                          dan tidak bisa diganti lagi.
                        </p>
                      </div>
                      <div className="confirm-actions">
                        <button
                          className="small-button"
                          onClick={() => cancelFinalization(session.id)}
                          type="button"
                        >
                          Batal
                        </button>
                        <button
                          className="small-button active"
                          onClick={() => confirmFinalization(session.id)}
                          type="button"
                        >
                          Konfirmasi Selesai
                        </button>
                      </div>
                    </div>
                  )}

                  {(pending?.status === 'Dibatalkan' || session.status === 'Dibatalkan') && (
                    <label className="cancel-note">
                      {isLocked ? 'Keterangan pembatalan' : 'Keterangan sebelum cancel'}
                      <textarea
                        value={cancelNote}
                        onChange={(event) =>
                          updatePendingCancelNote(session.id, event.target.value)
                        }
                        readOnly={isLocked}
                        placeholder="Contoh: bahan belum lengkap, blueprint dipakai batch lain, atau order dibatalkan."
                      />
                    </label>
                  )}

                  {pending?.status === 'Dibatalkan' && (
                    <div className="confirm-panel">
                      <div>
                        <strong>Konfirmasi cancel</strong>
                        <p>
                          Catatan wajib diisi. Setelah dikonfirmasi, status akan
                          terkunci sebagai dibatalkan.
                        </p>
                      </div>
                      <div className="confirm-actions">
                        <button
                          className="small-button"
                          onClick={() => cancelFinalization(session.id)}
                          type="button"
                        >
                          Batal
                        </button>
                        <button
                          className="small-button active"
                          onClick={() => confirmFinalization(session.id)}
                          type="button"
                          disabled={!cancelNote.trim()}
                        >
                          Konfirmasi Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </article>
                )
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  )
}

export default App
