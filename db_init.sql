CREATE TYPE relationship_type AS ENUM ('Positive', 'Negative');
CREATE TYPE loop_type AS ENUM ('Balancing', 'Reinforcing');
CREATE TYPE archetype_type AS ENUM ('Shifting the Burden');

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    email VARCHAR UNIQUE NOT NULL,
    password VARCHAR NOT NULL
);

CREATE TABLE IF NOT EXISTS variables (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description VARCHAR,
    user_id VARCHAR REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS clds (
    id VARCHAR PRIMARY KEY,
    name VARCHAR NOT NULL,
    description TEXT,
    date DATE NOT NULL,
    user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS cld_variables (
    cld_id VARCHAR REFERENCES clds(id),
    variable_id VARCHAR REFERENCES variables(id),
    PRIMARY KEY (cld_id, variable_id)
);

CREATE TABLE IF NOT EXISTS relationships (
    id VARCHAR PRIMARY KEY,
    source_id VARCHAR REFERENCES variables(id),
    target_id VARCHAR REFERENCES variables(id),
    type relationship_type NOT NULL,
    cld_id VARCHAR REFERENCES clds(id)
);

CREATE TABLE IF NOT EXISTS feedback_loops (
    id VARCHAR PRIMARY KEY,
    type loop_type NOT NULL,
    cld_id VARCHAR REFERENCES clds(id)
);

CREATE TABLE IF NOT EXISTS feedback_loop_variables (
    feedback_loop_id VARCHAR REFERENCES feedback_loops(id),
    variable_id VARCHAR REFERENCES variables(id),
    PRIMARY KEY (feedback_loop_id, variable_id)
);

CREATE TABLE IF NOT EXISTS archetypes (
    id VARCHAR PRIMARY KEY,
    type archetype_type NOT NULL,
    cld_id VARCHAR REFERENCES clds(id)
);

CREATE TABLE IF NOT EXISTS archetype_variables (
    archetype_id VARCHAR REFERENCES archetypes(id),
    variable_id VARCHAR REFERENCES variables(id),
    PRIMARY KEY (archetype_id, variable_id)
);
