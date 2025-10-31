# Tracker Server

This repository contains a lightweight RESTful backend for the Tracker plant management application. It exposes endpoints for managing plant data and persists information to a small JSON database so that the React front end can synchronize updates across devices.

## Features

- Express-based REST server exposed via familiar middleware patterns.
- App state endpoints (`/state`) for retrieving and persisting the Tracker UI snapshot.
- CRUD endpoints for plants (`/plants`).
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
Returns the full persisted application state, including the list of plants.

### `PUT /state`
Replaces the stored state. The request body should contain an object shaped like the Tracker application's state tree (at minimum, provide a `plants` array).

### `PATCH /state`
Merges a partial state update into the stored data. Provide only the keys that need to change.

### `GET /plants`
Retrieves the full list of plants.

### `GET /plants/:id`
Fetches a single plant by its identifier.

### `POST /plants`
Creates a new plant. The request body should include a `name` and can optionally provide `species`, `location`, `lastWatered`, and `notes` fields.

### `PUT /plants/:id`
Updates an existing plant. Supply any combination of the supported fields in the request body.

### `DELETE /plants/:id`
Removes a plant from the datastore.

All write operations update `data/plants.json`, which can be committed or backed up to persist state across deployments.
