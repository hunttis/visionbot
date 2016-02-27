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
    safeSearchTolerance: {
      adult: 'POSSIBLE',
      spoof: '',
      medical: 'POSSIBLE',
      violence: 'VERY_LIKELY'
    }
  },
  production: {
    irc: {
      server: 'irc.ihme.org',
      nick: 'VisionBot',
      options: {
        channels: ['#ihme'],
        port: 6667
      }
    },
    labelThreshold: 0.8,
    safeSearchTolerance: {
      adult: 'POSSIBLE',
      spoof: '',
      medical: 'POSSIBLE',
      violence: 'VERY_LIKELY'
    }
  }
};
module.exports = config[env];