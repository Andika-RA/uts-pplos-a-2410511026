# UTS PPLOS - Sistem Kepegawaian dan Absensi

Nama: Andika Rafa Akbar  
NIM: 2410511026  
Kelas: A

## Studi Kasus

Project ini dibuat untuk UTS mata kuliah Pembangunan Perangkat Lunak Berorientasi Service.

Studi kasus yang dipakai adalah Sistem Kepegawaian dan Absensi. Sistem dibuat dengan beberapa service terpisah supaya setiap bagian punya tanggung jawab sendiri dan tidak menumpuk dalam satu aplikasi monolitik.

## Video Demo

Video demo pengujian sistem bisa dilihat melalui link berikut:

https://youtu.be/HM4G6i4JGNk

## Service

- API Gateway: pintu masuk semua request, routing ke service tujuan, validasi JWT, dan rate limiting.
- Auth Service: register, login, JWT access token, refresh token, logout, dan Google OAuth.
- Employee Service: data departemen, jabatan, pegawai, dan profil pegawai.
- Attendance Service: absensi masuk, absensi pulang, pengajuan cuti, approval/reject cuti, dan rekap bulanan.

## Stack

- Gateway: Node.js dan Express
- Auth Service: Node.js, Express, MySQL, JWT
- Employee Service: PHP MVC sederhana dan MySQL
- Attendance Service: Node.js, Express, MySQL
- Database: MySQL/MariaDB dengan schema terpisah per service
- Pengujian API: Postman

## Struktur Project

```text
uts-pplos-a-2410511026/
├── README.md
├── docker-compose.yml
├── docs/
│   ├── LAPORAN UTS SE2 final.pdf
│   └── arsitektur diagram.png
├── gateway/
│   ├── package.json
│   ├── package-lock.json
│   └── src/
│       └── server.js
├── services/
│   ├── auth-service/
│   │   ├── package.json
│   │   ├── package-lock.json
│   │   ├── database/
│   │   │   └── schema.sql
│   │   └── src/
│   │       ├── db.js
│   │       └── server.js
│   ├── employee-service/
│   │   ├── database/
│   │   │   └── schema.sql
│   │   ├── public/
│   │   │   └── index.php
│   │   └── src/
│   │       ├── Controllers/
│   │       │   └── EmployeeController.php
│   │       ├── Models/
│   │       │   └── Employee.php
│   │       ├── Database.php
│   │       └── Response.php
│   └── attendance-service/
│       ├── package.json
│       ├── package-lock.json
│       ├── database/
│       │   └── schema.sql
│       └── src/
│           ├── db.js
│           └── server.js
└── postman/
    ├── collection.json
    └── screenshot pengujian endpoint
```

## Database

Project ini memakai tiga database terpisah:

- `auth_db` untuk auth-service
- `employee_db` untuk employee-service
- `attendance_db` untuk attendance-service

Schema database ada di folder masing-masing service:

- `services/auth-service/database/schema.sql`
- `services/employee-service/database/schema.sql`
- `services/attendance-service/database/schema.sql`

Sebelum service dijalankan, pastikan MySQL/MariaDB sudah menyala dan ketiga database tersebut sudah dibuat. Setelah itu import schema sesuai database masing-masing.

## Cara Menjalankan

Pastikan MySQL sudah menyala terlebih dahulu. Jika memakai XAMPP, jalankan MySQL dari XAMPP Control Panel.

Setelah MySQL berjalan, jalankan setiap service di terminal yang berbeda.

### 1. Auth Service

```powershell
cd services/auth-service
node src/server.js
```

Service berjalan di:

```text
http://localhost:8001
```

### 2. Employee Service

Jika memakai PHP dari XAMPP, jalankan dengan command berikut supaya extension `pdo_mysql` ikut aktif:

```powershell
cd services/employee-service
C:\xampp\php\php.exe -d extension_dir=C:\xampp\php\ext -d extension=pdo_mysql -S localhost:8002 -t public
```

Service berjalan di:

```text
http://localhost:8002
```

### 3. Attendance Service

```powershell
cd services/attendance-service
node src/server.js
```

Service berjalan di:

```text
http://localhost:8003
```

### 4. API Gateway

```powershell
cd gateway
node src/server.js
```

Gateway berjalan di:

```text
http://localhost:8000
```

Semua request dari Postman dipanggil lewat gateway dengan `base_url`:

```text
http://localhost:8000
```

## Endpoint

Semua endpoint dipanggil lewat API Gateway.

### Health

- `GET /health`

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/google`
- `GET /api/auth/google/callback`

### Employee

- `GET /api/employees`
- `POST /api/employees`
- `GET /api/employees/{id}`
- `PATCH /api/employees/{id}`
- `DELETE /api/employees/{id}`

### Attendance dan Leave

- `POST /api/attendance/clock-in`
- `POST /api/attendance/clock-out`
- `GET /api/attendance/monthly-summary`
- `POST /api/leaves`
- `PATCH /api/leaves/{id}/approve`
- `PATCH /api/leaves/{id}/reject`

## Pengujian

Collection Postman tersedia di:

```text
postman/collection.json
```

Folder `postman/` juga berisi screenshot hasil pengujian endpoint, mulai dari health check, auth, Google OAuth, employee, attendance, leave, monthly summary, delete employee, sampai logout.
