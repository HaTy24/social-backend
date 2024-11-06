CREATE INDEX idx_users_wallet_address ON users (wallet_address);
CREATE INDEX idx_users_created_at ON users (created_at);
CREATE INDEX idx_users_status ON users (status);
CREATE UNIQUE INDEX idx_users_email ON users (email);
CREATE UNIQUE INDEX idx_users_google_id ON users (google_id);
CREATE UNIQUE INDEX idx_users_social_id ON users (social_id);
CREATE UNIQUE INDEX idx_users_screen_name ON users (screen_name);
CREATE INDEX idx_users_fullname ON users (fullname);
CREATE UNIQUE INDEX idx_users_referral_code ON users (referral_code);
CREATE INDEX idx_users_account_type ON users (account_type);
CREATE INDEX idx_users_metadata_referenceid ON users (metadata->>'referenceid');
CREATE INDEX idx_users_metadata_type ON users (metadata->>'type');