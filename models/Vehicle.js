import mongoose from 'mongoose';

const vehicleSchema = new mongoose.Schema(
  {
    vehicleName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleModel: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleYear: {
      type: Number,
      required: true,
    },
    type: {
      type: String,
      enum: ['LTV', 'HTV'],
      required: true,
    },
    vehiclePhotos: [
      {
        type: String, // Store image filenames or URLs
        required: false,
      },
    ],
    chassiNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    vehicleDescription: {
      type: String,
      required: false,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive'],
      default: 'Active',
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
  },
  {
    timestamps: { createdAt: 'created_on', updatedAt: 'updated_on' },
  }
);

export default mongoose.model('Vehicle', vehicleSchema);
