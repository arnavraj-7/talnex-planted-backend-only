// Shelf: a tiny books API. It is planted by TalNex: some things here work, some are broken on purpose, and one README claim is
// not really implemented. The expected result for each is in eval/expected/backend_only_repo.json.
const express = require('express');
const crypto = require('crypto');

const app = express();
app.use(express.json());

const books = [];
const users = new Map(); // email -> { password }
const tokens = new Map(); // token -> email
let nextId = 1;

function requireToken(req, res, next) {
  const header = req.get('Authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!tokens.has(token)) return res.status(401).json({ error: 'sign in first' });
  req.user = tokens.get(token);
  next();
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Accounts: these work.
app.post('/api/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'email and password are required' });
  if (users.has(email)) return res.status(409).json({ error: 'that email is taken' });
  users.set(email, { password });
  res.status(201).json({ email });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = users.get(email);
  if (!user || user.password !== password) return res.status(401).json({ error: 'wrong email or password' });
  const token = crypto.randomBytes(16).toString('hex');
  tokens.set(token, email);
  res.json({ token });
});

// Books: adding, listing and searching work.
app.post('/api/books', (req, res) => {
  // FLAW (on purpose): an empty body has no title, and .trim() on undefined crashes the request with a 500.
  const title = req.body.title.trim();
  const book = { id: nextId++, title, author: req.body.author || 'unknown', ratings: [] };
  books.push(book);
  res.status(201).json(book);
});

app.get('/api/books', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  res.json(books.filter((b) => !q || b.title.toLowerCase().includes(q)));
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'no such book' });
  res.json(book);
});

// Only a signed-in user may delete: works (a missing or wrong token gets 401).
app.delete('/api/books/:id', requireToken, (req, res) => {
  const i = books.findIndex((b) => b.id === Number(req.params.id));
  if (i < 0) return res.status(404).json({ error: 'no such book' });
  books.splice(i, 1);
  res.status(204).end();
});

// Ratings: work for a number from 1 to 5.
app.post('/api/books/:id/rating', (req, res) => {
  const book = books.find((b) => b.id === Number(req.params.id));
  if (!book) return res.status(404).json({ error: 'no such book' });
  // FLAW (on purpose): a rating that is not a number reaches .toFixed and crashes with a 500.
  const stars = req.body.stars;
  book.ratings.push(Number(stars.toFixed(0)));
  const average = book.ratings.reduce((a, b) => a + b, 0) / book.ratings.length;
  res.json({ average: Number(average.toFixed(2)), count: book.ratings.length });
});

// CLAIMED in the README as "recommends similar books using machine learning embeddings". NOT implemented: it returns the first
// three other books, whatever the book is. The route answers 200, so a plain call looks fine; the code shows there is no mechanism.
app.get('/api/books/:id/similar', (req, res) => {
  const others = books.filter((b) => b.id !== Number(req.params.id));
  res.json(others.slice(0, 3));
});

module.exports = app;

if (require.main === module) {
  const port = process.env.PORT || 3000;
  app.listen(port, '0.0.0.0', () => console.log(`Shelf API listening on ${port}`));
}
