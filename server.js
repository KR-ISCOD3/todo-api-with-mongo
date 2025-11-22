// Import built-in HTTP module to create a server
import http from "http";

// Import custom database functions
import { connectDB, getDB } from "./db.js";

// Load environment variables from .env
import dotenv from "dotenv";

// Import URL parser to read routes
import { parse } from "url";

// Load .env file
dotenv.config();

// Connect to MongoDB before starting the server
await connectDB();

// PORT from env or default to 8000
const PORT = process.env.PORT || 8000;

/**
 * Helper function to parse JSON request body
 * Works for POST and PUT requests
 */
const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = "";

    // Receive chunks of data
    req.on("data", (chunk) => {
      body += chunk.toString();
    });

    // Finished receiving data
    req.on("end", () => {
      try {
        // Convert string → JSON
        resolve(JSON.parse(body || "{}"));
      } catch (err) {
        reject(err);
      }
    });
  });
};

/**
 * MAIN HTTP SERVER
 */
const server = http.createServer(async (req, res) => {
  const db = getDB();              // Get connected DB
  const todos = db.collection("todos"); // Select "todos" collection
  const { pathname } = parse(req.url, true); // Parse URL path

  /**
   * BASE ROUTE (GET /)
   */
  if (req.method === "GET" && pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "Node.js To-Do API running..." }));
    return;
  }

  /**
   * GET /todos → Get all todo items
   */
  if (req.method === "GET" && pathname === "/todos") {
    const allTodos = await todos.find().toArray();

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(allTodos));
    return;
  }

  /**
   * POST /todos → Create new todo
   */
  if (req.method === "POST" && pathname === "/todos") {
    try {
      // Parse incoming JSON body
      const data = await parseBody(req);

      // Insert new todo into database
      const result = await todos.insertOne({
        title: data.title || "Untitled",
        completed: false,
        createdAt: new Date(),
      });

      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  /**
   * PUT /todos?id=ID → Update a todo
   */
  if (req.method === "PUT" && pathname === "/todos") {
    try {
      // Read ?id= parameter from URL
      const query = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const id = query.get("id");

      if (!id) throw new Error("Missing ID");

      // Get ObjectId class from MongoDB
      const { ObjectId } = await import("mongodb");

      // Parse JSON body
      const data = await parseBody(req);

      // Update todo
      const result = await todos.findOneAndUpdate(
        { _id: new ObjectId(id) }, // Find by ID
        { $set: { ...data } },     // Fields to update
        { returnDocument: "after" } // Return updated document
      );

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result.value));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  /**
   * DELETE /todos?id=ID → Delete a todo
   */
  if (req.method === "DELETE" && pathname === "/todos") {
    try {
      const query = new URL(req.url, `http://${req.headers.host}`).searchParams;
      const id = query.get("id");

      if (!id) throw new Error("Missing ID");

      const { ObjectId } = await import("mongodb");

      // Delete from database
      await todos.deleteOne({ _id: new ObjectId(id) });

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ message: "Todo deleted" }));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  /**
   * Fallback for unknown routes
   */
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Route not found" }));
});

// Start server
server.listen(PORT, () =>
  console.log(`Server running on port http://localhost:${PORT}`)
);
