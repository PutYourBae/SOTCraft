import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Archive,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Hammer,
  History,
  Landmark,
  Layers3,
  Plus,
  Save,
  Search,
  Shield,
  SlidersHorizontal,
  Store,
  Trash2,
  XCircle,
} from 'lucide-react'
import { ref, onValue, push, update } from 'firebase/database'
import { db } from './firebase'
import './App.css'

type ItemId = 'ram7' | 'ammo556' | 'ammo9mm' | 'ammo44'
type Status = 'Dalam Proses' | 'Selesai' | 'Dibatalkan'
type Resources = Record<string, number>

type CraftLine = {
  id: number
  itemId: ItemId
  quantity: number
}

type Session = {
  id: string
  name: string
  createdAt: string
  createdBy?: string
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
    yield?: number
    resources: Resources
  }
> = {
  ram7: {
    name: 'RAM-7',
    unit: 'senjata',
    accent: 'weapon',
    image: `${import.meta.env.BASE_URL}resource/ram7.svg`,
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
    name: '5.56x45',
    unit: 'peluru',
    accent: 'ammo',
    image: `${import.meta.env.BASE_URL}resource/ammo-556.svg`,
    description: '1 craft clip menghasilkan 120 peluru',
    output: '120 peluru per craft',
    yield: 120,
    resources: {
      'Blueprint 5_56X45MM': 1,
      Gold: 5,
      Silver: 5,
      Iron: 5,
      Copper: 5,
      'Olahan Kayu': 8,
      'Santa Muerte': 1,
      'Gun Powder': 1,
    },
  },
  ammo9mm: {
    name: '9mm',
    unit: 'peluru',
    accent: 'ammo',
    image: `${import.meta.env.BASE_URL}resource/ammo-9mm.svg`,
    description: '1 craft clip menghasilkan 50 peluru',
    output: '50 peluru per craft',
    yield: 50,
    resources: {
      'Blueprint 9MM': 1,
      Gold: 1,
      Silver: 3,
      Iron: 3,
      Copper: 5,
      'Olahan Kayu': 1,
      'Santa Muerte': 1,
      'Gun Powder': 1,
    },
  },
  ammo44: {
    name: '.44 Magnum',
    unit: 'peluru',
    accent: 'ammo',
    image: `${import.meta.env.BASE_URL}resource/ammo-44.svg`,
    description: '1 craft clip menghasilkan 50 peluru',
    output: '50 peluru per craft',
    yield: 50,
    resources: {
      'Blueprint 44_Magnum': 1,
      Gold: 2,
      Silver: 3,
      Iron: 5,
      Copper: 8,
      'Olahan Kayu': 5,
      'Santa Muerte': 1,
      'Gun Powder': 1,
    },
  },
}

const base = import.meta.env.BASE_URL

const resourceImages: Record<string, string> = {
  'Blueprint RAM-7': `${base}resource/blueprint.svg`,
  'Blueprint 5_56X45MM': `${base}resource/blueprint.svg`,
  'Blueprint 9MM': `${base}resource/blueprint.svg`,
  'Blueprint 44_Magnum': `${base}resource/blueprint.svg`,
  'Gun Oil': `${base}resource/gun-oil.svg`,
  Gold: `${base}resource/gold.svg`,
  Emerald: `${base}resource/emerald.svg`,
  Steel: `${base}resource/steel.svg`,
  Silver: `${base}resource/silver.svg`,
  'Olahan Kayu': `${base}resource/wood.svg`,
  Copper: `${base}resource/copper.svg`,
  'Santa Muerte': `${base}resource/santa-muerte.svg`,
  'Gun Powder': `${base}resource/gun-powder.svg`,
  Iron: `${base}resource/iron.svg`,
}

const initialLines: CraftLine[] = [
  { id: 1, itemId: 'ram7', quantity: 1 },
]

function getCraftCount(line: CraftLine) {
  const recipe = recipes[line.itemId]
  if (recipe && recipe.yield && recipe.yield > 1) {
    return Math.ceil(line.quantity / recipe.yield)
  }
  return line.quantity
}

