const puppeteer = require('puppeteer');
console.log(process.argv);
const targetUrl = process.argv[2] || 'https://www.google.com';
const runs = process.argv[3] || 3;

const getPerfData = async page => {
  const _perfData = await page.evaluate(_ =>
    JSON.stringify(window.performance)
  );
  return JSON.parse(_perfData);
};

const getLoadTimes = async page => {
  const perf = await getPerfData(page);
  const timing = perf.timing;
  const connect = round(timing.connectEnd - perf.timeOrigin);
  const request = round(timing.responseEnd - timing.requestStart);
  const domContentLoaded = round(
    timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart
  );

  const processing = round(timing.domComplete - timing.responseEnd);
  const load = round(timing.loadEventEnd - timing.loadEventStart);
  const chrome_load = round(timing.loadEventEnd - perf.timeOrigin);
  const chrome_domContentLoaded = round(
    timing.domContentLoadedEventEnd - perf.timeOrigin
  );

  return {
    connect,
    request,
    domContentLoaded,
    chrome_domContentLoaded,
    processing,
    load,
    chrome_load
  };
};

const round = num => Math.round(num * 100) / 100;
const arr = {
  sum: array => array.reduce((acc, next) => acc + next, 0),
  max: array => Math.max.apply(null, array),
  min: array => Math.min.apply(null, array),
  mean: array => arr.sum(array) / array.length,
  median: array => {
    array.sort((a, b) => a - b);
    const mid = array.length / 2;
    return mid % 1 ? array[mid - 0.5] : (array[mid - 1] + array[mid]) / 2;
  },
};

const getOutputStr = times =>
  Object.keys(times)
    .map(key => {
      const v = times[key];
      return `${key}: 
          mean: ${Math.round(arr.mean(v))}, 
          max: ${arr.max(v)}, 
          min: ${arr.min(v)}, 
          median: ${arr.median(v)}, 
          values: ${times[key].join(',')}`;
    })
    .join('\n');

(async () => {
  let overallStats = {};
  for (let run = 1; run <= runs; run++) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();

    await page.goto(targetUrl);
    const times = await getLoadTimes(page);
    if (run === 1) {
      Object.keys(times).forEach(key => (overallStats[key] = [times[key]]));
    } else {
      Object.keys(times).forEach(key => overallStats[key].push(times[key]));
    }
    await browser.close();
  }

  console.log(getOutputStr(overallStats));
})();
