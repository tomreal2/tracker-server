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
