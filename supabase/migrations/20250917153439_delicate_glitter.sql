/*
  # Add User Permissions and Role Management

  1. New Tables
    - `user_permissions`
      - `id` (int, primary key, auto increment)
      - `user_id` (int, foreign key to users)
      - `permissions` (json, stores permission settings)
      - `created_by` (int, foreign key to users - who created these permissions)
      - `updated_by` (int, foreign key to users - who last updated)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Table Modifications
    - Add `created_by` column to `users` table to track who created each user

  3. Security
    - Add foreign key constraints
    - Add indexes for performance
*/

-- Add created_by column to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'created_by'
  ) THEN
    ALTER TABLE users ADD COLUMN created_by int DEFAULT NULL;
    ALTER TABLE users ADD CONSTRAINT users_created_by_fk 
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create user_permissions table
CREATE TABLE IF NOT EXISTS user_permissions (
  id int PRIMARY KEY AUTO_INCREMENT,
  user_id int NOT NULL,
  permissions json DEFAULT NULL,
  created_by int DEFAULT NULL,
  updated_by int DEFAULT NULL,
  created_at timestamp DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  
  CONSTRAINT user_permissions_user_fk 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT user_permissions_created_by_fk 
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT user_permissions_updated_by_fk 
    FOREIGN KEY (updated_by) REFERENCES users(id) ON DELETE SET NULL,
    
  UNIQUE KEY unique_user_permissions (user_id)
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_created_by ON user_permissions(created_by);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);