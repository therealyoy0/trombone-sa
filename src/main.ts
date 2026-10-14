import './style.css'
import {
  PROJECTS,
  SAVE_KEY,
  WIN_CLIPS,
  TICK_MS,
  buyClipper,
  buyMarketing,
  buyMega,
  buyProject,
  buyWire,
  clipperCost,
  clipperRate,
  demandPerSec,
  fmt,
  load,
  makeClip,
  marketingCost,
  megaCost,
  money,
  nudgePrice,
  save,
  tick,
  type State,
} from './game'

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T

const el = {
  made: $<HTMLParagraphElement>('made'),
  money: $<HTMLSpanElement>('money'),
  stock: $<HTMLSpanElement>('stock'),
  rate: $<HTMLSpanElement>('rate'),
  wire: $<HTMLElement>('wire'),
  wirePrice: $<HTMLElement>('wire-price'),
  wireWarn: $<HTMLParagraphElement>('wire-warn'),
  buyWire: $<HTMLButtonElement>('buy-wire'),
  clippers: $<HTMLSpanElement>('clippers'),
  clipperRate: $<HTMLParagraphElement>('clipper-rate'),
  buyClipper: $<HTMLButtonElement>('buy-clipper'),
  megaRow: $<HTMLDivElement>('mega-row'),
  megas: $<HTMLSpanElement>('megas'),
  buyMega: $<HTMLButtonElement>('buy-mega'),
  price: $<HTMLElement>('price'),
  demand: $<HTMLElement>('demand'),
  marketing: $<HTMLSpanElement>('marketing'),
  buyMkt: $<HTMLButtonElement>('buy-mkt'),
  projects: $<HTMLUListElement>('projects'),
  log: $<HTMLOListElement>('log'),
  make: $<HTMLButtonElement>('fabriquer'),
  win: $<HTMLDivElement>('win'),
  winBody: $<HTMLParagraphElement>('win-body'),
  saveHint: $<HTMLParagraphElement>('save-hint'),
}

let state: State = load()
let lastSave = 0

function renderProjects(): void {
  el.projects.replaceChildren()
  for (const project of PROJECTS) {
    const li = document.createElement('li')
    const copy = document.createElement('div')
    const title = document.createElement('h3')
    title.textContent = project.title
    const hint = document.createElement('p')
    hint.className = 'muted'
    hint.textContent = project.hint
    copy.append(title, hint)

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.className = 'btn'
    const owned = state.bought[project.id]
    const locked = Boolean(project.requireMade && state.made < project.requireMade)
    btn.disabled =
      owned || locked || state.money < project.cost || (state.won && !state.winDismissed)
    btn.textContent = owned
      ? 'Installé'
      : locked
        ? `Après ${fmt(project.requireMade ?? 0)} trombones`
        : `Rechercher · ${money(project.cost)}`
    btn.addEventListener('click', () => {
      if (buyProject(state, project.id)) draw()
    })
    li.append(copy, btn)
    el.projects.append(li)
  }
}

