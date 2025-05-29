import * as yup from "yup";

export const phoneNumberRegex = /^(07|01)\d{8}$/;

export const signUpSchema = yup.object({
  phoneNumber: yup
    .string()
    .required("Phone number is required")
    .matches(phoneNumberRegex, "Please enter a valid 10-digit phone number"),
  username: yup
    .string()
    .required("Username is required")
    .max(10, "Username must not exceed 10 characters")
    .min(3, "Username must be at least 3 characters"),
  password: yup
    .string()
    .required("Password is required")
    .min(4, "Password must be at least 4 characters"),
  agreeToTerms: yup
    .boolean()
    .oneOf([true], "You must agree to the terms and conditions")
    .required(),
});
