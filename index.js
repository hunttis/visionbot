'use strict';
const irc = require('irc');
const request = require('request-promise');
const config = require('./config');
const fs = require('fs');

/**
 * Starts with 'http://', 'https://' or 'www.', contains non-whitespace characters until
 * a supported file extension and optional dash at the end is found
 */
const IMAGE_PATTERN = /((http(s)?:\/\/|www.)\S+\.(jpeg|jpg|tiff|png|gif|bmp|svg)[\/]?)/g;
const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate?key=';
const VISION_API_KEY = fs.readFileSync('api.key');
const SAFE_SEARCH_LIKELIHOOD = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];

let bot = new irc.Client(config.irc.server, config.irc.nick, config.irc.options);

bot.addListener('message', function (from, to, text, message) {
  let matches = text.match(IMAGE_PATTERN) || [];
  matches.forEach(img => {
    getBase64ImageFromUrl(img)
      .then(getImageDetailsFromVisionApi)
      .then(json => {
        //analyze image
        let labels = parseLabels(json);
        if (labels.length > 0) {
          bot.say(to, `Image analysis: ${labels.join(', ')}`);
        }
        //warn about nsfw content
        let safeSearch = parseSafeSearch(json);
        if (safeSearch.length > 0) {
          bot.say(to, `Warning! The image may contain NSFW material (${safeSearch.join(', ') }).`);
        }
      }).catch(() => {
        bot.say(to, 'Could not process image :(');
      });
  });
});

bot.addListener('error', function (message) {
  console.log('Bot error: ', message);
});

function getBase64ImageFromUrl(url) {
  return request.get({url: url, encoding: null})
    .then(body => body.toString('base64'))
    .catch(err => {
      console.log('Error!', err.statusCode + ': ' + err.statusMessage);
    });
}

function getImageDetailsFromVisionApi(base64String) {
  return request.post({
    url: VISION_API_URL + VISION_API_KEY,
    headers: {'Content-Type': 'application/json'},
    body: createVisionApiRequestBody(base64String)
  }).then(obj => {
    let json = JSON.parse(obj);
    if (json.responses[0].error) {
      throw new Error(json.responses[0].error.message);
    }
    return json;
  }).catch(err => {
    console.log('Vision API error!', err);
  });
}

function createVisionApiRequestBody(base64String) {
  return JSON.stringify({
    'requests': [{
      'image': {
        'content': base64String
      },
      'features': [
        {'type': 'LABEL_DETECTION', 'maxResults': 5},
        {'type': 'SAFE_SEARCH_DETECTION', 'maxResults': 1}
      ]
    }]
  })
}

function parseSafeSearch(json) {
  let categories = ['adult', 'spoof', 'medical', 'violence'];
  let safeSearch = [];
  categories.forEach(category => {
    if (isSafeSearchContent(json, category)) {
      safeSearch.push(category);
    }
  });
  return safeSearch;
}

function isSafeSearchContent(json, category) {
  let likelihoodResult = SAFE_SEARCH_LIKELIHOOD.indexOf(json.responses[0].safeSearchAnnotation[category]);
  let safeSearchWarningLevel = SAFE_SEARCH_LIKELIHOOD.indexOf(config.safeSearchWarnings[category]);
  return safeSearchWarningLevel !== -1 && likelihoodResult >= safeSearchWarningLevel;
}

function parseLabels(json) {
  let labels = [];
  let labelAnnotations = json.responses[0].labelAnnotations || [];
  labelAnnotations.forEach(label => {
    if (label.score >= config.labelThreshold) {
      labels.push(label.description);
    }
  });
  return labels;
}