const path = require("path");
const XLSX = require("xlsx");
const db = require("./db");

const filePath = path.join(__dirname, "data", "skin_cancer_trend.xlsx");

function findYearKey(row) {
  return Object.keys(row).find((k) => String(k).trim().toLowerCase() === "year");
}

function findRateKey(row) {
  return Object.keys(row).find((k) =>
    String(k).toLowerCase().includes("age-standardised rate")
  );
}

try {
  const workbook = XLSX.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);

  if (!rows.length) {
    throw new Error("Excel file is empty.");
  }

  const sampleRow = rows[0];
  const yearKey = findYearKey(sampleRow);
  const rateKey = findRateKey(sampleRow);

  if (!yearKey || !rateKey) {
    throw new Error(
      "Could not find 'Year' or 'Age-standardised rate...' columns in the Excel file."
    );
  }

  db.serialize(() => {
    db.run("DELETE FROM skin_cancer_trend");

    const stmt = db.prepare(
      "INSERT INTO skin_cancer_trend (year, incidence_rate) VALUES (?, ?)"
    );

    rows.forEach((row) => {
      const year = Number(row[yearKey]);
      const rate = Number(row[rateKey]);

      if (!Number.isNaN(year) && !Number.isNaN(rate)) {
        stmt.run(year, rate);
      }
    });

    stmt.finalize((err) => {
      if (err) {
        console.error("Failed to insert rows:", err.message);
      } else {
        console.log("Skin cancer trend data imported successfully.");
      }
      db.close();
    });
  });
} catch (err) {
  console.error("Import failed:", err.message);
  db.close();
}