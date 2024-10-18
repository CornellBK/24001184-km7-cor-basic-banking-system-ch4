-- Untuk generate dummy data, query pgAdmin database baru yg dimigrasi, biar IDny cocok semua 
-- INSERT INTO banking_system_schema.users (name, email, password)
-- VALUES 
--   ('John Doe', 'john.doe@example.com', 'password123'), -- id 1 hrsny klo pertama
--   ('Jane Smith', 'jane.smith@example.com', 'password456'); -- id 2 hrsny klo kedua

-- INSERT INTO banking_system_schema.profiles (user_id, identity_type, identity_number, address)
-- VALUES 
--   (1, 'Passport', 'A1234567', '123 Main St, City, Country'), -- Profile buat user 1
--   (2, 'Driver License', 'B9876543', '456 Elm St, Another City, Country'); -- Profile buat user 2

-- INSERT INTO banking_system_schema.bank_accounts (user_id, bank_name, bank_account_number, balance)
-- VALUES 
--   (1, 'BCA', '111222333', 1000.00),  -- Bank account user id = 1, id = 1
--   (2, 'BCA', '444555666', 2500.00),  -- bank account user id = 2, id = 2
--   (2, 'BCA', '777888999', 3000.00);  -- bank account user id = 2, id = 3

-- INSERT INTO banking_system_schema.transactions (source_account_id, destination_account_id, amount, "transactionDate")
-- VALUES 
--   (2, 3, 200.00, '2024-10-18'),  -- Transaction buat bank account dgn id = 1
--   (3, 4, 500.00, '2024-10-17');   -- Transaction buat bank account dgn id = 2

-- SELECT * FROM banking_system_schema.users;
-- SELECT * FROM banking_system_schema.bank_accounts;
-- SELECT * FROM banking_system_schema.profiles;
-- SELECT * FROM banking_system_schema.transactions;
