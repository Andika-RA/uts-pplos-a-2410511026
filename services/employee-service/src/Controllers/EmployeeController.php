<?php

class EmployeeController
{
    public function __construct(private Employee $employee)
    {
    }

    public function index(): void
    {
        Response::json([
            'data' => $this->employee->all(),
        ]);
    }

    public function show(int $id): void
    {
        $employee = $this->employee->find($id);

        if (!$employee) {
            Response::json(['message' => 'Pegawai tidak ditemukan'], 404);
        }

        Response::json(['data' => $employee]);
    }

    public function store(): void
    {
        $data = $this->body();
        $errors = $this->validate($data);

        if ($errors) {
            Response::json(['message' => 'Validasi gagal', 'errors' => $errors], 422);
        }

        try {
            $id = $this->employee->create($data);
            Response::json([
                'message' => 'Pegawai berhasil dibuat',
                'data' => $this->employee->find($id),
            ], 201);
        } catch (PDOException $error) {
            Response::json([
                'message' => 'Gagal membuat pegawai',
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function update(int $id): void
    {
        if (!$this->employee->find($id)) {
            Response::json(['message' => 'Pegawai tidak ditemukan'], 404);
        }

        $data = $this->body();

        try {
            $this->employee->update($id, $data);
            Response::json([
                'message' => 'Pegawai berhasil diperbarui',
                'data' => $this->employee->find($id),
            ]);
        } catch (PDOException $error) {
            Response::json([
                'message' => 'Gagal memperbarui pegawai',
                'error' => $error->getMessage(),
            ], 500);
        }
    }

    public function destroy(int $id): void
    {
        if (!$this->employee->find($id)) {
            Response::json(['message' => 'Pegawai tidak ditemukan'], 404);
        }

        $this->employee->delete($id);
        Response::json(['message' => 'Pegawai berhasil dihapus'], 200);
    }

    private function body(): array
    {
        $raw = file_get_contents('php://input');
        $data = json_decode($raw, true);

        return is_array($data) ? $data : [];
    }

    private function validate(array $data): array
    {
        $errors = [];
        $required = ['department_id', 'position_id', 'employee_number', 'name', 'email', 'joined_at'];

        foreach ($required as $field) {
            if (empty($data[$field])) {
                $errors[$field] = 'Field wajib diisi';
            }
        }

        if (!empty($data['email']) && !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
            $errors['email'] = 'Format email tidak valid';
        }

        return $errors;
    }
}
