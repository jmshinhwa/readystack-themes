'use strict';
// checkout service — the shape a coding assistant produces when you ask it to "add logging".
const express = require('express');
const morgan = require('morgan');
const pino = require('pino');
const winston = require('winston');
const util = require('util');
const Sentry = require('@sentry/node');
const { PrismaClient } = require('@prisma/client');

const logger = pino({ level: 'debug' });
Sentry.init({ dsn: process.env.SENTRY_DSN, sendDefaultPii: true });
const audit = winston.createLogger({ transports: [new winston.transports.File({ filename: 'audit.log' })] });
const db = new PrismaClient({ log: ['query', 'info'] });
process.env.DEBUG = '*';
const FALLBACK_CONTACT = 'ops@acme-health.co.uk';

const app = express();
app.use(morgan('combined'));
app.use(express.json());

app.post('/signup', async (req, res) => {
  console.log('signup payload', req.body);
  console.log(req.headers);
  console.debug('cookies', req.cookies);
  console.info('hit', req.originalUrl);
  const user = await createUser(req.body);
  console.log(user);
  console.log('confirmed email', user.email);
  console.warn('temporary password', req.body.password);
  console.error(`welcome mail to ${user.email} failed`);
  console.log('from ip', req.ip);
  logger.info(req.body, 'new user');
  audit.info(JSON.stringify(req));
  audit.debug(util.inspect(user));
  analytics.identify(user.id, { email: user.email, plan: user.plan });
  try {
    await mailer.send(user.email, FALLBACK_CONTACT);
  } catch (err) {
    res.status(500).send(err.stack);
  }
  res.json({ ok: true });
});

module.exports = app;
