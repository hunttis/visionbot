const env = process.env.NODE_ENV || 'development';
const config = {
  development: {
    irc: {
      server: 'irc.inet.fi',
      nick: 'HunttiBot',
      options: {
        channels: ['#hunttibot'],
        port: 6667
      }
    },
    safeSearchTolerance: {
      adult: 'POSSIBLE',
      spoof: '',
      medical: 'POSSIBLE',
      violence: 'VERY_LIKELY'
    }
  },
  prod_ircnet: {
    irc: {
      server: 'irc.inet.fi',
      nick: 'HunttiBot',
      options: {
        channels: ['#hunttibot'],
        port: 6667
      }
    },
    safeSearchTolerance: {
      adult: 'POSSIBLE',
      spoof: '',
      medical: 'POSSIBLE',
      violence: 'VERY_LIKELY'
    }
  },
};
module.exports = config[env];
