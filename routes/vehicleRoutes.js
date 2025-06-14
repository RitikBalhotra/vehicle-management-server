import express from "express";
import Vehicle from "../models/Vehicle.js";
import jwt from "jsonwebtoken";
import auth from "../middleware/auth.js";
import User from "../models/User.js";
// import auth from "../middleware/auth"

const router = express.Router();

//add vehicle
router.post("/add", async (req, res) => {
  const {
    vehicleName,
    vehicleModel,
    vehicleYear,
    type,
    chassiNumber,
    registrationNumber,
    vehicleDescription,
    status,
  } = req.body;
  try {
    console.log(req.body);
    let vehicle = await Vehicle.findOne({ chassiNumber });
    if (vehicle) {
      return res.status(400).json({ message: "Vehicle already exists" });
    }
    vehicle = new Vehicle({
      vehicleName,
      vehicleModel,
      vehicleYear,
      type,
      chassiNumber,
      registrationNumber,
      vehicleDescription,
      status,
    });
    await vehicle.save();
    const payload = { vehicle: vehicle._id };
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "5h",
    });
    res
      .status(201)
      .json({
        token,
        vehicle: {
          vehicleId: vehicle._id,
          vehicleName: vehicle.vehicleName,
          vehicle: vehicle.chassiNumber,
        },
      });
  } catch (err) {
    console.error(err)
    res.status(500).json({message: " Server error"})
  }
});


// get all vehicles 
router.get("/vehiclelist", auth, async(req, res)=>{
    console.log("vehicle list run ");
    console.log(req.body);
    try{
        const user = await User.findById(req.user.userId)
        console.log("user :"+user);
        const temp = user.role !== 'admin' || user.role !== 'manager';
        console.log("temp :"+temp);
        console.log(temp);
        if(!temp){
            return res.status(403).json({message: "Access denied.  Admins and manager only"})
        }
        const vehicles = await Vehicle.find();
        res.json(vehicles);
    }
    catch(err){
        res.status(500).json({message:"Server error"});
    }
})

export default router;