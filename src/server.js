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

const toTrimmedString = (value, defaultValue = '') => {
  if (value == null) {
    return defaultValue;
  }
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? defaultValue : trimmed;
};

const toNullableTrimmedString = (value) => {
  if (value == null) {
    return null;
  }
  const trimmed = String(value).trim();
  return trimmed.length === 0 ? null : trimmed;
};

const toBoolean = (value) => {
  if (typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') {
      return true;
    }
    if (normalized === 'false') {
      return false;
    }
  }
  return Boolean(value);
};

const toInteger = (value, defaultValue = 0) => {
  if (value == null) {
    return defaultValue;
  }
  if (typeof value === 'string' && value.trim().length === 0) {
    return defaultValue;
  }

  const number = Number(value);
  return Number.isFinite(number) ? Math.trunc(number) : defaultValue;
};

const sanitizeStageDates = (input) => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return {};
  }

  return Object.entries(input).reduce((acc, [stage, value]) => {
    if (value == null) {
      acc[stage] = null;
      return acc;
    }

    const sanitizedValue = toTrimmedString(value, '');
    acc[stage] = sanitizedValue.length === 0 ? null : sanitizedValue;
    return acc;
  }, {});
};

const normalizePlantPayload = (payload = {}, { requireName = true } = {}) => {
  const {
    name,
    strainId = null,
    stage = 'VEG',
    stageDates = {},
    notes = '',
    cureOffsetDays = 0,
    isArchived = false,
    harvestTargetOverride = null,
  } = payload;

  if (requireName && (!name || typeof name !== 'string' || name.trim().length === 0)) {
    throw new TypeError('Plant name is required');
  }

  const normalized = {
    name: name == null ? undefined : toTrimmedString(name),
    strainId: strainId == null ? null : toNullableTrimmedString(strainId),
    stage: stage == null ? 'VEG' : toTrimmedString(stage, 'VEG'),
    stageDates: sanitizeStageDates(stageDates),
    notes: notes == null ? '' : toTrimmedString(notes, ''),
    cureOffsetDays: toInteger(cureOffsetDays, 0),
    isArchived: toBoolean(isArchived),
    harvestTargetOverride: harvestTargetOverride == null
      ? null
      : toNullableTrimmedString(harvestTargetOverride),
  };

  return normalized;
};

app.post('/plants', async (req, res) => {
  try {
    const normalized = normalizePlantPayload(req.body || {});
    const now = new Date().toISOString();
    const newPlant = {
      id: crypto.randomUUID(),
      createdAt: now,
      ...normalized,
    };

    await store.createPlant(newPlant);
    res.status(201).json({ data: newPlant });
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create plant' });
  }
});

app.put('/plants/:id', async (req, res) => {
  const payload = req.body || {};
  let sanitizedUpdates;

  try {
    sanitizedUpdates = normalizePlantPayload(
      {
        ...payload,
        // Ensure optional fields can be intentionally cleared
        strainId: Object.prototype.hasOwnProperty.call(payload, 'strainId')
          ? payload.strainId
          : undefined,
        stageDates: Object.prototype.hasOwnProperty.call(payload, 'stageDates')
          ? payload.stageDates
          : undefined,
        notes: Object.prototype.hasOwnProperty.call(payload, 'notes')
          ? payload.notes
          : undefined,
        cureOffsetDays: Object.prototype.hasOwnProperty.call(payload, 'cureOffsetDays')
          ? payload.cureOffsetDays
          : undefined,
        isArchived: Object.prototype.hasOwnProperty.call(payload, 'isArchived')
          ? payload.isArchived
          : undefined,
        harvestTargetOverride: Object.prototype.hasOwnProperty.call(
          payload,
          'harvestTargetOverride',
        )
          ? payload.harvestTargetOverride
          : undefined,
      },
      { requireName: false },
    );
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update plant' });
    return;
  }

  const allowedKeys = [
    'name',
    'strainId',
    'stage',
    'stageDates',
    'notes',
    'cureOffsetDays',
    'isArchived',
    'harvestTargetOverride',
  ];

  const normalizedUpdates = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      normalizedUpdates[key] = sanitizedUpdates[key];
    }
  }

  if (Object.keys(normalizedUpdates).length === 0) {
    res.status(400).json({ error: 'No valid fields provided for update' });
    return;
  }

  try {
    const updatedPlant = await store.updatePlant(req.params.id, normalizedUpdates);
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

app.get('/strains', async (req, res, next) => {
  try {
    const strains = await store.listStrains();
    res.json({ data: strains });
  } catch (error) {
    next(error);
  }
});

app.get('/strains/:id', async (req, res, next) => {
  try {
    const strain = await store.getStrainById(req.params.id);
    if (!strain) {
      res.status(404).json({ error: 'Strain not found' });
      return;
    }
    res.json({ data: strain });
  } catch (error) {
    next(error);
  }
});

const normalizeStrainPayload = (payload = {}, { requireName = true } = {}) => {
  const { name, floweringDays = null, notes = '' } = payload;

  if (requireName && (!name || typeof name !== 'string' || name.trim().length === 0)) {
    throw new TypeError('Strain name is required');
  }

  return {
    name: name == null ? undefined : toTrimmedString(name),
    floweringDays:
      floweringDays == null ? null : toInteger(floweringDays, null),
    notes: notes == null ? '' : toTrimmedString(notes, ''),
  };
};

app.post('/strains', async (req, res) => {
  try {
    const normalized = normalizeStrainPayload(req.body || {});
    const newStrain = {
      id: crypto.randomUUID(),
      ...normalized,
    };

    await store.createStrain(newStrain);
    res.status(201).json({ data: newStrain });
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to create strain' });
  }
});

app.put('/strains/:id', async (req, res) => {
  const payload = req.body || {};
  let sanitizedUpdates;

  try {
    sanitizedUpdates = normalizeStrainPayload(payload, { requireName: false });
  } catch (error) {
    if (error instanceof TypeError) {
      res.status(400).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Failed to update strain' });
    return;
  }

  const allowedKeys = ['name', 'floweringDays', 'notes'];
  const normalizedUpdates = {};
  for (const key of allowedKeys) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      normalizedUpdates[key] = sanitizedUpdates[key];
    }
  }

  if (Object.keys(normalizedUpdates).length === 0) {
    res.status(400).json({ error: 'No valid fields provided for update' });
    return;
  }

  try {
    const updatedStrain = await store.updateStrain(
      req.params.id,
      normalizedUpdates,
    );
    if (!updatedStrain) {
      res.status(404).json({ error: 'Strain not found' });
      return;
    }
    res.json({ data: updatedStrain });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update strain' });
  }
});

app.delete('/strains/:id', async (req, res) => {
  try {
    const deleted = await store.deleteStrain(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: 'Strain not found' });
      return;
    }
    res.status(204).send('');
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete strain' });
  }
});

app.options('/strains', (req, res) => {
  res.status(204).send('');
});

app.options('/strains/:id', (req, res) => {
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
