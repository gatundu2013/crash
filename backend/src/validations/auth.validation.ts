import Joi from "joi";
import { AuthError } from "../utils/errors/authError";

export const phoneNumberRegex = /^(07|01)\d{8}$/;
export const usernameRegex = /^[a-z0-9]+$/;

export const registerSchema = Joi.object({
  username: Joi.string()
    .trim()
    .min(4)
    .max(12)
    .pattern(usernameRegex)
    .required()
    .messages({
      "string.base": "Username must be a string",
      "string.empty": "Username is required",
      "string.min": "Username must be at least 4 characters",
      "string.max": "Username must not exceed 8 characters",
      "string.pattern.base":
        "Username can only contain lowercase letters and numbers",
      "any.required": "Username is required",
    }),

  phoneNumber: Joi.string()
    .trim()
    .pattern(phoneNumberRegex)
    .required()
    .messages({
      "string.base": "Phone number must be a string of digits",
      "string.empty": "Phone number is required",
      "string.pattern.base":
        "Phone number must start with 07 or 01 and be exactly 10 digits",
      "any.required": "Phone number is required",
    }),

  password: Joi.string().trim().min(4).required().messages({
    "string.base": "Password must be a string",
    "string.empty": "Password is required",
    "string.min": "Password must be at least 4 characters",
    "any.required": "Password is required",
  }),

  agreeToTerms: Joi.boolean().valid(true).required().messages({
    "any.only": "You must agree to the terms and conditions",
    "any.required": "Agreement to terms is required",
  }),
});

export const loginSchema = Joi.object({
  phoneNumber: Joi.string()
    .trim()
    .pattern(phoneNumberRegex)
    .required()
    .messages({
      "string.base": "Phone number must be a string of digits",
      "string.empty": "Phone number is required",
      "string.pattern.base":
        "Phone number must start with 07 or 01 and be exactly 10 digits",
      "any.required": "Phone number is required",
    }),

  password: Joi.string().trim().required().messages({
    "string.base": "Password must be a string",
    "string.empty": "Password is required",
    "any.required": "Password is required",
  }),
});

export function validateAuthPayload(schema: Joi.Schema, payload: unknown) {
  const { error, value } = schema.validate(payload);

  if (error) {
    throw new AuthError({
      httpCode: 400,
      isOperational: true,
      description: error.message,
    });
  }

  return value;
}
