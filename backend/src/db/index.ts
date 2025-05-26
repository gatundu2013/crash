import mongoose from "mongoose";

export async function connectDb(url: string) {
  try {
    await mongoose.connect(url);
    console.log("Database connected successfully");
  } catch (err) {
    console.error("Database connection failed");
    throw err;
  }
}
