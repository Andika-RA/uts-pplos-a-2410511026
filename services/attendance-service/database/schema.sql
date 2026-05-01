CREATE TABLE IF NOT EXISTS attendances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  employee_id BIGINT UNSIGNED NOT NULL,
  attendance_date DATE NOT NULL,
  clock_in_at DATETIME NULL,
  clock_out_at DATETIME NULL,
  status ENUM('present', 'incomplete') DEFAULT 'incomplete',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_employee_attendance_date (employee_id, attendance_date)
);
