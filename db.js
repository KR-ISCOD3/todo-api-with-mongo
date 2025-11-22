import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URI);

let db;

export const connectDB = async () => {
  try {
    await client.connect();
    db = client.db("todo_api");
    console.log("MongoDB connected");
  } catch (err) {
    console.error("DB connection error:", err);
  }
};

export const getDB = () => db;