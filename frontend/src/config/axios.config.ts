import axios from "axios";
import { BASE_URL } from "./app.config";

export const api = axios.create({
  baseURL: `${BASE_URL}/api/v1/user`,
  timeout: 1000,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});
