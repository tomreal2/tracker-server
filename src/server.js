const path = require('path');
const crypto = require('crypto');
const express = require('express');
const DataStore = require('./datastore');
const cors = require('./middleware/cors');

const PORT = process.env.PORT || 4000;
const store = new DataStore(path.join(__dirname, '..', 'data', 'plants.json'));

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/state', async (req, res, next) => {
  try {
    const state = await store.getState();
    res.json({ data: state });
  } catch (error) {
    next(error);
  }
});

app.put('/state', async (req, res, next) => {
  try {
    const savedState = await store.replaceState(req.body || {});
    res.json({ data: savedState });
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.patch('/state', async (req, res, next) => {
  try {
    const savedState = await store.updateState(req.body || {});
    res.json({ data: savedState });
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    next(error);
  }
});

app.get('/plants', async (req, res, next) => {
  try {
    const plants = await store.listPlants();
    res.json({ data: plants });
  } catch (error) {
    next(error);
  }
});

app.get('/plants/:id', async (req, res, next) => {
  try {
    const plant = await store.getPlantById(req.params.id);
    if (!plant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json({ data: plant });
  } catch (error) {
    next(error);
  }
});

app.post('/plants', async (req, res) => {
  const {
    name,
    species = '',
    location = '',
    lastWatered = null,
    notes = '',
  } = req.body || {};

  if (!name || typeof name !== 'string') {
    res.status(400).json({ error: 'Plant name is required' });
    return;
  }

  const newPlant = {
    id: crypto.randomUUID(),
    name: name.trim(),
    species: species ? String(species).trim() : '',
    location: location ? String(location).trim() : '',
    lastWatered: lastWatered ? String(lastWatered).trim() : null,
    notes: notes ? String(notes).trim() : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    await store.createPlant(newPlant);
    res.status(201).json({ data: newPlant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create plant' });
  }
});

app.put('/plants/:id', async (req, res) => {
  const updates = req.body || {};
  const allowedFields = ['name', 'species', 'location', 'lastWatered', 'notes'];
  const sanitizedUpdates = {};

  for (const field of allowedFields) {
    if (Object.prototype.hasOwnProperty.call(updates, field)) {
      const value = updates[field];
      sanitizedUpdates[field] = value == null ? null : String(value).trim();
    }
  }

  if (Object.keys(sanitizedUpdates).length === 0) {
    res.status(400).json({ error: 'No valid fields provided for update' });
    return;
  }

  sanitizedUpdates.updatedAt = new Date().toISOString();

  try {
    const updatedPlant = await store.updatePlant(req.params.id, sanitizedUpdates);
    if (!updatedPlant) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.json({ data: updatedPlant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update plant' });
  }
});

app.delete('/plants/:id', async (req, res) => {
  try {
    const deleted = await store.deletePlant(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Plant not found' });
      return;
    }
    res.status(204).send('');
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete plant' });
  }
});

app.options('/plants', (req, res) => {
  res.status(204).send('');
});

app.options('/plants/:id', (req, res) => {
  res.status(204).send('');
});

app.options('/state', (req, res) => {
  res.status(204).send('');
});

app.use((err, req, res, next) => { // eslint-disable-line no-unused-vars
  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Unexpected server error';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Tracker server listening on port ${PORT}`);
});
