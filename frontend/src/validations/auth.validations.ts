import * as yup from "yup";

export const phoneNumberRegex = /^(07|01)\d{8}$/;
export const usernameRegex = /^[a-z0-9]+$/;

export const signUpSchema = yup.object({
  phoneNumber: yup
    .string()
    .required("Phone number is required")
    .matches(phoneNumberRegex, "Please enter a valid 10-digit phone number"),
  username: yup
    .string()
    .required("Username is required")
    .min(4, "Username must be at least 3 characters")
    .max(12, "Username must not exceed 10 characters")
    .matches(
      usernameRegex,
      "Username can only contain lowercase letters and numbers"
    ),
  password: yup
    .string()
    .required("Password is required")
    .min(4, "Password must be at least 4 characters"),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], "You must agree to the terms and conditions")
    .required(),
});

export const signInSchema = yup.object({
  phoneNumber: yup
    .string()
    .required("Phone number is required")
    .matches(phoneNumberRegex, "Please enter a valid 10-digit phone number"),
  password: yup
    .string()
    .required("Password is required")
    .min(4, "Password must be at least 4 characters"),
});
