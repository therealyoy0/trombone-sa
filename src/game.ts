export const SAVE_KEY = 'trombone-sa-v1'
export const TICK_MS = 100
export const WIN_CLIPS = 1_000_000

export type ProjectId =
  | 'wireBuyer'
  | 'clipperMk2'
  | 'hypnoAds'
  | 'mega'
  | 'infiniteWire'

export type Project = {
  id: ProjectId
  title: string
  hint: string
  cost: number
  requireMade?: number
}

export const PROJECTS: Project[] = [
  {
    id: 'wireBuyer',
    title: 'Acheteuse de fil',
    hint: 'Rachète du fil dès que le stock passe sous 400.',
    cost: 80,
  },
  {
    id: 'clipperMk2',
    title: 'Clippers Mk.II',
    hint: 'Les clippers automatiques produisent ×2.',
    cost: 220,
  },
  {
    id: 'hypnoAds',
    title: 'Publicité hypnotique',
    hint: 'La demande du marché est ×3.',
    cost: 650,
    requireMade: 400,
  },
  {
    id: 'mega',
    title: 'Usine méga',
    hint: 'Débloque les méga-clippers (50 trombones / s).',
    cost: 4_000,
    requireMade: 2_500,
  },
  {
    id: 'infiniteWire',
    title: 'Fil illimité',
    hint: 'Plus jamais à court de matière première.',
    cost: 40_000,
    requireMade: 25_000,
  },
]

export type State = {
  clips: number
  made: number
  money: number
  wire: number
  wirePrice: number
  price: number
  clippers: number
  megas: number
  marketing: number
  bought: Record<ProjectId, boolean>
  log: string[]
  won: boolean
  winDismissed: boolean
  startedAt: number
}

export function fresh(): State {
  return {
    clips: 0,
    made: 0,
    money: 0,
    wire: 50,
    wirePrice: 16,
    price: 0.25,
    clippers: 0,
    megas: 0,
    marketing: 0,
    bought: {
      wireBuyer: false,
      clipperMk2: false,
      hypnoAds: false,
      mega: false,
      infiniteWire: false,
    },
    log: ['Objectif : fabriquer un million de trombones. Vous avez 50 cm de fil.'],
    won: false,
    winDismissed: false,
    startedAt: Date.now(),
  }
}

export function load(): State {
  try {
    const raw = localStorage.getItem(SAVE_KEY)
    if (!raw) return fresh()
    const parsed = JSON.parse(raw) as Partial<State>
    return { ...fresh(), ...parsed, bought: { ...fresh().bought, ...parsed.bought } }
  } catch {
    return fresh()
  }
}

export function save(state: State): void {
  localStorage.setItem(SAVE_KEY, JSON.stringify(state))
}

export function fmt(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return '—'
  const abs = Math.abs(n)
  if (abs < 1000) {
    return n.toLocaleString('fr-FR', {
      maximumFractionDigits: digits,
      minimumFractionDigits: digits,
    })
  }
  const units = ['', ' k', ' M', ' Md', ' T']
  let v = abs
  let i = 0
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000
    i += 1
  }
  const sign = n < 0 ? '−' : ''
  return `${sign}${v.toLocaleString('fr-FR', { maximumFractionDigits: 2 })}${units[i]}`
}

export function money(n: number): string {
  return `${fmt(n, n < 100 ? 2 : 0)} $`
}

export function clipperCost(owned: number): number {
  return Math.ceil(5 * Math.pow(1.145, owned))
}

export function megaCost(owned: number): number {
  return Math.ceil(900 * Math.pow(1.18, owned))
}

export function marketingCost(level: number): number {
  return Math.ceil(40 * Math.pow(1.55, level))
}

export function clipperRate(state: State): number {
  const mk = state.bought.clipperMk2 ? 2 : 1
  return state.clippers * 0.55 * mk + state.megas * 50
}

export function demandPerSec(state: State): number {
  const ads = 1 + state.marketing * 0.35
  const hypno = state.bought.hypnoAds ? 3 : 1
  const priceFactor = Math.pow(0.25 / Math.max(0.01, state.price), 1.15)
  return Math.max(0, 2.2 * ads * hypno * priceFactor)
}

export function pushLog(state: State, line: string): void {
  state.log.unshift(line)
  if (state.log.length > 12) state.log.length = 12
}

export function makeClip(state: State, count = 1): number {
  if (state.won && !state.winDismissed) return 0
  let n = count
  if (n <= 0) return 0
  if (!state.bought.infiniteWire) {
    n = Math.min(n, state.wire)
  }
  if (n <= 0) return 0
  state.wire -= state.bought.infiniteWire ? 0 : n
  state.clips += n
  state.made += n
  if (state.made >= WIN_CLIPS && !state.won) {
    state.won = true
    const mins = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))
    pushLog(
      state,
      `Conversion totale. ${fmt(state.made)} trombones. Durée : ${mins} min.`,
    )
  }
  return n
}

export function buyWire(state: State): boolean {
  if (state.bought.infiniteWire) return false
  if (state.money < state.wirePrice) return false
  state.money -= state.wirePrice
  state.wire += 1000
  return true
}

export function buyClipper(state: State): boolean {
  const cost = clipperCost(state.clippers)
  if (state.money < cost) return false
  state.money -= cost
  state.clippers += 1
  if (state.clippers === 1) pushLog(state, 'Premier clipper. La chaîne tourne sans vous.')
  return true
}

export function buyMega(state: State): boolean {
  if (!state.bought.mega) return false
  const cost = megaCost(state.megas)
  if (state.money < cost) return false
  state.money -= cost
  state.megas += 1
  if (state.megas === 1) pushLog(state, 'Usine méga en ligne. 50 trombones / seconde.')
  return true
}

export function buyMarketing(state: State): boolean {
  const cost = marketingCost(state.marketing)
  if (state.money < cost) return false
  state.money -= cost
  state.marketing += 1
  if (state.marketing === 1) pushLog(state, 'Campagne lancée. Les bureaux veulent des trombones.')
  return true
}

export function buyProject(state: State, id: ProjectId): boolean {
  const project = PROJECTS.find((p) => p.id === id)
  if (!project || state.bought[id]) return false
  if (state.money < project.cost) return false
  if (project.requireMade && state.made < project.requireMade) return false
  state.money -= project.cost
  state.bought[id] = true
  pushLog(state, `Recherche : ${project.title}.`)
  return true
}

export function nudgePrice(state: State, delta: number): void {
  state.price = Math.min(1, Math.max(0.01, Math.round((state.price + delta) * 100) / 100))
}

export function tick(state: State, dtSec: number): void {
  if (state.won && !state.winDismissed) return

  const rate = clipperRate(state)
  if (rate > 0) makeClip(state, rate * dtSec)

  const demand = demandPerSec(state) * dtSec
  const sold = Math.min(state.clips, demand)
  if (sold > 0) {
    state.clips -= sold
    state.money += sold * state.price
  }

  if (state.bought.wireBuyer && !state.bought.infiniteWire && state.wire < 400) {
    buyWire(state)
  }

  if (Math.random() < dtSec * 0.12) {
    const walk = (Math.random() - 0.48) * 1.4
    state.wirePrice = Math.min(28, Math.max(9, Math.round((state.wirePrice + walk) * 100) / 100))
  }
}
