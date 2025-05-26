import Joi from "joi";

export const phoneNumberRegex = /^(07|01)\d{8}$/;

export const registerSchema = Joi.object({
  username: Joi.string().trim().min(4).max(8).required().messages({
    "string.base": "Username must be a string",
    "string.empty": "Username is required",
    "string.min": "Username must be at least 4 characters",
    "string.max": "Username must not exceed 8 characters",
    "any.required": "Username is required",
  }),

  phoneNumber: Joi.string().pattern(phoneNumberRegex).required().messages({
    "string.base": "Phone number must be a string of digits",
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must start with 07 or 01 and be exactly 10 digits",
    "any.required": "Phone number is required",
  }),

  password: Joi.string().min(4).required().messages({
    "string.base": "Password must be a string",
    "string.empty": "Password is required",
    "string.min": "Password must be at least 4 characters",
    "any.required": "Password is required",
  }),
});

// Validation for LoginRequest
export const loginSchema = Joi.object({
  phoneNumber: Joi.string().pattern(phoneNumberRegex).required().messages({
    "string.base": "Phone number must be a string of digits",
    "string.empty": "Phone number is required",
    "string.pattern.base":
      "Phone number must start with 07 or 01 and be exactly 10 digits",
    "any.required": "Phone number is required",
  }),

  password: Joi.string().required().messages({
    "string.base": "Password must be a string",
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});
