// FRONT-END (CLIENT) JAVASCRIPT HERE

import { Pane } from '/js/tweakpane/tweakpane.js'

// id of the row being edited
let editing = null

// the six values the tweakpane controls write into,
// read back out when the form is submitted
const DEFAULTS = {
  theory: '',
  category: 'government',
  conspirators: 100,
  yearsRunning: 5,
  notes: '',
  stillActive: true
}

const params = Object.assign({}, DEFAULTS)

let pane = null

const buildPane = function () {
  pane = new Pane({ container: document.querySelector('#pane') })

  pane.addBinding(params, 'theory', { label: 'theory' })
  pane.addBinding(params, 'category', {
    label: 'category',
    options: {
      Government: 'government',
      Corporate: 'corporate',
      Science: 'science',
      Other: 'other'
    }
  })
  // no max: editing a row keeps whatever number it already had
  pane.addBinding(params, 'conspirators', { label: 'conspirators', min: 1, step: 1 })
  pane.addBinding(params, 'yearsRunning', { label: 'years running', min: 0, step: 0.5 })
  pane.addBinding(params, 'notes', { label: 'notes' })
  pane.addBinding(params, 'stillActive', { label: 'still active' })
}

const load = async function () {
  const [me, response] = await Promise.all([fetch('/api/me'), fetch('/api/data')])

  // session expired or missing: back to the login page
  if (response.status === 401) return location.replace('/login.html')

  document.querySelector('#username').textContent = (await me.json()).username
  render(await response.json())
}

const render = function (data) {
  const list = document.querySelector('#list')

  list.innerHTML = ''
  data.forEach(function (row) {
    list.appendChild(cardFor(row))
  })
}

const cardFor = function (row) {
  const card = document.createElement('article')

  const header = document.createElement('header')
  header.className = 'card__header'

  const title = document.createElement('h2')
  title.className = 'card__title'
  title.textContent = row.theory

  const actions = document.createElement('div')
  actions.className = 'card__actions'

  const edit = document.createElement('button')
  edit.className = 'outline'
  edit.type = 'button'
  edit.textContent = 'Edit'
  edit.onclick = function () {
    startEdit(row)
  }

  const del = document.createElement('button')
  del.className = 'outline secondary'
  del.type = 'button'
  del.textContent = 'Delete'
  del.setAttribute('aria-label', 'Delete ' + row.theory)
  del.dataset.id = row.id
  del.onclick = remove

  actions.append(edit, del)
  header.append(title, actions)

  const verdict = document.createElement('p')
  verdict.className = 'verdict verdict--' + row.verdict.toLowerCase()
  verdict.textContent = row.verdict

  const meter = document.createElement('progress')
  meter.max = 100
  meter.value = row.exposureOdds * 100
  meter.setAttribute('aria-label', 'Chance the conspiracy has leaked')

  card.append(
    header,
    verdict,
    line(row.category + ' \u00b7 ' + (row.stillActive ? 'still active' : 'no longer active')),
    line(row.conspirators.toLocaleString() + ' conspirators'),
    line(row.yearsRunning + ' years running'),
    meter,
    line((row.exposureOdds * 100).toFixed(1) + '% chance it has leaked'),
    line('expected reveal in ' + formatYears(row.yearsUntilExposed))
  )
  if (row.notes) {
    const notes = line(row.notes)
    notes.className = 'card__notes'
    card.appendChild(notes)
  }

  return card
}

const line = function (text) {
  const p = document.createElement('p')
  p.className = 'card__line'
  p.textContent = text

  return p
}

const formatYears = function (years) {
  if (years < 1) return Math.round(years * 12) + ' months'
  if (years < 1000) return years.toFixed(1) + ' years'

  return Math.round(years).toLocaleString() + ' years'
}

const openDialog = function () {
  document.querySelector('#entryDialog').showModal()

  const first = document.querySelector('#pane input')
  if (first) first.focus()
}

const startEdit = function (row) {
  editing = row.id

  params.theory = row.theory
  params.category = row.category || 'other'
  params.conspirators = row.conspirators
  params.yearsRunning = row.yearsRunning
  params.notes = row.notes || ''
  params.stillActive = row.stillActive !== false
  pane.refresh()

  document.querySelector('#formError').hidden = true
  document.querySelector('#formTitle').textContent = 'Edit Conspiracy'
  document.querySelector('#submit').textContent = 'Save Changes'
  openDialog()
}

const remove = async function (event) {
  const response = await fetch('/api/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: event.target.dataset.id })
  })

  render(await response.json())
}

const submit = async function (event) {
  // stop form submission from trying to load
  // a new .html page for displaying results...
  // this was the original browser behavior and still
  // remains to this day
  event.preventDefault()

  // We need this because tweakpane has no required field handling
  if (params.theory.trim() === '') {
    document.querySelector('#formError').hidden = false
    return
  }

  const json = Object.assign({}, params)

  if (editing !== null) json.id = editing

  const response = await fetch(editing === null ? '/api/add' : '/api/edit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(json)
  })

  render(await response.json())
  reset()
}

const reset = function () {
  editing = null

  Object.assign(params, DEFAULTS)
  pane.refresh()

  document.querySelector('#formError').hidden = true
  document.querySelector('#formTitle').textContent = 'New Conspiracy'
  document.querySelector('#submit').textContent = 'Add Conspiracy'
  document.querySelector('#entryDialog').close()
}

window.onload = function () {
  buildPane()

  document.querySelector('#newBtn').onclick = function () {
    reset()
    openDialog()
  }
  document.querySelector('#cancel').onclick = reset
  document.querySelector('#entryForm').onsubmit = submit

  // the server sends new accounts here with ?created=1
  if (new URLSearchParams(location.search).get('created') === '1') {
    document.querySelector('#created').hidden = false
    history.replaceState(null, '', '/')
  }

  load()
}
