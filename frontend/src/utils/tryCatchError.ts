import axios from "axios";
import { toast } from "react-toastify";

export const handleTryCatchError = (err: unknown) => {
  if (axios.isAxiosError(err)) {
    const errorMsg = err.response?.data?.message || "An unknown error occurred";
    toast.error(errorMsg);
  } else {
    toast.error("An unexpected error occurred");
  }
};
