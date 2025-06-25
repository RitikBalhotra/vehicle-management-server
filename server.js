
import express from "express";
import connectDB from './config/connectDB.js';
import userRoutes from "./routes/userRoutes.js";
import vehicleRoutes from "./routes/vehicleRoutes.js"
import cors from "cors";
import dotenv from "dotenv";



dotenv.config();


const app = express();
app.use(cors({
  origin: [process.env.FRONTEND_ORIGIN1, process.env.FRONTEND_ORIGIN2],
  credentials: true,
  methods:'*',
  allowedHeaders:true
}));
app.use(express.json());

connectDB();

app.use("/api", userRoutes );
app.use("/api", vehicleRoutes)


const PORT = process.env.SERVER_PORT || 3020;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
