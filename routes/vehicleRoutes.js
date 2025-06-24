import express from "express";
import multer from "multer";
import auth from "../middleware/auth.js";
import Vehicle from "../models/Vehicle.js";
import User from "../models/User.js";
import { Readable } from "stream";
import cloudinary from "../config/cloudinary.js";
import Driver from "../models/Driver.js";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload to Cloudinary
const uploadToCloudinary = async (file) => {
  return new Promise((resolve, reject) => {
    if (!file || !file.buffer) {
      return reject(new Error("Invalid file object"));
    }

    const stream = cloudinary.uploader.upload_stream(
      { folder: "vehicles" },
      (error, result) => {
        if (result) resolve(result);
        else reject(error);
      }
    );

    Readable.from(file.buffer).pipe(stream); // ✅ buffer is iterable
  });
};

// Helper for check role is admin or manager
const isAuthorized = async (userId) => {
  const user = await User.findById(userId);
  console.log(user);
  if (user.role == "admin" || user.role == "manager") {
    return user;
  } else {
    console.log("user find but user role is: " + user.role);
  }
};

// Create a vehicle
router.post("/add", auth, upload.array("vehiclePhotos"), async (req, res) => {
  try {
    const {
      vehicleName,
      vehicleModel,
      vehicleYear,
      vehicleType,
      chassiNumber,
      registrationNumber,
      vehicleDescription,
      status,
    } = req.body;

    if (await Vehicle.findOne({ chassiNumber })) {
      return res.status(400).json({ message: "Vehicle already exists" });
    }

    const vehiclePhotos = [];

    if (req.files && req.files.length > 0) {
      for (let file of req.files) {
        const uploaded = await uploadToCloudinary(file, "VMS/VehiclePhotos");
        vehiclePhotos.push(uploaded.secure_url);
      }
    }

    const newVehicle = new Vehicle({
      vehicleName,
      vehicleModel,
      vehicleYear,
      vehicleType,
      chassiNumber,
      registrationNumber,
      vehicleDescription,
      status,
      vehiclePhotos,
      created_by: req.user.userId,
    });

    await newVehicle.save();
    res.status(201).json(newVehicle);
  } catch (error) {
    console.error("Error adding vehicle:", error);
    res.status(500).json({ message: "Server error" });
  }
});

// List all vehicles (Admin/Manager only)
router.get("/vehiclelist", auth, async (req, res) => {
  if (!(await isAuthorized(req.user.userId))) {
    return res.status(403).json({ message: "Access denied" });
  }

  const vehicles = await Vehicle.find().populate("created_by", "name email");
  res.json({ data: vehicles });
});

// Get single vehicle
router.get("/:id", auth, async (req, res) => {
  try {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) return res.status(404).json({ message: "Vehicle not found" });
    res.json(vehicle);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Update vehicle
router.put(
  "/updatevehicle/:id",
  auth,
  upload.array("vehiclePhotos"),
  async (req, res) => {
    if (!(await isAuthorized(req.user.userId))) {
      return res.status(403).json({ message: "Access denied" });
    }

    try {
      const updateData = { ...req.body, updated_by: req.user.userId };

      if (req.files && req.files.length > 0) {
        const photoUrls = [];
        for (let file of req.files) {
          const uploaded = await uploadToCloudinary(file);
          photoUrls.push(uploaded.secure_url);
        }
        updateData.vehiclePhotos = photoUrls;
      }

      const vehicle = await Vehicle.findByIdAndUpdate(
        req.params.id,
        updateData,
        {
          new: true,
        }
      );

      if (!vehicle)
        return res.status(404).json({ message: "Vehicle not found" });
      res.json(vehicle);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Update failed" });
    }
  }
);

// Delete vehicle
router.delete("/vehicle/:id", auth, async (req, res) => {
  if (!(await isAuthorized(req.user.userId))) {
    return res.status(403).json({ message: "Access denied" });
  }

  const vehicle = await Vehicle.findById(req.params.id);
  if (!vehicle) return res.status(404).json({ message: "Not found" });

  await vehicle.deleteOne();
  res.json({ message: "Vehicle deleted" });
});

// Get assigned vehicle for driver
router.get("/driver/assigned-vehicle/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const driver = await Driver.findOne({ user: userId }).populate(
      "assignedVehicle"
    );

    if (!driver) {
      return res.status(404).json({ message: "Driver not found" });
    }

    if (!driver.assignedVehicle) {
      return res
        .status(200)
        .json({ message: "No vehicle assigned yet", vehicle: null });
    }

    res.status(200).json({ vehicle: driver.assignedVehicle });
  } catch (err) {
    console.error("Error fetching assigned vehicle", err);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
