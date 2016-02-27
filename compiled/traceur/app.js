"use strict";
var irc = require('irc');
var Promise = require('bluebird');
var request = require('request');
var config = require('./config');
var fs = require('fs');
var size = require('request-image-size');
var IMAGE_PATTERN = /((http(s)?:\/\/|www.)\S+\.(jpeg|jpg|tiff|png|gif|bmp|svg)[\/]?)/g;
var URL_PATTERN = /((http(s)?:\/\/|www.)\S*)/g;
var VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate?key=';
var VISION_API_KEY = fs.readFileSync('api.key');
var SAFE_SEARCH_LIKELIHOOD = ['UNKNOWN', 'VERY_UNLIKELY', 'UNLIKELY', 'POSSIBLE', 'LIKELY', 'VERY_LIKELY'];
var bot = new irc.Client(config.irc.server, config.irc.nick, config.irc.options);
bot.addListener('message', function(from, to, text, message) {
  var matches = text.match(URL_PATTERN) || [];
  matches.forEach(function(img) {
    processUrl(img).then(function(json) {
      var labels = parseLabels(json);
      if (labels.length > 0) {
        bot.say(to, ("Image analysis: " + labels.join(', ')));
      }
      var safeSearch = parseSafeSearch(json);
      if (safeSearch.length > 0) {
        bot.say(to, ("Warning! The image may contain NSFW material (" + safeSearch.join(', ') + ")."));
      }
    }).catch(function(err) {
      console.log(err);
      bot.say(to, 'Could not process image :(');
    });
  });
});
bot.addListener('error', function(message) {
  console.log('Bot error: ', message);
});
bot.addListener('registered', function(message) {
  console.log(("Connected to server " + message.server));
});
bot.addListener('invite', function(channel, by, mode, argument, message) {
  bot.join(channel, function() {
    return console.log(("Joining channel " + channel + " from invitation of " + by + "."));
  });
});
function processUrl(url) {
  return Promise.promisify(request.get)({url: url}).then(getImageUrlFromHttpResponse).then(getBase64ImageFromUrl).then(getImageDetailsFromVisionApi);
  function getBase64ImageFromUrl(url) {
    console.log(("Processing image " + url));
    return Promise.promisify(request.get)({
      url: url,
      encoding: null
    }).then(function(response) {
      return response.body.toString('base64');
    }).catch(function(err) {
      console.log('Error!', err.statusCode + ': ' + err.statusMessage);
    });
  }
  function getImageUrlFromHttpResponse(response) {
    if (response.headers['content-type'].indexOf('image') !== -1) {
      return url;
    }
    var matches = response.body.match(IMAGE_PATTERN) || [];
    matches = Array.from(new Set(matches));
    return Promise.all(matches.map(function(url) {
      return getSize(url);
    })).then(function(result) {
      var sorted = result.sort(function(a, b) {
        return b.size - a.size;
      });
      return sorted[0].url;
    }).catch(function(err) {
      throw new Error(("Could not fetch image(s) from " + url));
    });
  }
  function getSize(url) {
    return Promise.promisify(size)({
      url: url,
      headers: {'User-Agent': 'request-image-size'}
    }).then(function(dimensions, length) {
      return {
        url: url,
        size: dimensions.width * dimensions.height
      };
    }).catch(function(err) {
      return {
        url: null,
        size: 0
      };
    });
  }
  function getImageDetailsFromVisionApi(base64String) {
    return Promise.promisify(request.post)({
      url: VISION_API_URL + VISION_API_KEY,
      headers: {'Content-Type': 'application/json'},
      body: createVisionApiRequestBody(base64String)
    }).then(function(response) {
      var json = JSON.parse(response.body);
      if (json.responses[0].error) {
        throw new Error(json.responses[0].error.message);
      }
      return json;
    }).catch(function(err) {
      console.log('Vision API error!', err);
    });
  }
  function createVisionApiRequestBody(base64String) {
    return JSON.stringify({'requests': [{
        'image': {'content': base64String},
        'features': [{
          'type': 'LABEL_DETECTION',
          'maxResults': 5
        }, {
          'type': 'SAFE_SEARCH_DETECTION',
          'maxResults': 1
        }]
      }]});
  }
}
function parseSafeSearch(json) {
  var categories = ['adult', 'spoof', 'medical', 'violence'];
  var safeSearch = [];
  categories.forEach(function(category) {
    if (isSafeSearchContent(json, category)) {
      safeSearch.push(category);
    }
  });
  return safeSearch;
  function isSafeSearchContent(json, category) {
    var likelihoodResult = SAFE_SEARCH_LIKELIHOOD.indexOf(json.responses[0].safeSearchAnnotation[category]);
    var safeSearchTolerance = SAFE_SEARCH_LIKELIHOOD.indexOf(config.safeSearchTolerance[category]);
    return safeSearchTolerance !== -1 && likelihoodResult >= safeSearchTolerance;
  }
}
function parseLabels(json) {
  var labels = [];
  var labelAnnotations = json.responses[0].labelAnnotations || [];
  labelAnnotations.forEach(function(label) {
    if (label.score >= config.labelThreshold) {
      labels.push(label.description);
    }
  });
  return labels;
}
