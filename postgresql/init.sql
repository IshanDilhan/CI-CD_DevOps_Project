CREATE DATABASE dbtodo;

\c dbtodo;

CREATE TABLE todo(
    todo_id SERIAL PRIMARY KEY,
    description VARCHAR(255)
);