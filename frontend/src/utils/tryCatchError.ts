import axios from "axios";
import { toast } from "react-toastify";

export const handleTryCatchError = (err: unknown, shouldToast = true) => {
  const errMessage = axios.isAxiosError(err)
    ? err.response?.data?.message
    : "An error occured";

  shouldToast && toast.error(errMessage);

  return errMessage;
};
