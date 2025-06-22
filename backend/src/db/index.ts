import mongoose from "mongoose";
import { initDbIndexes } from "./utils.db";

export async function connectDb(url: string) {
  try {
    await mongoose.connect(url, { autoIndex: false });
    await initDbIndexes();

    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection failed");
    throw err;
  }
}
