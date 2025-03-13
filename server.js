const express = require("express");
const fs = require("fs");
const csv = require("csv-parser");
const cache = require("memory-cache");
const cors = require("cors");

const app = express();
const PORT = 3300;

// Middleware
app.use(cors());

// Store data in memory
let spareParts = [];

// Function to read CSV file into memory
const loadCSVData = () => {
  spareParts = []; // Clear old data
  fs.createReadStream("LE.txt")
    .pipe(csv({ separator: "\t", headers: false }))
    .on("data", (row) => {
      spareParts.push({
        serialNumber: row[0].replace(/"/g, ""), // Remove quotes
        name: row[1].replace(/"/g, ""),
        price: parseFloat(row[8].replace(",", ".")) || 0, // Convert price to float
        brand: row[9].replace(/"/g, ""),
        finalPrice: parseFloat(row[10].replace(",", ".")) || 0,
      });
    })
    .on("end", () => {
      console.log(`✅ Loaded ${spareParts.length} spare parts into memory.`);
    });
};

// Load data on startup
loadCSVData();

// Homepage response
app.get("/", (req, res) => {
    res.send("Welcome to Sten Spare Parts API! Try /spare-parts");
  });

// API Endpoint: Get spare parts with pagination, search, and sorting
app.get("/spare-parts", (req, res) => {
  let { name, sn, search, page = 1, sort } = req.query;
  let results = spareParts;

  // Filter by name
  if (name) {
    results = results.filter((item) =>
      item.name.toLowerCase().includes(name.toLowerCase())
    );
  }

  // Filter by serial number
  if (sn) {
    results = results.filter((item) => item.serialNumber.includes(sn));
  }

  // General search (name or serial)
  if (search) {
    results = results.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.serialNumber.includes(search)
    );
  }

  // Sorting
  if (sort) {
    const isDescending = sort.startsWith("-");
    const sortField = sort.replace("-", "");

    results = results.sort((a, b) => {
      if (sortField === "price") {
        return isDescending ? b.price - a.price : a.price - b.price;
      }
      if (sortField === "finalPrice") {
        return isDescending ? b.finalPrice - a.finalPrice : a.finalPrice - b.finalPrice;
      }
      return 0;
    });
  }

  // Pagination
  const pageSize = 30;
  const startIndex = (page - 1) * pageSize;
  const paginatedResults = results.slice(startIndex, startIndex + pageSize);

  res.json({
    totalResults: results.length,
    page: Number(page),
    totalPages: Math.ceil(results.length / pageSize),
    data: paginatedResults,
  });
});

// Reload data from CSV manually
app.get("/reload", (req, res) => {
  loadCSVData();
  res.json({ message: "Data reloaded from CSV" });
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
