<?php

require __DIR__ . '/../src/Database.php';
require __DIR__ . '/../src/Response.php';
require __DIR__ . '/../src/Models/Employee.php';
require __DIR__ . '/../src/Controllers/EmployeeController.php';

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

$employee = new Employee(Database::connection());
$controller = new EmployeeController($employee);

if ($path === '/health') {
    Response::json([
        'status' => 'ok',
        'service' => 'employee-service',
    ]);
}

if ($path === '/api/employees' && $method === 'GET') {
    $controller->index();
}

if ($path === '/api/employees' && $method === 'POST') {
    $controller->store();
}

if (preg_match('#^/api/employees/([0-9]+)$#', $path, $matches)) {
    $id = (int) $matches[1];

    if ($method === 'GET') {
        $controller->show($id);
    }

    if ($method === 'PATCH') {
        $controller->update($id);
    }

    if ($method === 'DELETE') {
        $controller->destroy($id);
    }
}

Response::json(['message' => 'Route employee tidak ditemukan'], 404);
