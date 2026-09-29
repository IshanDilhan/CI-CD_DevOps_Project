const express = require('express');
const path = require('node:path');
require('dotenv').config();

function createApp(pool, publicDir = path.join(__dirname, 'public')) {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '16kb' }));
  const route = fn => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
  app.get('/health', route(async (req, res) => {
    try {
      await pool.query('SELECT todo_id FROM todo LIMIT 0');
      res.json({ status: 'ok' });
    } catch (_) {
      res.status(503).json({ status: 'unavailable' });
    }
  }));
  app.param('id', (req, res, next, id) => {
    if (!/^[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id))) {
      return res.status(400).json({ error: 'Invalid todo ID' });
    }
    next();
  });
  function description(req, res, next) {
    const value = req.body.description;
    if (typeof value !== 'string' || !value.trim() || value.length > 255) {
      return res.status(400).json({ error: 'Description must contain 1-255 characters' });
    }
    next();
  }
  app.get('/todos', route(async (req, res) => {
    res.json((await pool.query('SELECT * FROM todo ORDER BY todo_id')).rows);
  }));
  app.get('/todos/:id', route(async (req, res) => {
    res.json((await pool.query('SELECT * FROM todo WHERE todo_id = $1', [req.params.id])).rows);
  }));
  app.post('/todos', description, route(async (req, res) => {
    res.status(201).json((await pool.query('INSERT INTO todo (description) VALUES ($1) RETURNING *', [req.body.description])).rows);
  }));
  app.put('/todos/:id', description, route(async (req, res) => {
    await pool.query('UPDATE todo SET description = $1 WHERE todo_id = $2', [req.body.description, req.params.id]);
    res.json('Todo was updated!');
  }));
  app.delete('/todos/:id', route(async (req, res) => {
    await pool.query('DELETE FROM todo WHERE todo_id = $1', [req.params.id]);
    res.json('Todo was deleted successfully!');
  }));
  app.use(express.static(publicDir));
  app.use((err, req, res, next) => {
    const badJson = err.type === 'entity.parse.failed';
    res.status(badJson ? 400 : 500).json({ error: badJson ? 'Invalid JSON' : 'Request failed' });
  });
  return app;
}
if (require.main === module) {
  const pool = require('./db');
  const server = createApp(pool).listen(process.env.SERVER_PORT || 5000, '0.0.0.0', () => console.log('Todo service listening'));
  for (const signal of ['SIGTERM', 'SIGINT']) {
    process.on(signal, () => {
      server.close(() => pool.end().then(() => process.exit(0)));
      setTimeout(() => process.exit(1), 10000).unref();
    });
  }
}
module.exports = { createApp };