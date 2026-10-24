// The repository's own tests. Two pass; the third fails on purpose (it expects the empty-body flaw to be fixed).
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const app = require('../server');

function call(server, method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body === undefined ? null : JSON.stringify(body);
    const req = http.request({ port: server.address().port, method, path, headers: { 'Content-Type': 'application/json', Connection: 'close' }, agent: false }, (res) => {
      let text = '';
      res.on('data', (c) => (text += c));
      res.on('end', () => resolve({ status: res.statusCode, body: text ? JSON.parse(text) : null }));
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

test('adding a book then listing it', async () => {
  const server = app.listen(0);
  try {
    assert.strictEqual((await call(server, 'POST', '/api/books', { title: 'Dune', author: 'Herbert' })).status, 201);
    const list = await call(server, 'GET', '/api/books');
    assert.strictEqual(list.body.length, 1);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('signing in needs the right password', async () => {
  const server = app.listen(0);
  try {
    await call(server, 'POST', '/api/register', { email: 'a@example.com', password: 'pw' });
    assert.strictEqual((await call(server, 'POST', '/api/login', { email: 'a@example.com', password: 'nope' })).status, 401);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

test('an empty book is refused politely', async () => {
  const server = app.listen(0);
  try {
    // This fails on purpose: the server crashes with a 500 instead of answering 400.
    assert.strictEqual((await call(server, 'POST', '/api/books', {})).status, 400);
  } finally {
    server.closeAllConnections();
    server.close();
  }
});

// The Express app keeps a timer alive after the last test, so the process would wait for it. Leave once the results are printed.
test.after(() => {
  setTimeout(() => process.exit(), 200).unref();
  setTimeout(() => process.exit(), 1000);
});
