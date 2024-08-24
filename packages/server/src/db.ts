import rethinkdbdash from 'rethinkdbdash';

const config = {
    db: 'cathorizon',
    servers: [
    {
      host: process.env.RETHINKHOST || 'localhost',
      port: 28015
    }
  ]
};

export default rethinkdbdash(config);
