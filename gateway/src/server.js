const express = require("express");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 8000;
const services = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:8001",
  employee: process.env.EMPLOYEE_SERVICE_URL || "http://localhost:8002",
  attendance: process.env.ATTENDANCE_SERVICE_URL || "http://localhost:8003",
};

const limiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

function verifyToken(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const [type, token] = authHeader.split(" ");

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Token tidak ditemukan",
    });
  }

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "change_this_secret");
    return next();
  } catch (error) {
    return res.status(401).json({
      message: "Token tidak valid",
    });
  }
}

function proxyTo(target) {
  return createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path, req) => req.originalUrl,
    on: {
      error(err, req, res) {
        res.status(502).json({
          message: "Service tujuan belum bisa dihubungi",
          error: err.message,
        });
      },
    },
  });
}

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "api-gateway",
    routes: {
      "/api/auth": services.auth,
      "/api/employees": services.employee,
      "/api/attendance": services.attendance,
      "/api/leaves": services.attendance,
    },
  });
});

app.use(limiter);

app.use("/api/auth", proxyTo(services.auth));
app.use("/api/employees", verifyToken, proxyTo(services.employee));
app.use("/api/attendance", verifyToken, proxyTo(services.attendance));
app.use("/api/leaves", verifyToken, proxyTo(services.attendance));

app.use((req, res) => {
  res.status(404).json({
    message: "Route tidak ditemukan di gateway",
  });
});

app.listen(PORT, () => {
  console.log(`Gateway jalan di port ${PORT}`);
});
