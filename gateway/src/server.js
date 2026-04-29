const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
require("dotenv").config();

const app = express();

const PORT = process.env.PORT || 8000;
const services = {
  auth: process.env.AUTH_SERVICE_URL || "http://localhost:8001",
  employee: process.env.EMPLOYEE_SERVICE_URL || "http://localhost:8002",
  attendance: process.env.ATTENDANCE_SERVICE_URL || "http://localhost:8003",
};

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

app.use("/api/auth", proxyTo(services.auth));
app.use("/api/employees", proxyTo(services.employee));
app.use("/api/attendance", proxyTo(services.attendance));
app.use("/api/leaves", proxyTo(services.attendance));

app.use((req, res) => {
  res.status(404).json({
    message: "Route tidak ditemukan di gateway",
  });
});

app.listen(PORT, () => {
  console.log(`Gateway jalan di port ${PORT}`);
});
