import dotenv from "dotenv";
import fs from "fs";
import path from "path";

export function loadEnvVar() {
  const env = process.env.NODE_ENV || "development";
  const envFile = `.env.${env}`;
  const envPath = path.join(process.cwd(), envFile);

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    console.log(`✅ Loaded environment from ${envPath}`);
  } else {
    console.log(
      `⚠️ Skipping dotenv. Using environment variables from process.env`
    );
  }
}

export const ENV_VAR = {
  MONGO_URL: process.env.MONGO_URL,
  PORT: process.env.PORT,
  JWT_ACCESS_SECRET: process.env.JWT_ACCESS_SECRET,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET,
};
