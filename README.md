# UTS PPLOS - Sistem Kepegawaian dan Absensi

Nama: Andika Rafa Akbar  
NIM: 2410511026  
Kelas: A

## Studi Kasus

Project ini dibuat untuk UTS mata kuliah Pembangunan Perangkat Lunak Berorientasi Service.

Studi kasus yang dipakai adalah Sistem Kepegawaian dan Absensi. Sistem dibagi menjadi beberapa service supaya tiap bagian punya tanggung jawab sendiri.

## Service

- API Gateway: pintu masuk semua request
- Auth Service: register, login, JWT, refresh token, logout, dan Google OAuth
- Employee Service: data departemen, jabatan, pegawai, dan profil pegawai
- Attendance Service: absensi masuk, absensi pulang, cuti, approval cuti, dan rekap bulanan

## Stack

- Gateway: Node.js dan Express
- Auth Service: Node.js, Express, MySQL, JWT
- Employee Service: PHP MVC sederhana dan MySQL
- Attendance Service: Node.js, Express, MySQL
- Database: MySQL/MariaDB dengan schema terpisah per service

## Rencana Endpoint

Semua endpoint dipanggil lewat gateway.

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

### Attendance

- `POST /api/attendance/clock-in`
- `POST /api/attendance/clock-out`
- `GET /api/attendance/monthly-summary`
- `POST /api/leaves`
- `PATCH /api/leaves/{id}/approve`
- `PATCH /api/leaves/{id}/reject`

## Cara Menjalankan

Bagian ini akan dilengkapi setelah semua service selesai dibuat.
