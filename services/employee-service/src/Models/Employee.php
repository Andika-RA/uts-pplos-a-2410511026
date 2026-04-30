<?php

class Employee
{
    public function __construct(private PDO $db)
    {
    }

    public function all(): array
    {
        $stmt = $this->db->query(
            "SELECT e.*, d.name AS department_name, p.name AS position_name
             FROM employees e
             JOIN departments d ON d.id = e.department_id
             JOIN positions p ON p.id = e.position_id
             ORDER BY e.id DESC"
        );

        return $stmt->fetchAll();
    }

    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(
            "SELECT e.*, d.name AS department_name, p.name AS position_name,
                    ep.address, ep.birth_date, ep.gender, ep.emergency_contact
             FROM employees e
             JOIN departments d ON d.id = e.department_id
             JOIN positions p ON p.id = e.position_id
             LEFT JOIN employee_profiles ep ON ep.employee_id = e.id
             WHERE e.id = ?"
        );
        $stmt->execute([$id]);
        $employee = $stmt->fetch();

        return $employee ?: null;
    }

    public function create(array $data): int
    {
        $this->db->beginTransaction();

        $stmt = $this->db->prepare(
            "INSERT INTO employees
             (department_id, position_id, employee_number, name, email, phone, status, joined_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
        );
        $stmt->execute([
            $data['department_id'],
            $data['position_id'],
            $data['employee_number'],
            $data['name'],
            $data['email'],
            $data['phone'] ?? null,
            $data['status'] ?? 'active',
            $data['joined_at'],
        ]);

        $employeeId = (int) $this->db->lastInsertId();

        $profile = $this->db->prepare(
            "INSERT INTO employee_profiles
             (employee_id, address, birth_date, gender, emergency_contact)
             VALUES (?, ?, ?, ?, ?)"
        );
        $profile->execute([
            $employeeId,
            $data['address'] ?? null,
            $data['birth_date'] ?? null,
            $data['gender'] ?? null,
            $data['emergency_contact'] ?? null,
        ]);

        $this->db->commit();

        return $employeeId;
    }

    public function update(int $id, array $data): void
    {
        $employee = $this->find($id);

        if (!$employee) {
            return;
        }

        $this->db->beginTransaction();

        $stmt = $this->db->prepare(
            "UPDATE employees
             SET department_id = ?, position_id = ?, employee_number = ?, name = ?,
                 email = ?, phone = ?, status = ?, joined_at = ?
             WHERE id = ?"
        );
        $stmt->execute([
            $data['department_id'] ?? $employee['department_id'],
            $data['position_id'] ?? $employee['position_id'],
            $data['employee_number'] ?? $employee['employee_number'],
            $data['name'] ?? $employee['name'],
            $data['email'] ?? $employee['email'],
            $data['phone'] ?? $employee['phone'],
            $data['status'] ?? $employee['status'],
            $data['joined_at'] ?? $employee['joined_at'],
            $id,
        ]);

        $profile = $this->db->prepare(
            "UPDATE employee_profiles
             SET address = ?, birth_date = ?, gender = ?, emergency_contact = ?
             WHERE employee_id = ?"
        );
        $profile->execute([
            $data['address'] ?? $employee['address'],
            $data['birth_date'] ?? $employee['birth_date'],
            $data['gender'] ?? $employee['gender'],
            $data['emergency_contact'] ?? $employee['emergency_contact'],
            $id,
        ]);

        $this->db->commit();
    }

    public function delete(int $id): void
    {
        $stmt = $this->db->prepare("DELETE FROM employees WHERE id = ?");
        $stmt->execute([$id]);
    }
}
