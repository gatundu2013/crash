import { api } from "@/config/axios.config";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { useState } from "react";

function useFetch() {
  const [isLoading, setIsLoading] = useState(false);

  async function getData(url: string) {
    try {
      setIsLoading(true);
      const response = await api.get(url);
      return response.data;
    } catch (err) {
      handleTryCatchError(err);
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, getData };
}

export default useFetch;
