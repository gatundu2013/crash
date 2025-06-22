import mongoose from "mongoose";

export async function initDbIndexes() {
  const models = mongoose.models;

  for (const [name, model] of Object.entries(models)) {
    try {
      await model.createIndexes();
      console.info(`Indexes created for model ${name}`);
    } catch (err) {
      console.error(`Failed to create indexes for model ${name}`, err);
    }
  }
}
