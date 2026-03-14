const fs = require("fs");
const path = require("path");
const db = require("./db");

const sqlPath = path.join(__dirname, "init.sql");
const initSql = fs.readFileSync(sqlPath, "utf-8");

db.exec(initSql, (err) => {
  if (err) {
    console.error("Failed to initialise database:", err.message);
  } else {
    console.log("Database initialised successfully.");
  }
  db.close();
});