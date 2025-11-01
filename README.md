# Tracker Server

This repository contains a lightweight RESTful backend for the Tracker plant management application. It exposes endpoints for managing plant data and persists information to a small JSON database so that the React front end can synchronize updates across devices.

## Features

- Express-based REST server exposed via familiar middleware patterns.
- App state endpoints (`/state`) for retrieving and persisting the Tracker UI snapshot.
- CRUD endpoints for plants (`/plants`) and strains (`/strains`).
- File-based JSON datastore to keep the application lightweight and easy to deploy.
- Built-in CORS support for communication with the Tracker React front end.

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Start the server**:

   ```bash
   npm start
   ```

   By default the server listens on port `4000`. You can override this by setting the `PORT` environment variable.

## API Overview

All endpoints return JSON responses.

### `GET /health`
Returns a simple health check payload.

### `GET /state`
Returns the full persisted application state, including the lists of plants and strains.

### `PUT /state`
Replaces the stored state. The request body should contain an object shaped like the Tracker application's state tree (at minimum, provide a `plants` array).

### `PATCH /state`
Merges a partial state update into the stored data. Provide only the keys that need to change.

### `GET /plants`
Retrieves the full list of plants.

### `GET /plants/:id`
Fetches a single plant by its identifier.

### `POST /plants`
Creates a new plant. The request body must include a non-empty `name` and can optionally supply:

- `strainId` – UUID of the related strain (nullable).
- `stage` – lifecycle stage label.
- `stageDates` – object mapping stage labels to ISO-8601 timestamps.
- `notes` – free-form text.
- `cureOffsetDays` – integer offset applied when estimating cure targets.
- `isArchived` – boolean flag for archived plants.
- `harvestTargetOverride` – ISO-8601 timestamp override or `null`.

Unspecified properties fall back to sensible defaults (for example, `stage` defaults to `"VEG"`, `cureOffsetDays` defaults to `0`, and `isArchived` defaults to `false`). Each plant automatically receives a generated `id` and `createdAt` timestamp.

### `PUT /plants/:id`
Updates an existing plant. Provide any subset of the same fields accepted by the creation endpoint to modify their values. Omitting a field leaves the stored value unchanged, while explicitly sending `null` clears nullable fields such as `strainId`, `stageDates` values, or `harvestTargetOverride`.

### `DELETE /plants/:id`
Removes a plant from the datastore.

### `GET /strains`
Retrieves all saved strains.

### `GET /strains/:id`
Fetches a single strain by its identifier.

### `POST /strains`
Creates a new strain. Supply a non-empty `name` and optionally include:

- `floweringDays` – integer number of flowering days (nullable).
- `notes` – free-form text.

Each new strain is assigned a generated `id`.

### `PUT /strains/:id`
Updates an existing strain. Provide any combination of `name`, `floweringDays`, or `notes` to change the stored record. As with plants, omitting a field leaves it untouched, and sending `null` clears nullable fields like `floweringDays`.

### `DELETE /strains/:id`
Removes a strain from the datastore.

All write operations update `data/plants.json`, which can be committed or backed up to persist state across deployments.

## Sample Payloads

```json
{
  "id": "011f9820-f4d9-4fc3-9e3a-be79f5e47311",
  "name": "TVEG Blueberry Muffin 1",
  "strainId": "c95d4d25-252d-4d9d-a152-b8c3f007734d",
  "stage": "VEG",
  "stageDates": {
    "VEG": "2025-09-20T00:00:00.000Z",
    "FL": "2025-11-11T00:00:00.000Z"
  },
  "notes": "",
  "cureOffsetDays": 0,
  "isArchived": false,
  "createdAt": "2025-10-31T03:40:09.473Z",
  "harvestTargetOverride": null
}
```

```json
{
  "id": "c95d4d25-252d-4d9d-a152-b8c3f007734d",
  "name": "Blueberry Muffin",
  "floweringDays": 45,
  "notes": ""
}
```
