CREATE TYPE relationship_type AS ENUM ('Positive', 'Negative');

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS objects (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    description VARCHAR
);

CREATE TABLE clds (
    id SERIAL PRIMARY KEY,
    name VARCHAR NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE variable_clds (
    id SERIAL PRIMARY KEY,
    cld_id INTEGER REFERENCES clds(id) ON DELETE CASCADE,
    from_variable_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
    to_variable_id INTEGER REFERENCES objects(id) ON DELETE CASCADE,
    type relationship_type NOT NULL
);
