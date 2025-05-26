import express from "express";
import dotenv from "dotenv";
import { connectDb } from "./db";
import { router } from "./routes/v1";

dotenv.config();

const app = express();

app.use(express.json());

app.use("/api/v1", router);

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
