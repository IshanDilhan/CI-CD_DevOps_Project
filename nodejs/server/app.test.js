const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./app');

async function withServer(query, run) {
  const server = createApp({ query }).listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  try { await run(`http://127.0.0.1:${server.address().port}`); }
  finally { await new Promise(resolve => server.close(resolve)); }
}
test('health checks the database schema', async () => {
  await withServer(async sql => {
    assert.match(sql, /FROM todo/);
    return { rows: [] };
  }, async url => {
    const res = await fetch(`${url}/health`);
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: 'ok' });
  });
});
test('database failure returns 503 health and bounded 500 API responses', async () => {
  await withServer(async () => { throw new Error('private database details'); }, async url => {
    assert.equal((await fetch(`${url}/health`)).status, 503);
    const res = await fetch(`${url}/todos`);
    assert.equal(res.status, 500);
    assert.deepEqual(await res.json(), { error: 'Request failed' });
  });
});
test('rejects invalid payloads and identifiers before querying', async () => {
  await withServer(async () => { assert.fail('must not query'); }, async url => {
    for (const description of ['', ' '.repeat(2), 'a'.repeat(256), 42]) {
      const res = await fetch(`${url}/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) });
      assert.equal(res.status, 400);
    }
    assert.equal((await fetch(`${url}/todos/not-an-id`)).status, 400);
    assert.equal((await fetch(`${url}/todos`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' })).status, 400);
  });
});
test('CRUD uses parameterized queries and returns expected API shapes', async () => {
  const calls = [];
  await withServer(async (sql, args) => {
    calls.push({ sql, args });
    return { rows: [{ todo_id: 1, description: 'release' }] };
  }, async url => {
    assert.deepEqual(await (await fetch(`${url}/todos`)).json(), [{ todo_id: 1, description: 'release' }]);
    assert.equal((await fetch(`${url}/todos/1`)).status, 200);
    const request = { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description: "release's test" }) };
    assert.equal((await fetch(`${url}/todos`, { ...request, method: 'POST' })).status, 201);
    assert.equal((await fetch(`${url}/todos/1`, { ...request, method: 'PUT' })).status, 200);
    assert.equal((await fetch(`${url}/todos/1`, { method: 'DELETE' })).status, 200);
    assert.match(calls[2].sql, /VALUES \(\$1\)/);
    assert.deepEqual(calls[2].args, ["release's test"]);
    assert.deepEqual(calls[3].args, ["release's test", '1']);
    assert.deepEqual(calls[4].args, ['1']);
  });
});
