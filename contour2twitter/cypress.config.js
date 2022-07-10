const { defineConfig } = require('cypress')
const fs = require('fs')
const fetch = require('node-fetch')
const TwitterApi = require('twitter-api-v2').TwitterApi

const DOWNLOADS_PATH = './cypress/downloads'
const IMAGE_PATH = `${DOWNLOADS_PATH}/image.png`

const TWITTER = {
  appKey: process.env.TWITTER_APP_KEY,
  appSecret: process.env.TWITTER_APP_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
}

const env = {
  contourEmail: process.env.CONTOUR_EMAIL,
  contourPassword: process.env.CONTOUR_PASSWORD,
}

const QUICKCHART = 'https://quickchart.io/chart'

const chartUrl = (entries, title) =>
  `${QUICKCHART}?` + [
    `c=${JSON.stringify(chartOptions(entries, title))}`,
    'width=600',
    'height=200',
    'backgroundColor=white',
  ].join('&')

const chartOptions = (entries, title) => ({
  type: 'line',
  data: {
    labels: entries.map(x => x.timestamp),
    datasets: [{
      label: title,
      data: entries.map(x => x.estimatedValue),
      fill: false,
      pointBackgroundColor: 'pink',
      pointBorderColor: 'pink',
      borderColor: 'pink',
      spanGaps: true,
    }],
  },
  options: {
    annotation: {
      annotations: [{
        type: 'line',
        mode: 'horizontal',
        scaleID: 'y-axis-0',
        value: 60,
        borderColor: 'blue',
        borderWidth: 0.3,
        label: {
          enabled: true,
          content: 'Min',
          position: 'right',
          fontSize: 6,
        },
      }, {
        type: 'line',
        mode: 'horizontal',
        scaleID: 'y-axis-0',
        value: 130,
        borderColor: 'blue',
        borderWidth: 0.3,
        label: {
          enabled: true,
          content: 'Max',
          position: 'right',
          fontSize: 6,
        },
      }],
    },
    plugins: {
      datalabels: {
        display: entries.map(x => x.estimatedValue).length < 50,
        align: 'bottom',
        backgroundColor: 'light-black',
        color: 'black',
        borderRadius: 3,
        font: {
          size: 6,
        },
      },
    },
  },
})

const download = async (url, path) => {
  const response = await fetch(url).then(x => x.body)
  const fileStream = fs.createWriteStream(path)
  return new Promise((resolve, reject) => {
    response.pipe(fileStream)
    response.on('error', reject)
    fileStream.on('finish', () => fileStream.close(resolve))
  })
}

const parseCsv = () => {
  const filename = fs.readdirSync(DOWNLOADS_PATH)[0]
  const csv = fs.readFileSync(`${DOWNLOADS_PATH}/${filename}`, 'utf8')
  return csv
    .split('\n')
    .slice(1)
    .map(line => line.split(','))
    .map(([date, value]) => ({ timestamp: new Date(date), estimatedValue: value }))
}

const graphData = (entries) => {
  const entryAt = (time, entries) => {
    const entry = entries.find(e => Math.abs(e.timestamp.getTime() - time) < 1000*60*15)
    return { estimatedValue: entry && entry.estimatedValue, timestamp: new Date(time) }
  }
  const twelveHoursAgo = (new Date()).getTime() - 12*60*60*1000
  const times = Array(24).fill(0).reduce((acc, _) => [...acc, acc[acc.length-1]+1000*60*30], [twelveHoursAgo])
  return times
    .map(time => entryAt(time, entries))
    .map(entry => {
      const timestamp = [
        entry.timestamp.getHours(),
        entry.timestamp.getMinutes(),
      ]
        .map(part => String(part).padStart(2, '0'))
        .join(':')
      return { estimatedValue: entry.estimatedValue, timestamp }
    })
}

module.exports = defineConfig({
  video: false,
  env,
  e2e: {
    setupNodeEvents(on, config) {
      on('task', {
        async updateTwitterBanner() {
          const entries = parseCsv()
          const dataset = graphData(entries)
          const url = chartUrl(dataset, 'Blood Sugarz')
          await download(url, IMAGE_PATH)
          const client = new TwitterApi(TWITTER)
          await client.v1.updateAccountProfileBanner(IMAGE_PATH)
          fs.rmSync(DOWNLOADS_PATH, { recursive: true, force: true })
          return null
        },
      })
    },
  }
})
