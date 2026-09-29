// Run against a disposable lab deployment: creates and removes one test todo.
import assert from 'node:assert/strict';
const base = process.env.APP_URL || 'http://localhost:3000';
async function request(path, options) {
  const response = await fetch(base + path, { ...options, signal: AbortSignal.timeout(10000) });
  assert.ok(response.ok, `${path}: HTTP ${response.status}`);
  return response;
}
assert.match(await (await request('/')).text(), /DevOps Todo Lab/);
assert.equal((await (await request('/health')).json()).status, 'ok');
const options = description => ({ headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ description }) });
const created = await (await request('/todos', { ...options('CI smoke test'), method: 'POST' })).json();
const id = created[0].todo_id;
try {
  await request(`/todos/${id}`, { ...options('CI smoke updated'), method: 'PUT' });
  assert.equal((await (await request(`/todos/${id}`)).json())[0].description, 'CI smoke updated');
  assert.ok((await (await request('/todos')).json()).some(todo => todo.todo_id === id));
} finally {
  await request(`/todos/${id}`, { method: 'DELETE' });
}
console.log('HTTP, database health, and CRUD smoke checks passed');
