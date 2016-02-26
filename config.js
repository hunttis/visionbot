const env = process.env.NODE_ENV || 'development';
const config = {
  development: {
    irc: {
      server: 'irc.elisa.fi',
      nick: 'VisionBot',
      options: {
        channels: ['#nsfwbot'],
        port: 6667
      }
    },
    labelThreshold: 0.8,
    safeSearchWarnings: {
      adult: 'POSSIBLE',
      spoof: '',
      medical: 'POSSIBLE',
      violence: 'VERY_LIKELY'
    }
  },
  production: {
    irc: {
      channels: [],
      server: 'irc.elisa.fi',
      port: 6667,
      botName: 'VisionBot'
    },
    labelThreshold: 0.8,
    safeSearchWarnings: {
      adult: 'POSSIBLE',
      spoof: '',
      medical: 'POSSIBLE',
      violence: 'VERY_LIKELY'
    }
  }
};
module.exports = config[env];