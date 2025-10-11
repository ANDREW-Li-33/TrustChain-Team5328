import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import userRoutes from "./routes/users";
import jobRoutes from "./routes/jobs";
import pendingRequestRoutes from "./routes/pendingrequests";
import telemetryDataRoutes from "./routes/telemetrydata";
import tokenRoutes from "./routes/tokens";


dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

//My real routes

app.use("/users", userRoutes);
app.use("/jobs", jobRoutes);
app.use("/pendingrequests", pendingRequestRoutes);
app.use("/telemetrydata", telemetryDataRoutes);
app.use("/tokens", tokenRoutes);
console.log("User routes mounted at /users");


// Sample route
app.get("/", (req, res) => {
  res.send("Backend API is running.");
});

app.use((req, res) => {
  console.log("Unhandled request:", req.method, req.url);
  res.status(404).json({ error: "Not found" });
});

const PORT = process.env.PORT || 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
