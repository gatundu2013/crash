import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./db";

dotenv.config();

const app = express();

async function startServer() {
  try {
    await connectDb(process.env.MONGO_URL!);

    app.listen(process.env.PORT!, () => {
      console.log("The server is running on port 4000");
    });
  } catch (err) {
    console.error(err);
  }
}

export { startServer };
