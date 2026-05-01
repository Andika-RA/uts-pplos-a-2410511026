const express = require("express");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8003;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "attendance-service",
  });
});

app.post("/api/attendance/clock-in", async (req, res) => {
  const { employee_id: employeeId } = req.body;

  if (!employeeId) {
    return res.status(422).json({
      message: "employee_id wajib diisi",
    });
  }

  try {
    const [existing] = await pool.query(
      "SELECT id, clock_in_at FROM attendances WHERE employee_id = ? AND attendance_date = CURDATE() LIMIT 1",
      [employeeId]
    );

    if (existing.length > 0 && existing[0].clock_in_at) {
      return res.status(409).json({
        message: "Pegawai sudah clock-in hari ini",
      });
    }

    const [result] = await pool.query(
      `INSERT INTO attendances (employee_id, attendance_date, clock_in_at, status)
       VALUES (?, CURDATE(), NOW(), 'incomplete')`,
      [employeeId]
    );

    return res.status(201).json({
      message: "Clock-in berhasil",
      data: {
        id: result.insertId,
        employee_id: employeeId,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal clock-in",
      error: error.message,
    });
  }
});

app.post("/api/attendance/clock-out", async (req, res) => {
  const { employee_id: employeeId } = req.body;

  if (!employeeId) {
    return res.status(422).json({
      message: "employee_id wajib diisi",
    });
  }

  try {
    const [rows] = await pool.query(
      "SELECT id, clock_out_at FROM attendances WHERE employee_id = ? AND attendance_date = CURDATE() LIMIT 1",
      [employeeId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        message: "Data clock-in hari ini belum ada",
      });
    }

    if (rows[0].clock_out_at) {
      return res.status(409).json({
        message: "Pegawai sudah clock-out hari ini",
      });
    }

    await pool.query(
      "UPDATE attendances SET clock_out_at = NOW(), status = 'present' WHERE id = ?",
      [rows[0].id]
    );

    return res.json({
      message: "Clock-out berhasil",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal clock-out",
      error: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route attendance tidak ditemukan",
  });
});

app.listen(PORT, () => {
  console.log(`Attendance service jalan di port ${PORT}`);
});
