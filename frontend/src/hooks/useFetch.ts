import { api } from "@/config/axios.config";
import { handleTryCatchError } from "@/utils/tryCatchError";
import { useState } from "react";

function useFetch<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  const fetchData = async (url: string, options = {}): Promise<T | null> => {
    try {
      setIsLoading(true);
      setErrMsg(null);

      const resp = await api.get<T>(url, options);
      setData(resp.data);
      return resp.data;
    } catch (err) {
      const msg = handleTryCatchError(err, false);
      setErrMsg(msg);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, errMsg, fetchData };
}

export default useFetch;
