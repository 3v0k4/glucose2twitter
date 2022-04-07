# https://quickchart.io/documentation
# https://www.chartjs.org/chartjs-plugin-annotation/latest/guide/types/line.html
# https://www.chartjs.org/docs/2.9.4/charts/line.html
# https://chartjs-plugin-datalabels.netlify.app
# https://v0_7_0--chartjs-plugin-datalabels.netlify.app/samples/index.html
# https://github.com/janko/down

require 'json'
require 'base64'
require 'down'

raw = "		120		133			109		133		98				116						87		114				97		96																		"
labels = ["06:00", "06:30", "07:00", "07:30", "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00", "22:30", "23:00", "23:30", "00:00", "00:30", "01:00", "01:30", "02:00", "02:30", "03:00", "03:30", "04:00", "04:30", "05:00", "05:30"]
data = raw.gsub(/\t/, ',').split(',').map(&:to_i).map { _1 == 0 ? nil : _1 }
alt = labels.zip(data).reject { _1.last.nil? }.map { "#{_1.last} at #{_1.first}" }.join(', ')
puts alt

BASE = "https://quickchart.io/chart"
chart = {
  type: 'line',
  data: {
    labels: labels,
    datasets: [{
      label: "Today's Blood Sugarz",
      data: data,
      fill: false,
      pointBackgroundColor: 'black',
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
        display: true,
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
}

url = "#{BASE}?c=#{chart.to_json}&width=600&height=200&backgroundColor=white"
puts url
File.open('b64', 'wb') { _1.write(Base64.encode64(Down.download(url).read)) }
exec 'twurl -t -d "banner=$(cat b64)" "/1.1/account/update_profile_banner.json"' if ENV.fetch('TWEET', 'false') == 'true'
