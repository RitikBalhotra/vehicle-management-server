import mongoose from "mongoose";

const vehicleSchema = new mongoose.Schema({
  vehicleName:        { type: String, required: true, trim: true },
  vehicleModel:       { type: String, required: true, trim: true },
  vehicleYear:        { type: Number, required: true },
  vehicleType:        { type: String, enum: ['LTV','HTV'], required: true },
  vehiclePhotos:      [{ type: String }],
  chassiNumber:       { type: String, required: true, unique: true, trim: true },
  registrationNumber: { type: String, required: true, unique: true, trim: true },
  vehicleDescription: { type: String, trim: true },
  status:             { type: String, enum: ['Active','Inactive'], default: 'Active' },
  created_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updated_by:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
}, {
  timestamps: { createdAt: 'created_on', updatedAt: 'updated_on' },
});

export default mongoose.model('Vehicle', vehicleSchema);
