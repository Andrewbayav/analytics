// here we customize our report's
// styles and params for apexCharts

let overviewCustom = {
  // colors of events
  moreThan100: '#2875fb',
  moreThan50: '#2671ed',
  moreThan25: '#53b3ed',
  lessThan25: '#bae5ed',
}

let heatmapCustom = {
  // color gamma
  colors: '#53b3ed',
}

let donutsCustom = {
  percentColor: '#ffffff',
  donutSize: '50%',
  customScale: 0.8,
  colors : ['#457a8b',
            '#058b43',
            '#ffc927',
            '#74508b',
            '#8b2a17',
            '#60758b',
            '#6b348b',
            '#84868b',
            '#8b573e',
            '#8b0f30',
            '#1f1b8b',
            '#0d5c8b',
            '#5a8b59'],
}

export {
  overviewCustom,
  heatmapCustom,
  donutsCustom
};
