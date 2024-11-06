ALTER TABLE users
ADD password varchar DEFAULT NULL,
ADD is_verified_email boolean DEFAULT NULL,
ADD token varchar DEFAULT NULL;

CREATE INDEX users_token_idx ON users(token);