function getProducedAmount(line: CraftLine) {
  const recipe = recipes[line.itemId]
  if (recipe && recipe.yield && recipe.yield > 1) {
    return getCraftCount(line) * recipe.yield
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
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

type MarketTransaction = {
  id: string
  createdAt: string
  type: 'purchase' | 'deposit' | 'withdraw'
  amount: number
  performedBy: string
  note?: string
  items?: { name: string; quantity: number; subtotal: number }[]
}

type MarketItem = {
  id: string
  name: string
  price: number
  stock: number
}

const marketItems: MarketItem[] = [
  { id: 'lamp', name: 'Lamp', price: 1500, stock: 2000 },
  { id: 'plant_pot', name: 'Plant Pot', price: 60, stock: 2000 },
  { id: 'bibit_marijuana', name: 'Bibit Marijuana', price: 210, stock: 2000 },
  { id: 'fertilizer', name: 'Fertilizer', price: 60, stock: 2000 },
  { id: 'garden_pitcher', name: 'Garden Pitcher', price: 300, stock: 2000 },
  { id: 'bagging_table', name: 'Bagging Table', price: 7500, stock: 2000 },
]

function formatResourceName(name: string) {
  if (name === 'Blueprint 5_56X45MM') {
    return 'Blueprint 5.56X45MM'
  }
  if (name === 'Blueprint 44_Magnum') {
    return 'Blueprint 44.Magnum'
  }
  return name
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(
    sessionStorage.getItem('sotcraft_auth') === 'true'
  )
  const [activeUser, setActiveUser] = useState<string | null>(
    sessionStorage.getItem('sotcraft_user')
  )
  const [passwordInput, setPasswordInput] = useState('')
  const [loginError, setLoginError] = useState(false)

  const [activePage, setActivePage] = useState<'calculator' | 'history' | 'market' | 'bank'>(
    'calculator',
  )
  const [lines, setLines] = useState<CraftLine[]>(initialLines)
  const [sessionName, setSessionName] = useState('Operasi crafting malam ini')
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<Status | 'Semua'>('Semua')
  const [pendingFinalization, setPendingFinalization] = useState<
    Record<string, PendingFinalization>
  >({})
  // Track expanded resource panels in history
  const [expandedResources, setExpandedResources] = useState<Record<string, boolean>>({})

  // Illegal Market & Bank State
  const [marketSearch, setMarketSearch] = useState('')
  const [marketQuantities, setMarketQuantities] = useState<Record<string, number>>({})
  const [dmBalance, setDmBalance] = useState<number>(0)
  const [marketTransactions, setMarketTransactions] = useState<MarketTransaction[]>([])
  const [bankMode, setBankMode] = useState<'deposit' | 'withdraw' | null>(null)
  const [bankAmountInput, setBankAmountInput] = useState('')
  const [bankNoteInput, setBankNoteInput] = useState('')

  const sessionsRef = useRef(db ? ref(db, 'sessions') : null)

  // Compute running balance history for the traffic chart
  const balanceHistory = useMemo(() => {
    if (marketTransactions.length === 0) return []
    const sorted = [...marketTransactions].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )
    let running = 0
    return sorted.map(tx => {
      if (tx.type === 'deposit') running += tx.amount
      else running -= tx.amount
      return { createdAt: tx.createdAt, balance: Math.max(0, running), type: tx.type }
    })
  }, [marketTransactions])

  function updateMarketQuantity(id: string, delta: number) {
    setMarketQuantities((prev) => {
      const currentQty = prev[id] ?? 0
      const newQty = Math.max(0, currentQty + delta)
      return {
        ...prev,
        [id]: newQty,
      }
    })
  }

  function resetMarketCart() {
    setMarketQuantities({})
  }

  const filteredMarketItems = useMemo(() => {
    return marketItems.filter((item) =>
      item.name.toLowerCase().includes(marketSearch.toLowerCase())
    )
  }, [marketSearch])

  const { marketCartItems, totalDirtyMoney } = useMemo(() => {
    const cart = Object.entries(marketQuantities)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => {
        const item = marketItems.find((i) => i.id === id)!
        return {
          item,
          quantity: qty,
          subtotal: item.price * qty,
        }
      })
    const total = cart.reduce((sum, cartItem) => sum + cartItem.subtotal, 0)
    return { marketCartItems: cart, totalDirtyMoney: total }
  }, [marketQuantities])

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

  async function handleBankTransaction(e: React.FormEvent) {
    e.preventDefault()
    if (!db) return
    const amount = Number(bankAmountInput)
    if (isNaN(amount) || amount <= 0) return

    if (bankMode === 'withdraw' && amount > dmBalance) {
      alert('Saldo DM tidak cukup!')
      return
    }

    try {
      const txRef = push(ref(db, 'market_transactions'))
      const txId = txRef.key!
      
      const tx: MarketTransaction = {
        id: txId,
        createdAt: new Date().toISOString(),
        type: bankMode!,
        amount,
        performedBy: activeUser || 'Unknown',
        note: bankNoteInput.trim()
      }

      const updates: Record<string, any> = {
        [`market_transactions/${txId}`]: tx,
        'dm_balance': bankMode === 'deposit' ? dmBalance + amount : dmBalance - amount
      }

      await update(ref(db), updates)
      
      setBankMode(null)
      setBankAmountInput('')
      setBankNoteInput('')
    } catch (err) {
      console.error(err)
      alert('Gagal melakukan transaksi')
    }
  }

  async function handleCheckout() {
    if (!db) return
    if (totalDirtyMoney <= 0) return
    if (totalDirtyMoney > dmBalance) {
      alert('Saldo DM tidak cukup untuk checkout!')
      return
    }

    try {
      const txRef = push(ref(db, 'market_transactions'))
      const txId = txRef.key!
      
      const tx: MarketTransaction = {
        id: txId,
        createdAt: new Date().toISOString(),
        type: 'purchase',
        amount: totalDirtyMoney,
        performedBy: activeUser || 'Unknown',
        items: marketCartItems.map(c => ({
          name: c.item.name,
          quantity: c.quantity,
          subtotal: c.subtotal
        }))
      }

      const updates: Record<string, any> = {
        [`market_transactions/${txId}`]: tx,
        'dm_balance': dmBalance - totalDirtyMoney
      }

      await update(ref(db), updates)
      resetMarketCart()
    } catch (err) {
      console.error(err)
      alert('Gagal checkout')
    }
  }

  // Subscribe to Firebase Realtime Database
  useEffect(() => {
    if (!sessionsRef.current) {
      setLoading(false)
      return
    }

    const unsubscribe = onValue(
      sessionsRef.current,
      (snapshot) => {
        const data = snapshot.val()
        if (data) {
          // Convert Firebase object (keyed by push ID) to sorted array (newest first)
          const list: Session[] = Object.entries(data).map(([, val]) => val as Session)
          list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          setSessions(list)
        } else {
          setSessions([])
        }
        setLoading(false)
      },
      (_error) => {
        setLoading(false)
      }
    )

    const dmRef = ref(db, 'dm_balance')
    const dmUnsub = onValue(dmRef, (snapshot) => {
      setDmBalance(snapshot.val() || 0)
    })

    const marketTxRef = ref(db, 'market_transactions')
    const marketTxUnsub = onValue(marketTxRef, (snapshot) => {
      const data = snapshot.val()
      if (data) {
        const list: MarketTransaction[] = Object.entries(data).map(([, val]) => val as MarketTransaction)
        list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        setMarketTransactions(list)
      } else {
        setMarketTransactions([])
      }
    })

    return () => {
      unsubscribe()
      dmUnsub()
      marketTxUnsub()
    }
  }, [])

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

  async function saveSession() {
    try {
      const sessionId = Date.now().toString()
      const nextSession: Session = {
        id: sessionId,
        name: sessionName.trim() || 'Crafting tanpa nama',
        createdAt: new Date().toISOString(),
        createdBy: activeUser || 'Unknown',
        status: 'Dalam Proses',
        lines,
        resources,
      }

      if (!sessionsRef.current) {
        throw new Error("Firebase Database belum terhubung. Periksa apakah kredensial Firebase sudah dimasukkan di environment variables.")
      }

      // Push to Firebase with the id as the key
      await push(sessionsRef.current, nextSession)
      setSessionName('') // reset input nama session
      setActivePage('history')
    } catch (error: any) {
      console.error("Gagal menyimpan ke Firebase:", error)
      alert(`Gagal menyimpan perhitungan: ${error.message || error}`)
    }
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

  function cancelFinalization(id: string) {
    setPendingFinalization((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }

  function updatePendingCancelNote(id: string, cancelNote: string) {
    setPendingFinalization((current) => ({
      ...current,
      [id]: {
        status: 'Dibatalkan',
        cancelNote,
      },
    }))
  }

  async function confirmFinalization(id: string) {
    const pending = pendingFinalization[id]

    if (!pending) {
      return
    }

    if (!db) {
      alert("Firebase Database belum terhubung. Periksa environment variables Anda.")
      return
    }

    try {
      // Find the Firebase key for this session
      const sessionRef = ref(db, `sessions`)
      // We need to query by id — fetch all and find the matching key
      // Since we stored id inside the object, we search the snapshot keys
      onValue(sessionRef, async (snapshot) => {
        const data = snapshot.val()
        if (!data) return

        const fbKey = Object.keys(data).find((k) => data[k].id === id)
        if (!fbKey) return

        const updates: Partial<Session> = {
          status: pending.status,
          cancelNote:
            pending.status === 'Dibatalkan'
              ? pending.cancelNote.trim()
              : undefined,
        }

        try {
          await update(ref(db, `sessions/${fbKey}`), updates)
          cancelFinalization(id)
        } catch (updateError: any) {
          console.error("Gagal memperbarui status di Firebase:", updateError)
          alert(`Gagal memperbarui status: ${updateError.message || updateError}`)
        }
      }, (error) => {
        console.error("Gagal membaca dari Firebase:", error)
        alert(`Gagal membaca database: ${error.message || error}`)
      }, { onlyOnce: true })
    } catch (error: any) {
      console.error("Gagal mengakses Firebase:", error)
      alert(`Gagal mengakses database: ${error.message || error}`)
    }
  }

  function toggleResourceExpand(sessionId: string) {
    setExpandedResources((prev) => ({
      ...prev,
      [sessionId]: !prev[sessionId],
    }))
  }

  function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    
    const userListStr = import.meta.env.VITE_USER_LIST || ''
    const users = userListStr.split(',').filter(Boolean).map((u: string) => u.split(':'))
    const defaultPass = import.meta.env.VITE_ACCESS_PASSWORD
    
    let matchedUser = null
    
    for (const [name, pass] of users) {
      if (passwordInput === pass) {
        matchedUser = name
        break
      }
    }
    
    if (!matchedUser && passwordInput === defaultPass) {
       matchedUser = 'Boss'
    }

    if (matchedUser) {
      setIsAuthenticated(true)
      sessionStorage.setItem('sotcraft_auth', 'true')
      sessionStorage.setItem('sotcraft_user', matchedUser)
      setActiveUser(matchedUser)
      setLoginError(false)
    } else {
      setLoginError(true)
      setPasswordInput('')
    }
  }

  if (!isAuthenticated) {
    return (
      <main className="login-screen">
        <div className="terminal-card">

          {/* ── Top status bar ── */}
          <div className="terminal-topbar">
            <div className="terminal-auth-label">
              <span className="terminal-blink-dot" />
              AUTH_REQUIRED
            </div>
            <div className="terminal-cid">CID: SOT-CR-001</div>
          </div>

          {/* ── Passphrase field ── */}
          <form className="terminal-form" onSubmit={handleLogin}>
            <div className="terminal-field-label">
              <span>PASSPHRASE</span>
              <span className="terminal-redacted">REDACTED_INPUT</span>
            </div>

            <div className="terminal-input-row">
              <span className="terminal-prompt">&gt;</span>
              <input
                type="password"
                placeholder="··········"
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value)
                  setLoginError(false)
                }}
                autoFocus
                className="terminal-input"
                spellCheck={false}
              />
            </div>

            {loginError && (
              <p className="terminal-error">
                &#x26A0; PASSPHRASE REJECTED — ACCESS DENIED
              </p>
            )}

            <button type="submit" className="terminal-connect-btn">
              CONNECT TO SYNDICATE &nbsp;&#x26A1;
            </button>
          </form>

          {/* ── Warning footer ── */}
          <div className="terminal-warning-block">
            <span className="terminal-warn-icon">&#x26A0;</span>
            <div>
              <p className="terminal-warn-title">
                ACCESS RESTRICTED.&nbsp;
                <span className="terminal-warn-highlight">AUTHORIZED PERSONNEL</span>
                &nbsp;ONLY.
              </p>
              <p className="terminal-warn-sub">
                Unauthorized access attempts are logged and traced to geographical coordinates.
              </p>
            </div>
          </div>

        </div>
      </main>
    )
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
            className={activePage === 'market' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('market')}
            type="button"
          >
            <Store size={18} />
            Illegal Market
          </button>
          <button
            className={activePage === 'history' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('history')}
            type="button"
          >
            <History size={18} />
            History
          </button>
          <button
            className={activePage === 'bank' ? 'nav-item active' : 'nav-item'}
            onClick={() => setActivePage('bank')}
            type="button"
          >
            <Landmark size={18} />
            Bank Account
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
            <h2>
              {activePage === 'calculator'
                ? 'Crafting Calculator'
                : activePage === 'market'
                ? 'Illegal Market'
                : activePage === 'bank'
                ? 'Bank Account'
                : 'Crafting History'}
            </h2>
          </div>
          <div className="profile-chip">
            <div className="profile-avatar">
               {activeUser ? activeUser.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="profile-info">
               <strong>{activeUser || 'Unknown'}</strong>
               <span>Logged in</span>
            </div>
          </div>
        </header>

        {!db && (
          <div className="db-warning-banner" style={{
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#f87171',
            padding: '12px 16px',
            borderRadius: '8px',
            margin: '0 24px 20px 24px',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
          }}>
            <XCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Firebase Database belum terhubung!</strong> Kredensial database di Environment Variables kosong atau salah. Aplikasi berjalan dalam mode demo offline (Save/History dinonaktifkan).
            </span>
          </div>
        )}

        {activePage === 'calculator' ? (
          <div className="calculator-grid fade-in">
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
                              <option value="ammo556">5.56x45</option>
                              <option value="ammo9mm">9mm</option>
                              <option value="ammo44">.44 Magnum</option>
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
                            {recipe.yield && recipe.yield > 1 ? ` -> ${produced} peluru final` : ''}
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
                            {formatResourceName(name)}
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
        ) : activePage === 'market' ? (
          <div className="market-layout fade-in">
            <div className="market-grid">
              <section className="market-list">
              <div className="search-bar">
                <Search size={18} />
                <input
                  type="text"
                  placeholder="Cari item illegal market..."
                  value={marketSearch}
                  onChange={(e) => setMarketSearch(e.target.value)}
                />
              </div>
              <div className="market-items">
                {filteredMarketItems.map((item) => (
                  <article className="market-list-card" key={item.id}>
                    <div className="market-item-header">
                      <h3>{item.name}</h3>
                    </div>
                    <div className="market-item-actions">
                      <span className="price">{item.price} DM</span>
                      <div className="quantity-selector">
                        <button onClick={() => updateMarketQuantity(item.id, -1)} type="button" aria-label="Kurangi">-</button>
                        <span>{marketQuantities[item.id] ?? 0}</span>
                        <button onClick={() => updateMarketQuantity(item.id, 1)} type="button" aria-label="Tambah">+</button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <aside className="market-cart">
              <div className="cart-header">
                <h3>Cart Total</h3>
                <button className="text-button text-muted" onClick={resetMarketCart} type="button">
                  Reset
                </button>
              </div>

              <div className="dirty-money-badge">
                <span>Total Dirty Money</span>
                <h2>{totalDirtyMoney.toLocaleString('id-ID')} DM</h2>
              </div>

              {/* DM Balance indicator */}
              <div className="dm-balance-indicator">
                <span>Saldo DM</span>
                <span className={totalDirtyMoney > dmBalance ? 'balance-insufficient' : 'balance-ok'}>
                  {dmBalance.toLocaleString('id-ID')} DM
                </span>
              </div>

              <div className="cart-list">
                {marketCartItems.length === 0 && (
                  <p className="empty-cart">Belum ada item yang dipilih</p>
                )}
                {marketCartItems.map((cartItem) => (
                  <div className="cart-row" key={cartItem.item.id}>
                    <div className="cart-row-info">
                      <strong>{cartItem.item.name}</strong>
                      <span className="cart-row-qty">{cartItem.quantity}x @ {cartItem.item.price}</span>
                    </div>
                    <strong>{cartItem.subtotal.toLocaleString('id-ID')}</strong>
                  </div>
                ))}
              </div>
              <button 
                className="checkout-button primary-button" 
                disabled={marketCartItems.length === 0 || totalDirtyMoney > dmBalance}
                onClick={handleCheckout}
                style={{ width: '100%', marginTop: '20px' }}
              >
                Checkout &amp; Bayar
              </button>
            </aside>
          </div>{/* end market-grid */}

          {/* --- PURCHASE HISTORY --- */}
          {(() => {
            const purchases = marketTransactions.filter(tx => tx.type === 'purchase')
            return (
              <section className="purchase-history fade-in">
                <div className="purchase-history-header">
                  <h3>🛒 Riwayat Pembelian</h3>
                  <span className="chart-label">{purchases.length} transaksi</span>
                </div>
                {purchases.length === 0 ? (
                  <p className="empty-tx">Belum ada pembelian</p>
                ) : (
                  <div className="purchase-list">
                    {purchases.map(tx => (
                      <div className="purchase-row" key={tx.id}>
                        <div className="purchase-row-left">
                          <div className="purchase-items-inline">
                            {tx.items?.map((it, i) => (
                              <span key={i} className="purchase-item-tag">
                                {it.name} <strong>×{it.quantity}</strong>
                              </span>
                            ))}
                          </div>
                          <div className="purchase-meta">
                            <span>{new Date(tx.createdAt).toLocaleString('id-ID')}</span>
                            <span>•</span>
                            <span>{tx.performedBy}</span>
                          </div>
                        </div>
                        <span className="purchase-amount">
                          -{tx.amount.toLocaleString('id-ID')} DM
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )
          })()}
          </div>
        ) : activePage === 'bank' ? (
          <div className="bank-page fade-in">
            {/* --- BALANCE HERO --- */}
            <section className="bank-hero">
              <p className="eyebrow">Dirty Money Reserve</p>
              <h2 className="bank-hero-balance">{dmBalance.toLocaleString('id-ID')} DM</h2>
              <div className="bank-actions">
                <button className="primary-button" onClick={() => setBankMode(bankMode === 'deposit' ? null : 'deposit')}>
                  DEPOSIT
                </button>
                <button className="danger-button" onClick={() => setBankMode(bankMode === 'withdraw' ? null : 'withdraw')}>
                  WITHDRAW
                </button>
              </div>

              {bankMode && (
                <form className="bank-form fade-in" onSubmit={handleBankTransaction}>
                  <div className="form-group">
                    <label>{bankMode === 'deposit' ? 'Jumlah Deposit (DM)' : 'Jumlah Withdraw (DM)'}</label>
                    <input 
                      type="number" 
                      min="1" 
                      value={bankAmountInput} 
                      onChange={e => setBankAmountInput(e.target.value)} 
                      placeholder="0"
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Catatan (Opsional)</label>
                    <input 
                      type="text" 
                      value={bankNoteInput} 
                      onChange={e => setBankNoteInput(e.target.value)} 
                      placeholder="e.g. Setoran uang hasil perampokan" 
                    />
                  </div>
                  <button type="submit" className={bankMode === 'deposit' ? 'primary-button' : 'danger-button'} style={{ marginTop: '8px' }}>
                    Konfirmasi {bankMode === 'deposit' ? 'Deposit' : 'Withdraw'}
                  </button>
                </form>
              )}
            </section>

            {/* --- BALANCE TRAFFIC CHART --- */}
            {balanceHistory.length > 0 && (() => {
              const W = 800, H = 160, PAD = 20
              const maxBal = Math.max(...balanceHistory.map(p => p.balance), 1)
              const pts = balanceHistory.map((p, i) => {
                const x = PAD + (i / Math.max(balanceHistory.length - 1, 1)) * (W - PAD * 2)
                const y = H - PAD - (p.balance / maxBal) * (H - PAD * 2)
                return { x, y, ...p }
              })
              const polyline = pts.map(p => `${p.x},${p.y}`).join(' ')
              const areaPath = `M${pts[0].x},${H - PAD} ` +
                pts.map(p => `L${p.x},${p.y}`).join(' ') +
                ` L${pts[pts.length - 1].x},${H - PAD} Z`
              return (
                <section className="bank-chart-section">
                  <div className="bank-chart-header">
                    <h3>📈 Balance Traffic</h3>
                    <span className="chart-label">{balanceHistory.length} transaksi</span>
                  </div>
                  <div className="bank-chart-wrap">
                    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="bank-chart-svg">
                      <defs>
                        <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#d7a83f" stopOpacity="0.35" />
                          <stop offset="100%" stopColor="#d7a83f" stopOpacity="0.01" />
                        </linearGradient>
                        <filter id="glow">
                          <feGaussianBlur stdDeviation="2" result="blur" />
                          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                        </filter>
                      </defs>
                      {/* Grid lines */}
                      {[0.25, 0.5, 0.75, 1].map(frac => (
                        <line
                          key={frac}
                          x1={PAD} y1={H - PAD - frac * (H - PAD * 2)}
                          x2={W - PAD} y2={H - PAD - frac * (H - PAD * 2)}
                          stroke="rgba(255,255,255,0.05)" strokeWidth="1"
                        />
                      ))}
                      {/* Area fill */}
                      <path d={areaPath} fill="url(#balGrad)" />
                      {/* Line */}
                      <polyline
                        points={polyline}
                        fill="none"
                        stroke="#d7a83f"
                        strokeWidth="2"
                        strokeLinejoin="round"
                        filter="url(#glow)"
                      />
                      {/* Data dots */}
                      {pts.map((p, i) => (
                        <circle
                          key={i}
                          cx={p.x} cy={p.y} r="3.5"
                          fill={p.type === 'deposit' ? '#34d399' : '#f87171'}
                          stroke="#0a0f16" strokeWidth="1.5"
                        />
                      ))}
                    </svg>
                    {/* Y axis labels */}
                    <div className="chart-y-labels">
                      <span>{maxBal.toLocaleString('id-ID')}</span>
                      <span>{Math.round(maxBal * 0.5).toLocaleString('id-ID')}</span>
                      <span>0</span>
                    </div>
                  </div>
                  {/* Legend */}
                  <div className="chart-legend">
                    <span><span className="legend-dot deposit" />Deposit</span>
                    <span><span className="legend-dot withdraw" />Withdraw / Purchase</span>
                  </div>
                </section>
              )
            })()}

            {/* --- TRANSACTION LEDGER --- */}
            <section className="transaction-history">
              <h3>📋 Ledger — Riwayat Transaksi</h3>
              <div className="tx-list">
                {marketTransactions.map(tx => (
                  <div className="tx-card" key={tx.id}>
                    <div className="tx-header">
                      <span className={`tx-type ${tx.type}`}>{tx.type.toUpperCase()}</span>
                      <span className={`tx-amount ${tx.type}`}>
                        {tx.type === 'deposit' ? '+' : '-'}{tx.amount.toLocaleString('id-ID')} DM
                      </span>
                    </div>
                    <div className="tx-meta">
                      <span>{new Date(tx.createdAt).toLocaleString('id-ID')}</span>
                      <span>•</span>
                      <span>{tx.performedBy}</span>
                    </div>
                    {tx.note && <div className="tx-note">"{tx.note}"</div>}
                    {tx.items && (
                      <div className="tx-items">
                        {tx.items.map((it, i) => (
                          <span key={i}>{it.name} x{it.quantity}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {marketTransactions.length === 0 && <p className="empty-tx">Belum ada transaksi</p>}
              </div>
            </section>
          </div>

        ) : (
          <section className="history-page fade-in">
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

            {loading ? (
              <div className="loading-state">
                <div className="loading-spinner" />
                <p>Memuat data dari server...</p>
              </div>
            ) : (
              <div className="session-list">
                {filteredSessions.length === 0 && (
                  <div className="empty-state">
                    <ClipboardList size={40} />
                    <p>Belum ada session yang tersimpan.</p>
                  </div>
                )}
                {filteredSessions.map((session) => {
                  const pending = pendingFinalization[session.id]
                  const isLocked = session.status !== 'Dalam Proses'
                  const cancelNote = pending?.cancelNote ?? session.cancelNote ?? ''
                  const sortedSessionResources = Object.entries(session.resources).sort((a, b) => b[1] - a[1])
                  const maxSessionResource = sortedSessionResources[0]?.[1] ?? 1
                  const isExpanded = expandedResources[session.id] ?? false
                  const PREVIEW_COUNT = 6

                  return (
                  <article className={isLocked ? 'session-card locked' : 'session-card'} key={session.id}>
                    <div className="session-head">
                      <div>
                        <p className="eyebrow">
                          {formatDate(session.createdAt)}
                          {session.createdBy && ` • By: ${session.createdBy}`}
                        </p>
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

                    {/* Full Resource Summary — same style as calculator */}
                    <div className="session-resource-summary">
                      <div className="session-resource-header">
                        <span className="session-resource-title">
                          <SlidersHorizontal size={14} />
                          Resource Summary
                        </span>
                        {sortedSessionResources.length > PREVIEW_COUNT && (
                          <button
                            className="expand-toggle"
                            type="button"
                            onClick={() => toggleResourceExpand(session.id)}
                          >
                            {isExpanded
                              ? `Sembunyikan`
                              : `+${sortedSessionResources.length - PREVIEW_COUNT} lainnya`}
                          </button>
                        )}
                      </div>
                      <div className="resource-list compact">
                        {(isExpanded ? sortedSessionResources : sortedSessionResources.slice(0, PREVIEW_COUNT)).map(([name, amount], index) => (
                          <div className="resource-row" key={name}>
                            <div>
                              <span className="resource-name">
                                <img src={resourceImages[name]} alt="" />
                                {formatResourceName(name)}
                              </span>
                              <strong>{amount.toLocaleString('id-ID')}</strong>
                            </div>
                            <div className="bar-track">
                              <span
                                className="bar-fill"
                                style={{ width: `${Math.max(10, (amount / maxSessionResource) * 100)}%` }}
                              />
                            </div>
                            {index === 0 && <em>Top priority</em>}
                          </div>
                        ))}
                      </div>
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
            )}
          </section>
        )}
      </section>
    </main>
  )
}

export default App
