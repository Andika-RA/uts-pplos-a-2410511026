const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("./db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8001;

app.use(express.json());

function makeAccessToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    process.env.JWT_SECRET || "change_this_secret",
    { expiresIn: process.env.JWT_EXPIRES_IN || "15m" }
  );
}

async function makeRefreshToken(userId) {
  const token = crypto.randomBytes(40).toString("hex");
  const days = Number(process.env.REFRESH_TOKEN_EXPIRES_DAYS || 7);
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);

  await pool.query(
    "INSERT INTO refresh_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
    [userId, token, expiresAt]
  );

  return token;
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Request OAuth gagal");
  }

  return data;
}

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

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(422).json({
      message: "Email dan password wajib diisi",
    });
  }

  try {
    const [users] = await pool.query(
      "SELECT id, name, email, password_hash FROM users WHERE email = ? LIMIT 1",
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const user = users[0];

    if (!user.password_hash) {
      return res.status(401).json({
        message: "User ini login memakai OAuth",
      });
    }

    const passwordValid = await bcrypt.compare(password, user.password_hash);
    if (!passwordValid) {
      return res.status(401).json({
        message: "Email atau password salah",
      });
    }

    const accessToken = makeAccessToken(user);
    const refreshToken = await makeRefreshToken(user.id);

    return res.json({
      message: "Login berhasil",
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: process.env.JWT_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal login",
      error: error.message,
    });
  }
});

app.post("/api/auth/refresh", async (req, res) => {
  const { refresh_token: refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(422).json({
      message: "Refresh token wajib diisi",
    });
  }

  try {
    const [tokens] = await pool.query(
      `SELECT rt.id, rt.user_id, u.name, u.email
       FROM refresh_tokens rt
       JOIN users u ON u.id = rt.user_id
       WHERE rt.token = ?
         AND rt.revoked_at IS NULL
         AND rt.expires_at > NOW()
       LIMIT 1`,
      [refreshToken]
    );

    if (tokens.length === 0) {
      return res.status(401).json({
        message: "Refresh token tidak valid",
      });
    }

    const user = {
      id: tokens[0].user_id,
      name: tokens[0].name,
      email: tokens[0].email,
    };

    return res.json({
      message: "Token berhasil diperbarui",
      data: {
        access_token: makeAccessToken(user),
        token_type: "Bearer",
        expires_in: process.env.JWT_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal refresh token",
      error: error.message,
    });
  }
});

app.post("/api/auth/logout", async (req, res) => {
  const { refresh_token: refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(422).json({
      message: "Refresh token wajib diisi",
    });
  }

  try {
    await pool.query(
      "UPDATE refresh_tokens SET revoked_at = NOW() WHERE token = ? AND revoked_at IS NULL",
      [refreshToken]
    );

    return res.json({
      message: "Logout berhasil",
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal logout",
      error: error.message,
    });
  }
});

app.get("/api/auth/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const callbackUrl = process.env.GOOGLE_CALLBACK_URL;

  if (!clientId || !callbackUrl) {
    return res.status(500).json({
      message: "Google OAuth belum dikonfigurasi",
    });
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "select_account",
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;

  if (!code) {
    return res.status(422).json({
      message: "Code OAuth tidak ditemukan",
    });
  }

  try {
    const tokenData = await fetchJson("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: process.env.GOOGLE_CALLBACK_URL || "",
        grant_type: "authorization_code",
      }),
    });

    const profile = await fetchJson("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${tokenData.access_token}`,
      },
    });

    if (!profile.email) {
      return res.status(422).json({
        message: "Email Google tidak ditemukan",
      });
    }

    const [users] = await pool.query(
      `SELECT id, name, email
       FROM users
       WHERE (oauth_provider = 'google' AND oauth_id = ?)
          OR email = ?
       LIMIT 1`,
      [profile.id, profile.email]
    );

    let user;

    if (users.length > 0) {
      user = users[0];
      await pool.query(
        `UPDATE users
         SET name = ?, oauth_provider = 'google', oauth_id = ?, avatar_url = ?
         WHERE id = ?`,
        [profile.name || user.name, profile.id, profile.picture || null, user.id]
      );
    } else {
      const [result] = await pool.query(
        `INSERT INTO users (name, email, oauth_provider, oauth_id, avatar_url)
         VALUES (?, ?, 'google', ?, ?)`,
        [profile.name || profile.email, profile.email, profile.id, profile.picture || null]
      );

      user = {
        id: result.insertId,
        name: profile.name || profile.email,
        email: profile.email,
      };
    }

    const accessToken = makeAccessToken(user);
    const refreshToken = await makeRefreshToken(user.id);

    return res.json({
      message: "Login Google berhasil",
      data: {
        user: {
          id: user.id,
          name: profile.name || user.name,
          email: user.email,
          avatar_url: profile.picture || null,
        },
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: "Bearer",
        expires_in: process.env.JWT_EXPIRES_IN || "15m",
      },
    });
  } catch (error) {
    return res.status(500).json({
      message: "Gagal login Google",
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
