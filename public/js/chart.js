// LEAK CURVE CHART (D3)
// odds(t) = 1 - e^(-conspirators * leakRate * t)

import { Pane } from '/js/tweakpane/tweakpane.js'

const d3 = window.d3

const GRIMES_RATE = 4.09 // leaks per million people per year

const CATEGORY_COLORS = {
  government: '#3987e5',
  corporate: '#d95926',
  science: '#199e70',
  other: '#a39e93'
}

const CATEGORY_NAMES = {
  government: 'Government',
  corporate: 'Corporate',
  science: 'Science',
  other: 'Other'
}

const BANDS = [
  { name: 'AIRTIGHT', from: 0, to: 0.05 },
  { name: 'HOLDING', from: 0.05, to: 0.5 },
  { name: 'LEAKING', from: 0.5, to: 0.95 },
  { name: 'BUSTED', from: 0.95, to: 1 }
]

const MARGIN = { top: 12, right: 84, bottom: 40, left: 48 }
const HEIGHT = 360
const SAMPLES = 200
const TOOLTIP_ROWS = 8

// the tweakpane controls write into this
const settings = {
  leakRate: GRIMES_RATE,
  horizon: 100,
  logTime: true,
  showNow: true
}

let rows = []
let highlighted = null
// null draws them all
let solo = null
// the year the cursor is on, null otherwise
let scrubYear = null

let root, box, svg, plot, tooltip, legend, empty

const colorFor = (row) => CATEGORY_COLORS[row.category] || CATEGORY_COLORS.other

const oddsAt = function (row, years) {
  return 1 - Math.exp(-row.conspirators * (settings.leakRate / 1e6) * years)
}

const visibleRows = function () {
  if (solo === null) return rows
  return rows.filter((row) => row.id === solo)
}

const timeDomain = function () {
  // a log scale can't start at zero
  return settings.logTime ? [0.1, settings.horizon] : [0, settings.horizon]
}

const sampleTimes = function () {
  const [min, max] = timeDomain()

  return d3.range(SAMPLES + 1).map(function (i) {
    const f = i / SAMPLES
    return settings.logTime ? min * Math.pow(max / min, f) : min + (max - min) * f
  })
}

const formatYear = function (years) {
  if (years < 1) return Math.round(years * 12) + ' months'
  return d3.format(',.1~f')(years) + ' years'
}

const formatOdds = function (odds) {
  if (odds > 0.999) return '>99.9%'
  if (odds > 0 && odds < 0.001) return '<0.1%'
  return (odds * 100).toFixed(1) + '%'
}

// ---------- drawing ----------

