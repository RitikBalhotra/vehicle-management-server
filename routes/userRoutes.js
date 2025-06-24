import express from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import upload from "../middleware/multer.js";
import cloudinary from "../config/cloudinary.js";
import User from "../models/User.js";
import Driver from "../models/Driver.js";
import Otp from "../models/Otp.js";
import auth from "../middleware/auth.js";
import { Readable } from "stream";
import { emailService } from "../config/mailService.js";
import { forgotEmailTemplate } from "../template/forgotEmail.js";

const router = express.Router();
// Allowed roles
const allowedRoles = ["admin", "manager", "driver"];

// Upload to Cloudinary
const uploadToCloudinary = (buffer, folder) =>
  new Promise((resolve, reject) => {
    if (!buffer) return resolve("");

    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (err, result) => {
        if (err) {
          console.error("Cloudinary error:", err);
          reject(err);
        } else {
          console.log("Cloudinary uploaded:", result.secure_url);
          resolve(result.secure_url);
        }
      }
    );

    // Pipe the buffer correctly
    Readable.from(buffer).pipe(stream);
  });

// Rate limiter for login
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Too many login attempts, try again later.",
});

//register
router.post("/register", async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      mobile,
      password,
      role = ["driver"],
    } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 👇 Role override logic
    let userRole = role;
    if (email === "ritikbalhotra007@gmail.com") {
      userRole = ["admin"];
    }

    const newUser = new User({
      firstName,
      lastName,
      email,
      mobile,
      password,
      role: userRole,
    });

    if (req?.files?.profilePic) {
      const profileBuffer = req.files?.profilePic?.[0]?.buffer;
      const profileUrl = await uploadToCloudinary(
        profileBuffer,
        "VMS/ProfilePics"
      );
      newUser.profilePic = profileUrl;
    }

    const savedUser = await newUser.save();
    console.log("✅ User registered:", savedUser?.id);

    if (userRole.includes("driver")) {
      const newDriver = new Driver({
        user: savedUser?.id,
        address: "",
        experience: "",
        licenseExpiry: null,
        licenseFile: "",
      });

      const licenseBuffer = req.files?.drivingLicense?.[0]?.buffer;
      if (licenseBuffer) {
        const licenseUrl = await uploadToCloudinary(
          licenseBuffer,
          "VMS/DrivingLicenses"
        );
        newDriver.licenseFile = licenseUrl;
      }

      await newDriver.save();
      console.log("🆕 Blank driver profile created on signup");
    }

    const token = jwt.sign({ userId: savedUser._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.status(201).json({
      token,
      user: {
        id: savedUser._id,
        firstName: savedUser.firstName,
        email: savedUser.email,
        role: savedUser.role,
      },
    });
  } catch (err) {
    console.error("❌ Registration failed:", err);
    res
      .status(500)
      .json({ message: "Registration failed", error: err.message });
  }
});

// Login route
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "2h",
    });

    res.json({
      token,
      user: { id: user._id, firstName: user.firstName, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// List users route
router.get("/list", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    if (
      !currentUser ||
      !["admin", "manager"].some((r) => currentUser.role.includes(r))
    ) {
      return res.status(403).json({ message: "Access denied" });
    }

    const users = await User.find().select("-password").lean();

    // Now get all drivers with populated user info
    const drivers = await Driver.find()
      .populate("user", "-password") // include associated user fields
      .lean();

    // Merge driver info back into the respective user
    const mergedUsers = users.map((user) => {
      if (user.role.includes("driver")) {
        const driverDetails = drivers.find(
          (d) => d.user._id.toString() === user._id.toString()
        );
        if (driverDetails) {
          return {
            ...user,
            address: driverDetails.address,
            experience: driverDetails.experience,
            licenseExpiry: driverDetails.licenseExpiry,
            licenseFile: driverDetails.licenseFile,
          };
        }
      }
      return user;
    });

    res.json(mergedUsers);
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch users", error: err.message });
  }
});

// get by id
router.get("/user/:id", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const requestedUserId = req.params.id;

    const isAdminOrManager = ["admin", "manager"].some((role) =>
      currentUser.role.includes(role)
    );
    const isSameUser = currentUser._id.toString() === requestedUserId;

    if (!isAdminOrManager && !isSameUser) {
      return res.status(403).json({ message: "Access denied" });
    }

    const user = await User.findById(requestedUserId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(user);
  } catch (err) {
    console.error("Get user by ID error:", err.message);
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: err.message });
  }
});

//forgot-password
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res
        .status(404)
        .json({ message: "User not found with this email" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Save OTP to DB
    await Otp.create({
      userId: user._id,
      otp,
      expiresAt,
    });

    await emailService({
      to: email,
      subject: "Reset your password",
      html: forgotEmailTemplate(otp),
    });

    return res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    console.error("OTP generation error:", error.message);
    return res
      .status(500)
      .json({ message: "Something went wrong", error: error.message });
  }
});

// find by email
router.get("/find-by-email/:email", async (req, res) => {
  try {
    const email = req.params.email;
    console.log(email);
    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email }).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ user });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to fetch user", error: err.message });
  }
});

