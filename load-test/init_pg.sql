ALTER USER postgres WITH PASSWORD 'postgres';
SELECT 'CREATE DATABASE ibeno_test' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'ibeno_test')\gexec
