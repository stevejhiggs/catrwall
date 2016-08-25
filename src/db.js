const rethinkdbdash = require('rethinkdbdash');

const config = {
    db: 'cathorizon',
    servers: [
    {
      host: '127.0.0.1',
      port: 28015
    }
  ]
};

module.exports = rethinkdbdash(config);