const draw = function () {
  const width = box.clientWidth
  const innerW = Math.max(100, width - MARGIN.left - MARGIN.right)
  const innerH = HEIGHT - MARGIN.top - MARGIN.bottom

  const x = (settings.logTime ? d3.scaleLog() : d3.scaleLinear()).domain(timeDomain()).range([0, innerW])
  const y = d3.scaleLinear().domain([0, 1]).range([innerH, 0])

  svg.attr('width', width).attr('height', HEIGHT).attr('viewBox', [0, 0, width, HEIGHT])
  plot.attr('transform', `translate(${MARGIN.left},${MARGIN.top})`)
  plot.selectAll('*').remove()

  // verdict bands
  const bands = plot.append('g').attr('class', 'chart__bands')
  bands.selectAll('rect')
    .data(BANDS)
    .join('rect')
    .attr('x', 0)
    .attr('width', innerW)
    .attr('y', (b) => y(b.to))
    .attr('height', (b) => y(b.from) - y(b.to))
    .attr('class', (b, i) => (i % 2 ? 'chart__band chart__band--alt' : 'chart__band'))
  bands.selectAll('text')
    .data(BANDS)
    .join('text')
    .attr('class', 'chart__band-label')
    .attr('x', innerW + 8)
    .attr('y', (b) => (y(b.from) + y(b.to)) / 2)
    .attr('dy', '0.35em')
    .text((b) => b.name)

  // axes
  const xAxis = d3.axisBottom(x).tickFormat(d3.format(',~g')).tickSizeOuter(0)
  if (settings.logTime) xAxis.tickValues(x.ticks().filter((t) => Number.isInteger(Math.log10(t))))
  else xAxis.ticks(Math.max(2, Math.floor(innerW / 90)))

  plot.append('g')
    .attr('class', 'chart__axis')
    .attr('transform', `translate(0,${innerH})`)
    .call(xAxis)
  plot.append('text')
    .attr('class', 'chart__axis-title')
    .attr('x', innerW)
    .attr('y', innerH + 34)
    .attr('text-anchor', 'end')
    .text('years the secret has been kept')

  plot.append('g')
    .attr('class', 'chart__axis')
    .call(d3.axisLeft(y).tickValues([0, 0.05, 0.5, 0.95, 1]).tickFormat(d3.format('.0%')).tickSizeOuter(0))
  plot.append('g')
    .attr('class', 'chart__grid')
    .selectAll('line')
    .data([0.05, 0.5, 0.95])
    .join('line')
    .attr('x1', 0)
    .attr('x2', innerW)
    .attr('y1', y)
    .attr('y2', y)

  const data = visibleRows()
  empty.hidden = data.length > 0

  const hot = data.some((row) => row.id === highlighted) ? highlighted : null

  // curves
  const times = sampleTimes()
  const line = d3.line().x((d) => x(d[0])).y((d) => y(d[1]))

  plot.append('g')
    .attr('class', 'chart__curves')
    .selectAll('path')
    .data(data, (row) => row.id)
    .join('path')
    .attr('class', 'chart__curve')
    .classed('is-dim', (row) => hot !== null && row.id !== hot)
    .classed('is-hot', (row) => row.id === hot)
    .attr('stroke', colorFor)
    .attr('d', (row) => line(times.map((t) => [t, oddsAt(row, t)])))

  if (settings.showNow) {
    const [min, max] = timeDomain()
    plot.append('g')
      .selectAll('circle')
      .data(data.filter((row) => row.yearsRunning >= min && row.yearsRunning <= max))
      .join('circle')
      .attr('class', 'chart__now')
      .classed('is-dim', (row) => hot !== null && row.id !== hot)
      .attr('r', 5)
      .attr('fill', colorFor)
      .attr('cx', (row) => x(row.yearsRunning))
      .attr('cy', (row) => y(oddsAt(row, row.yearsRunning)))
  }

  const cross = plot.append('g').attr('class', 'chart__cross')

  const overlay = plot.append('rect')
    .attr('class', 'chart__overlay')
    .attr('width', innerW)
    .attr('height', innerH)
    .attr('tabindex', 0)
    .attr('role', 'img')
    .attr('aria-label', 'Leak chance over time. Use the left and right arrow keys to move through the years.')

  const drawCross = function () {
    cross.selectAll('*').remove()
    tooltip.hidden = true
    if (scrubYear === null || data.length === 0) return

    const px = x(scrubYear)
    cross.append('line')
      .attr('class', 'chart__hairline')
      .attr('x1', px)
      .attr('x2', px)
      .attr('y1', 0)
      .attr('y2', innerH)
    cross.selectAll('circle')
      .data(data)
      .join('circle')
      .attr('class', 'chart__dot')
      .attr('r', 4)
      .attr('fill', colorFor)
      .attr('cx', px)
      .attr('cy', (row) => y(oddsAt(row, scrubYear)))

    fillTooltip(data)

    // flip to the left side of the hairline near the right edge
    const left = MARGIN.left + px
    const flip = left + tooltip.offsetWidth + 16 > width
    tooltip.style.left = Math.max(0, flip ? left - tooltip.offsetWidth - 12 : left + 12) + 'px'
  }

  const setYear = function (year) {
    const [min, max] = timeDomain()
    scrubYear = Math.min(max, Math.max(min, year))
    drawCross()
  }

  overlay
    .on('pointermove', function (event) {
      setYear(x.invert(d3.pointer(event)[0]))
    })
    .on('pointerleave', function () {
      scrubYear = null
      drawCross()
    })
    .on('keydown', function (event) {
      const [min, max] = timeDomain()
      const step = settings.logTime ? null : (max - min) / 50
      const current = scrubYear === null ? min : scrubYear
      let next = null

      if (event.key === 'ArrowRight') next = step ? current + step : current * 1.1
      if (event.key === 'ArrowLeft') next = step ? current - step : current / 1.1
      if (next === null) return

      event.preventDefault()
      setYear(next)
    })
    .on('blur', function () {
      scrubYear = null
      drawCross()
    })

  drawCross()
}