// Delete user route
router.delete("/delete/:id", auth, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user.userId);
    const isAdminOrManager = ["admin", "manager"].some((role) =>
      currentUser.role.includes(role)
    );

    if (!isAdminOrManager) {
      return res.status(403).json({ message: "Access denied" });
    }

    const userId = req.params.id;
    const user = await User.findById(userId);

    if (!user) return res.status(404).json({ message: "User not found" });

    // If driver, delete from Driver model too
    if (user.role.includes("driver")) {
      await Driver.findOneAndDelete({ user: userId });
    }

    await User.findByIdAndDelete(userId);

    res.json({ message: "User deleted successfully" });
  } catch (err) {
    res
      .status(500)
      .json({ message: "Failed to delete user", error: err.message });
  }
});

// Update user route
router.put(
  "/update/:id",
  upload.fields([
    { name: "profilePic", maxCount: 1 },
    { name: "drivingLicense", maxCount: 1 },
  ]),
  auth,
  async (req, res) => {
    try {
      const userId = req.params.id;
      const {
        firstName,
        lastName,
        email,
        mobile,
        dob,
        role,
        address,
        experience,
        licenseExpiry,
      } = req.body;

      console.log("➡️ Incoming update for user:", userId);

      const currentUser = await User.findById(req.user.userId);
      console.log("current user:-- ", currentUser);
      if (!currentUser) {
        return res
          .status(401)
          .json({ message: "Unauthorized - User not found" });
      }

      const isAdminOrManager = ["admin", "manager"].some((role) =>
        currentUser.role.includes(role)
      );
      if (!isAdminOrManager) {
        return res.status(403).json({ message: "Access denied" });
      }

      const profileBuffer = req.files?.profilePic?.[0]?.buffer;
      const licenseBuffer = req.files?.drivingLicense?.[0]?.buffer;

      const updateUser = {
        firstName,
        lastName,
        email,
        mobile,
        dob,
        role,
      };

      if (profileBuffer) {
        const profilePicUrl = await uploadToCloudinary(
          profileBuffer,
          "VMS/ProfilePics"
        );
        updateUser.profilePic = profilePicUrl;
        console.log("✅ Profile image uploaded");
      }

      const updatedUser = await User.findByIdAndUpdate(userId, updateUser, {
        new: true,
      });

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      console.log("✅ User basic info updated");

      // 🔽 Handle Driver logic
      if (updatedUser.role.includes("driver")) {
        console.log("🔍 Checking for existing driver record...");

        const driverData = {
          user: userId,
          address,
          experience,
          licenseExpiry,
        };

        if (licenseBuffer) {
          const licenseUrl = await uploadToCloudinary(
            licenseBuffer,
            "VMS/DrivingLicenses"
          );
          driverData.licenseFile = licenseUrl;
          console.log("✅ Driving license uploaded");
        }

        await Driver.findOneAndUpdate({ user: userId }, driverData, {
          new: true,
        });
        console.log("🔁 Existing driver updated");
      }

      res.json({
        message: "User and driver info updated successfully",
        user: updatedUser,
      });
    } catch (err) {
      console.error("❌ Update failed:", err);
      res.status(500).json({ message: "Update failed", error: err.message });
    }
  }
);

// reset password
router.post("/reset", async (req, res) => {
  try {
    const { otp, newPassword } = req.body;

    if (!otp || !newPassword) {
      return res
        .status(400)
        .json({ message: "OTP and new password are required" });
    }

    const otpRecord = await Otp.findOne({ otp }).sort({ createdAt: -1 });

    if (!otpRecord) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    if (otpRecord.expiresAt < new Date()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    const user = await User.findById(otpRecord.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.password = newPassword;
    await user.save();

    await Otp.deleteOne({ _id: otpRecord._id });

    return res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    console.error("❌ Reset password error:", error);
    return res
      .status(500)
      .json({ message: "Server error", error: error.message });
  }
});

// changepassword
router.put("/changepassword", auth, async (req, res) => {x  
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ message: "Both old and new passwords are required" });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect old password" });
    }

    user.password =user.password;
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Change password error:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});

// routes/driverRoutes.ts
router.get("/drivers", async (req, res) => {
  try {
    const drivers = await Driver.find().populate(
      "userId",
      "firstName lastName email"
    );
    res.json({ success: true, data: drivers });
  } catch (error) {
    console.error("Error fetching drivers:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Assign vehicle to driver
router.put("/assign-vehicle/:driverId", async (req, res) => {
  const { driverId } = req.params;
  const { vehicleId, assignedBy } = req.body;

  console.log("☑️driver id comes form frontend ", driverId);
  const driver = await Driver.findOne({user: driverId});
  console.log("driver find: ", driver.id);
  if (!driver) {
    console.log("❌ Driver not found with ID:", driverId);
    return res
      .status(404)
      .json({ success: false, message: "Driver not found" });
  }
  try {
    const updatedDriver = await Driver.findByIdAndUpdate(
      driver.id,
      { assignedVehicle: vehicleId, assignedBy },
      { new: true }
    )
      .populate("assignedVehicle")
      .populate("assignedBy");
    console.log(updatedDriver);
    res.json({
      success: true,
      message: "Vehicle assigned to driver successfully",
      driver: updatedDriver,
    });
  } catch (err) {
    console.error("Error assigning vehicle:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


export default router;
