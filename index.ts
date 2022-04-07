import * as fs from 'fs'
import fetch from 'node-fetch'
import { TwitterApi } from 'twitter-api-v2'

const DEXCOM_APPLICATION_ID = 'd89443d2-327c-4a6f-89e5-496bbb0317db'
const TEMPORARY_IMAGE_PATH = './image.png'

const TWITTER = {
  appKey: process.env.TWITTER_APP_KEY!!!,
  appSecret: process.env.TWITTER_APP_SECRET!!!,
  accessToken: process.env.TWITTER_ACCESS_TOKEN!!!,
  accessSecret: process.env.TWITTER_ACCESS_SECRET!!!,
}

const DEXCOM = {
  email: process.env.DEXCOM_EMAIL!!!,
  password: process.env.DEXCOM_PASSWORD!!!,
}

type Entry = {
  timestamp: string,
  estimatedValue: number|null,
}

// CHART

const QUICKCHART = 'https://quickchart.io/chart'

const chartUrl = (entries: Entry[], title: string) =>
  `${QUICKCHART}?` + [
    `c=${JSON.stringify(chartOptions(entries, title))}`,
    'width=600',
    'height=200',
    'backgroundColor=white',
  ].join('&')

const chartOptions = (entries: Entry[], title: string) => ({
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
        color: 'white',
        borderRadius: 3,
        font: {
          size: 6,
        },
      },
    },
  },
})

// DEXCOM

const getAccountId = async (accountName: string, password: string): Promise<string> => {
  const body = {
    accountName,
    password,
    applicationId: DEXCOM_APPLICATION_ID,
  }
  const url = 'https://shareous1.dexcom.com/ShareWebServices/Services/General/AuthenticatePublisherAccount'
  return post(body, url) as Promise<string>
}

const getSessionId = async (accountId: string, password: string): Promise<string> => {
  const body = {
    accountId,
    password,
    applicationId: DEXCOM_APPLICATION_ID,
  }
  const url = 'https://shareous1.dexcom.com/ShareWebServices/Services/General/LoginPublisherAccountById'
  return post(body, url) as Promise<string>
}

const getEstimatedGlucoseValues = async (sessionId: string): Promise<Entry[]> => {
  const body = {
    maxCount: 144, // 12 hours = 1 entry every 5 minutes
    minutes: 720,
    sessionId,
  }
  const url = 'https://shareous1.dexcom.com/ShareWebServices/Services/Publisher/ReadPublisherLatestGlucoseValues'
  // The API returns something like:
  // [{
  //   "WT":"Date(1649148591000)",
  //   "ST":"Date(1649148591000)",
  //   "DT":"Date(1649148591000+0200)",
  //   "Value":116,
  //   "Trend":"Flat"
  // }]
  const data = await post(body, url) as { Value: number, DT: string }[]
  const parsed = data.map(entry => {
    const [_1, epochWithTz] = entry.DT.match(/Date\((.+)\)/)!!!
    const [_2, timestamp] = convertToLocalTime(epochWithTz).match(/.+T(\d\d:\d\d):.+/)!!!
    return {
      estimatedValue: entry.Value,
      timestamp,
    }
  })

  return parsed.reverse()
}

const post = async (body: Record<PropertyKey, unknown>, url: string): Promise<unknown> => {
  try {
    const result = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (result.status !== 200) { throw new Error(`Status: ${result.status}`) }
    return await result.json()
  } catch(error) {
    throw new Error(`Request failed with error: ${error}`)
  }
}

const convertToLocalTime = (epochWithTz: string): string => {
  const [_, epoch, sign, offset] = epochWithTz.match(/(\d+)([-+])(\d+)/)!!!
  const date = new Date(parseInt(epoch, 10))
  const iso = date.toISOString().slice(0, -1) + (sign === '-' ? '+' : '-')  + offset
  const dateInLocalTime = new Date(iso)
  return dateInLocalTime.toISOString().slice(0, -1) + `${sign}${offset}`
}

const fromDexcom = async () => {
  const accountId = await getAccountId(DEXCOM.email, DEXCOM.password)
  // `sessionId` seems to be valid for ~24 hours
  const sessionId = await getSessionId(accountId, DEXCOM.password)
  const entries = await getEstimatedGlucoseValues(sessionId)
  await download(chartUrl(entries, 'Realtime Blood Sugarz (CET timezone)'), TEMPORARY_IMAGE_PATH)
  await updateTwitterBanner(TEMPORARY_IMAGE_PATH)
}

const download = async (url: string, path: string): Promise<void> => {
  const response = await fetch(url).then(x => x.body)
  const fileStream = fs.createWriteStream(path)
  await new Promise((resolve, reject) => {
    response.pipe(fileStream)
    response.on('error', reject)
    fileStream.on('finish', () => fileStream.close(resolve))
  })
}

const updateTwitterBanner = async (file: string): Promise<void> => {
  const client = new TwitterApi(TWITTER)
  await client.v1.updateAccountProfileBanner(file)
}

// RUN

fromDexcom()
