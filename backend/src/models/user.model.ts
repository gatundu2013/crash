import { Schema, model } from "mongoose";
import { AccountStatus, Role, UserI } from "../types/user.types";

const userSchema = new Schema<UserI>({
  userId: { type: String, required: true, unique: true },
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phoneNumber: { type: String, required: true, unique: true },
  accountBalance: { type: Number, default: 0 },
  avatar: { type: String, default: "" },
  accountStatus: {
    type: String,
    enum: Object.values(AccountStatus),
    default: AccountStatus.ACTIVE,
  },
  agreeToTerms: { type: Boolean, required: true },
  role: { type: String, enum: Object.values(Role), default: Role.USER },
});

const User = model<UserI>("User", userSchema);

export default User;