function draw(): void {
  el.made.textContent = fmt(Math.floor(state.made))
  el.money.textContent = money(state.money)
  el.stock.textContent = fmt(Math.floor(state.clips))
  el.rate.textContent = `${fmt(clipperRate(state), 1)} / s`
  el.wire.textContent = state.bought.infiniteWire ? 'illimité' : `${fmt(Math.floor(state.wire))} cm`
  el.wirePrice.textContent = money(state.wirePrice)
  el.clippers.textContent = String(state.clippers)
  el.clipperRate.textContent = state.bought.clipperMk2
    ? '1,10 trombone / s chacun'
    : '0,55 trombone / s chacun'
  el.megas.textContent = String(state.megas)
  el.price.textContent = money(state.price)
  el.demand.textContent = `${fmt(demandPerSec(state), 1)} / s`
  el.marketing.textContent = String(state.marketing)

  const freeze = state.won && !state.winDismissed
  const noWire = !state.bought.infiniteWire && state.wire < 1
  el.wireWarn.hidden = !noWire
  el.make.disabled = freeze || noWire
  el.buyWire.disabled = freeze || state.bought.infiniteWire || state.money < state.wirePrice
  el.buyWire.textContent = state.bought.infiniteWire
    ? 'Fil illimité'
    : `Acheter 1 000 cm de fil · ${money(state.wirePrice)}`
  el.buyClipper.disabled = freeze || state.money < clipperCost(state.clippers)
  el.buyClipper.textContent = `Acheter · ${money(clipperCost(state.clippers))}`
  el.megaRow.hidden = !state.bought.mega
  el.buyMega.disabled = freeze || !state.bought.mega || state.money < megaCost(state.megas)
  el.buyMega.textContent = `Acheter · ${money(megaCost(state.megas))}`
  el.buyMkt.disabled = freeze || state.money < marketingCost(state.marketing)
  el.buyMkt.textContent = `Campagne · ${money(marketingCost(state.marketing))}`

  el.log.replaceChildren()
  for (const line of state.log) {
    const li = document.createElement('li')
    li.textContent = line
    el.log.append(li)
  }

  renderProjects()

  const showWin = state.won && !state.winDismissed
  el.win.hidden = !showWin
  el.win.classList.toggle('is-open', showWin)
  if (showWin) {
    const mins = Math.max(1, Math.round((Date.now() - state.startedAt) / 60000))
    el.winBody.textContent = `${fmt(WIN_CLIPS)} unités. Société liquidée en ${mins} min.`
  }
}

function dismissWin(): void {
  if (!state.won) return
  state.winDismissed = true
  draw()
  persist(true)
}

function persist(force = false): void {
  const now = Date.now()
  if (!force && now - lastSave < 800) return
  lastSave = now
  save(state)
  el.saveHint.textContent = 'Sauvegardé'
}

function reset(): void {
  if (!confirm('Effacer la sauvegarde et recommencer ?')) return
  localStorage.removeItem(SAVE_KEY)
  state = load()
  draw()
  persist(true)
}

el.make.addEventListener('click', () => {
  if (makeClip(state, 1)) {
    if (state.made === 1) state.log.unshift('Premier trombone. Le fil a un goût de métal.')
    draw()
  }
})

document.getElementById('buy-wire')!.addEventListener('click', () => {
  if (buyWire(state)) draw()
})
document.getElementById('buy-clipper')!.addEventListener('click', () => {
  if (buyClipper(state)) draw()
})
document.getElementById('buy-mega')!.addEventListener('click', () => {
  if (buyMega(state)) draw()
})
document.getElementById('buy-mkt')!.addEventListener('click', () => {
  if (buyMarketing(state)) draw()
})
document.getElementById('price-down')!.addEventListener('click', () => {
  nudgePrice(state, -0.01)
  draw()
})
document.getElementById('price-up')!.addEventListener('click', () => {
  nudgePrice(state, 0.01)
  draw()
})
document.getElementById('reset')!.addEventListener('click', reset)
document.getElementById('win-continue')!.addEventListener('click', dismissWin)
document.getElementById('win-reset')!.addEventListener('click', () => {
  localStorage.removeItem(SAVE_KEY)
  state = load()
  draw()
  persist(true)
})
el.win.addEventListener('click', (event) => {
  if (event.target === el.win) dismissWin()
})

window.addEventListener('keydown', (event) => {
  if (event.code === 'Escape') {
    dismissWin()
    return
  }
  if (event.code !== 'Space') return
  const tag = (event.target as HTMLElement | null)?.tagName
  if (tag === 'BUTTON' || tag === 'INPUT' || tag === 'TEXTAREA') return
  event.preventDefault()
  if (makeClip(state, 1)) draw()
})

window.addEventListener('beforeunload', () => persist(true))

setInterval(() => {
  tick(state, TICK_MS / 1000)
  draw()
  persist()
}, TICK_MS)

draw()
