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

app.post("/api/leaves", async (req, res) => {
  const { employee_id: employeeId, start_date: startDate, end_date: endDate, reason } = req.body;

  if (!employeeId || !startDate || !endDate || !reason) {
    return res.status(422).json({
      message: "employee_id, start_date, end_date, dan reason wajib diisi",
    });
  }

  if (endDate < startDate) {
    return res.status(422).json({
      message: "end_date tidak boleh lebih kecil dari start_date",
    });
  }

  try {
    const [result] = await pool.query(
      `INSERT INTO leave_requests (employee_id, start_date, end_date, reason)
       VALUES (?, ?, ?, ?)`,
      [employeeId, startDate, endDate, reason]
    );

    return res.status(201).json({
      message: "Pengajuan cuti berhasil dibuat",
      data: {
        id: result.insertId,
        employee_id: employeeId,
        status: "pending",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal membuat pengajuan cuti",
      error: error.message,
    });
  }
});

async function updateLeaveStatus(req, res, status) {
  const { id } = req.params;
  const { note } = req.body;

  try {
    const [leaves] = await pool.query("SELECT id, status FROM leave_requests WHERE id = ? LIMIT 1", [id]);

    if (leaves.length === 0) {
      return res.status(404).json({
        message: "Pengajuan cuti tidak ditemukan",
      });
    }

    if (leaves[0].status !== "pending") {
      return res.status(409).json({
        message: "Pengajuan cuti sudah diproses",
      });
    }

    await pool.query(
      "UPDATE leave_requests SET status = ?, approver_note = ? WHERE id = ?",
      [status, note || null, id]
    );

    return res.json({
      message: status === "approved" ? "Cuti berhasil disetujui" : "Cuti berhasil ditolak",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal memproses cuti",
      error: error.message,
    });
  }
}

app.patch("/api/leaves/:id/approve", (req, res) => updateLeaveStatus(req, res, "approved"));
app.patch("/api/leaves/:id/reject", (req, res) => updateLeaveStatus(req, res, "rejected"));

app.get("/api/attendance/monthly-summary", async (req, res) => {
  const { employee_id: employeeId, month } = req.query;

  if (!month) {
    return res.status(422).json({
      message: "month wajib diisi, contoh: 2026-05",
    });
  }

  try {
    const attendanceParams = [`${month}%`];
    let attendanceWhere = "WHERE attendance_date LIKE ?";

    if (employeeId) {
      attendanceWhere += " AND employee_id = ?";
      attendanceParams.push(employeeId);
    }

    const [attendanceRows] = await pool.query(
      `SELECT
         COUNT(*) AS total_attendance_days,
         SUM(status = 'present') AS total_present,
         SUM(status = 'incomplete') AS total_incomplete
       FROM attendances
       ${attendanceWhere}`,
      attendanceParams
    );

    const leaveParams = [`${month}%`, `${month}%`];
    let leaveWhere = "WHERE status = 'approved' AND (start_date LIKE ? OR end_date LIKE ?)";

    if (employeeId) {
      leaveWhere += " AND employee_id = ?";
      leaveParams.push(employeeId);
    }

    const [leaveRows] = await pool.query(
      `SELECT COUNT(*) AS total_approved_leaves
       FROM leave_requests
       ${leaveWhere}`,
      leaveParams
    );

    return res.json({
      data: {
        month,
        employee_id: employeeId || null,
        total_attendance_days: Number(attendanceRows[0].total_attendance_days || 0),
        total_present: Number(attendanceRows[0].total_present || 0),
        total_incomplete: Number(attendanceRows[0].total_incomplete || 0),
        total_approved_leaves: Number(leaveRows[0].total_approved_leaves || 0),
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal mengambil rekap bulanan",
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
