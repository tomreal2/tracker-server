const fs = require('fs/promises');
const path = require('path');

class DataStore {
  constructor(filePath) {
    this.filePath = filePath;
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch (error) {
      const initialData = { plants: [] };
      await this.write(initialData);
    }
    this.initialized = true;
  }

  async read() {
    await this.init();
    const raw = await fs.readFile(this.filePath, 'utf8');
    return JSON.parse(raw);
  }

  async write(data) {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    await fs.writeFile(this.filePath, JSON.stringify(data, null, 2));
  }

  async getState() {
    const data = await this.read();
    return data;
  }

  async replaceState(nextState) {
    if (!nextState || typeof nextState !== 'object' || Array.isArray(nextState)) {
      throw new TypeError('State payload must be an object');
    }

    const sanitized = {
      ...nextState,
    };
    sanitized.plants = Array.isArray(nextState.plants) ? nextState.plants : [];

    await this.write(sanitized);
    return sanitized;
  }

  async updateState(partialState) {
    if (!partialState || typeof partialState !== 'object' || Array.isArray(partialState)) {
      throw new TypeError('State payload must be an object');
    }

    const current = await this.read();
    const merged = { ...current, ...partialState };

    if (Object.prototype.hasOwnProperty.call(partialState, 'plants')) {
      merged.plants = Array.isArray(partialState.plants) ? partialState.plants : current.plants;
    }

    await this.write(merged);
    return merged;
  }

  async listPlants() {
    const data = await this.read();
    return data.plants;
  }

  async getPlantById(id) {
    const plants = await this.listPlants();
    return plants.find((plant) => plant.id === id) || null;
  }

  async createPlant(plant) {
    const data = await this.read();
    data.plants.push(plant);
    await this.write(data);
    return plant;
  }

  async updatePlant(id, updates) {
    const data = await this.read();
    const index = data.plants.findIndex((plant) => plant.id === id);
    if (index === -1) {
      return null;
    }
    const existing = data.plants[index];
    const updated = { ...existing, ...updates, id };
    data.plants[index] = updated;
    await this.write(data);
    return updated;
  }

  async deletePlant(id) {
    const data = await this.read();
    const index = data.plants.findIndex((plant) => plant.id === id);
    if (index === -1) {
      return false;
    }
    data.plants.splice(index, 1);
    await this.write(data);
    return true;
  }
}

module.exports = DataStore;
