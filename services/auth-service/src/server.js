const bcrypt = require("bcryptjs");
const express = require("express");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "auth-service",
  });
});

app.post("/api/auth/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(422).json({
      message: "Nama, email, dan password wajib diisi",
    });
  }

  if (password.length < 6) {
    return res.status(422).json({
      message: "Password minimal 6 karakter",
    });
  }

  try {
    const [existingUsers] = await pool.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        message: "Email sudah terdaftar",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const [result] = await pool.query(
      "INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)",
      [name, email, passwordHash]
    );

    return res.status(201).json({
      message: "Register berhasil",
      data: {
        id: result.insertId,
        name,
        email,
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal register user",
      error: error.message,
    });
  }
});

app.use((req, res) => {
  res.status(404).json({
    message: "Route auth tidak ditemukan",
  });
});

app.listen(PORT, () => {
  console.log(`Auth service jalan di port ${PORT}`);
});
