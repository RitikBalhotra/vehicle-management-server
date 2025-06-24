import mongoose from "mongoose";
import bcrypt from "bcryptjs"

const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true, trim: true },
  lastName:  { type: String, required: true, trim: true },
  email:     { type: String, required: true, unique: true, trim: true, lowercase: true },
  password:  { type: String, required: true },
  mobile:    { type: String, required: true, trim: true },
  dob:       { type: Date, required: false },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: false, unique: true },
  profilePic:{ type: String },
  role:      { type: [String], enum: ["admin", "manager", "driver"], default: ["driver"] },
}, {
  timestamps: { createdAt: "created_at", updatedAt: "updated_at" },
});

userSchema.pre("save", async function(next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = function(password) {
  return bcrypt.compare(password, this.password);
};

export default mongoose.model("User", userSchema);