const fillTooltip = function (data) {
  tooltip.replaceChildren()

  const title = document.createElement('p')
  title.className = 'chart__tip-title'
  title.textContent = 'After ' + formatYear(scrubYear)
  tooltip.appendChild(title)

  const sorted = data
    .map((row) => ({ row, odds: oddsAt(row, scrubYear) }))
    .sort((a, b) => b.odds - a.odds)

  sorted.slice(0, TOOLTIP_ROWS).forEach(function ({ row, odds }) {
    const item = document.createElement('p')
    item.className = 'chart__tip-row'
    if (row.id === highlighted) item.classList.add('is-hot')

    const key = document.createElement('span')
    key.className = 'chart__key'
    key.style.background = colorFor(row)

    const value = document.createElement('strong')
    value.textContent = formatOdds(odds)

    const name = document.createElement('span')
    name.className = 'chart__tip-name'
    name.textContent = row.theory

    item.append(key, value, name)
    tooltip.appendChild(item)
  })

  if (sorted.length > TOOLTIP_ROWS) {
    const more = document.createElement('p')
    more.className = 'chart__tip-name'
    more.textContent = '+ ' + (sorted.length - TOOLTIP_ROWS) + ' more'
    tooltip.appendChild(more)
  }

  tooltip.hidden = false
}

const drawLegend = function () {
  legend.replaceChildren()

  const present = new Set(visibleRows().map((row) => row.category || 'other'))
  Object.keys(CATEGORY_COLORS).forEach(function (category) {
    if (!present.has(category)) return

    const item = document.createElement('span')
    item.className = 'chart__legend-item'

    const key = document.createElement('span')
    key.className = 'chart__key'
    key.style.background = CATEGORY_COLORS[category]

    item.append(key, document.createTextNode(CATEGORY_NAMES[category]))
    legend.appendChild(item)
  })
}

const redraw = function () {
  drawLegend()
  draw()
}

// ---------- setup ----------

const buildPane = function (container) {
  const pane = new Pane({ container })

  pane.addBinding(settings, 'leakRate', {
    label: 'leak rate',
    min: 0.5,
    max: 50,
    step: 0.01
  })
  pane.addBinding(settings, 'horizon', { label: 'years shown', min: 1, max: 1000, step: 1 })
  pane.addBinding(settings, 'logTime', { label: 'log time' })
  pane.addBinding(settings, 'showNow', { label: 'today dots' })

  pane.addButton({ title: 'Reset to Grimes rate' }).on('click', function () {
    settings.leakRate = GRIMES_RATE
    pane.refresh()
  })

  pane.on('change', function () {
    scrubYear = null
    redraw()
  })
}

export const createChart = function ({ chart, pane }) {
  root = chart
  legend = root.querySelector('.chart__legend')
  empty = root.querySelector('.chart__empty')
  tooltip = root.querySelector('.chart__tooltip')

  // the plot box sits inside the card padding, the svg and tooltip measure against it
  box = document.createElement('div')
  box.className = 'chart__plot'
  root.appendChild(box)
  box.appendChild(tooltip)
  svg = d3.select(box).append('svg').attr('class', 'chart__svg')
  plot = svg.append('g')

  buildPane(pane)
  new ResizeObserver(() => draw()).observe(box)

  return {
    update: function (data) {
      rows = data
      if (!rows.some((row) => row.id === highlighted)) highlighted = null
      if (!rows.some((row) => row.id === solo)) solo = null
      redraw()
    },
    solo: function (id) {
      solo = id
      scrubYear = null
      redraw()
    },
    highlight: function (id) {
      highlighted = id
      draw()
    }
  }
}
