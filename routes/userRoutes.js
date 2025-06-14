import express from "express";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// signup router
router.post("/register", async (req, res) => {
  const { firstName, lastName, email, password, mobile, dob, role } = req.body;
  try {
    let user = await User.findOne({ email });
    if (user) {
      return res.status(400).json({ message: "User already exists" });
    }
    user = new User({
      firstName,
      lastName,
      email,
      password,
      mobile,
      dob,
      role,
    });
    await user.save();
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res
      .status(201)
      .json({ token, user: { userId: user._id, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// login router
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }
    const payload = { userId: user._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({
      token,
      user: { userId: user._id, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// get all data router
router.get("/list", auth, async (req, res) => {
  console.log("hitted");

  try {
    const user = await User.findById(req.user.userId);

    console.log(user.role);
    if (!user || (!user.role == "admin" && "manager")) {
      return res.status(403).json({ message: "Access denied. Admins only." });
    }
    const users = await User.find().select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// get by id  router
router.get("/getById/:id", auth, async (req, res) => {
  console.log("get by id running ");
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// update router
router.put("/:id", auth, async (req, res) => {
  const { name, mobile, email, password } = req.body;

  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (name) user.name = name;
    if (mobile) user.mobile = mobile;
    if (email) user.email = email;
    if (password) user.password = password;

    await user.save();
    res.json({
      message: "User updated",
      user: { ...user.toObject(), password: undefined },
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// delete router
router.delete("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await user.deleteOne();
    res.json({ message: "User deleted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
