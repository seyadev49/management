
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
