-- rent_management.admin_actions definition

CREATE TABLE "admin_actions" (
  "id" int NOT NULL AUTO_INCREMENT,
  "admin_id" int NOT NULL,
  "action" varchar(100) NOT NULL,
  "target_type" enum('user','organization','subscription','system') NOT NULL,
  "target_id" int DEFAULT NULL,
  "details" json DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "admin_id" ("admin_id"),
  KEY "action" ("action"),
  KEY "target_type" ("target_type"),
  KEY "created_at" ("created_at")
);


-- rent_management.organizations definition

CREATE TABLE "organizations" (
  "id" int NOT NULL AUTO_INCREMENT,
  "name" varchar(255) NOT NULL,
  "email" varchar(255) NOT NULL,
  "phone" varchar(20) DEFAULT NULL,
  "address" text,
  "trial_start_date" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "trial_end_date" date NOT NULL,
  "is_active" tinyint(1) DEFAULT '1',
  "subscription_status" varchar(50) NOT NULL DEFAULT 'pending',
  "suspension_reason" text,
  "next_renewal_date" date DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "subscription_plan" varchar(50) DEFAULT 'trial',
  "subscription_price" decimal(10,2) DEFAULT '0.00',
  "overdue_since" date DEFAULT NULL,
  "billing_cycle" varchar(50) DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "email" ("email")
);


-- rent_management.document_categories definition

CREATE TABLE "document_categories" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "name" varchar(100) NOT NULL,
  "is_system" tinyint(1) DEFAULT '0',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  CONSTRAINT "document_categories_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE
);


-- rent_management.subscription_history definition

CREATE TABLE "subscription_history" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "plan_id" varchar(50) NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "payment_method" varchar(50) DEFAULT 'credit_card',
  "status" varchar(30) DEFAULT NULL,
  "start_date" date DEFAULT (curdate()),
  "end_date" date DEFAULT ((curdate() + interval 30 day)),
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "billing_cycle" varchar(50) DEFAULT 'monthly',
  "receipt_path" varchar(255) DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  CONSTRAINT "subscription_history_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE
);


-- rent_management.tenants definition

CREATE TABLE "tenants" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "tenant_id" varchar(50) NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "sex" enum('Male','Female') NOT NULL,
  "phone" varchar(20) NOT NULL,
  "city" varchar(100) NOT NULL,
  "subcity" varchar(100) NOT NULL,
  "woreda" varchar(100) NOT NULL,
  "house_no" varchar(50) NOT NULL,
  "organization" varchar(255) DEFAULT NULL,
  "has_agent" tinyint(1) DEFAULT '0',
  "agent_full_name" varchar(255) DEFAULT NULL,
  "agent_sex" enum('Male','Female') DEFAULT NULL,
  "agent_phone" varchar(20) DEFAULT NULL,
  "agent_city" varchar(100) DEFAULT NULL,
  "agent_subcity" varchar(100) DEFAULT NULL,
  "agent_woreda" varchar(100) DEFAULT NULL,
  "agent_house_no" varchar(50) DEFAULT NULL,
  "authentication_no" varchar(100) DEFAULT NULL,
  "authentication_date" date DEFAULT NULL,
  "is_active" tinyint(1) DEFAULT '1',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "termination_notes" text,
  "termination_date" date DEFAULT NULL,
  "termination_reason" varchar(255) DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "tenant_id" ("tenant_id"),
  KEY "organization_id" ("organization_id"),
  CONSTRAINT "tenants_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE
);


-- rent_management.users definition

CREATE TABLE "users" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int DEFAULT NULL,
  "email" varchar(255) NOT NULL,
  "password" varchar(255) NOT NULL,
  "full_name" varchar(255) NOT NULL,
  "phone" varchar(20) DEFAULT NULL,
  "role" varchar(50) NOT NULL,
  "is_active" tinyint(1) DEFAULT '1',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "last_login" timestamp NULL DEFAULT NULL,
  "reset_token" varchar(255) DEFAULT NULL,
  "reset_token_expiry" datetime DEFAULT NULL,
  "password_reset_required" tinyint(1) DEFAULT '0',
  "created_by" int DEFAULT NULL,
  PRIMARY KEY ("id"),
  UNIQUE KEY "email" ("email"),
  KEY "organization_id" ("organization_id"),
  CONSTRAINT "users_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE
);


-- rent_management.activity_logs definition

CREATE TABLE "activity_logs" (
  "id" int NOT NULL AUTO_INCREMENT,
  "user_id" int NOT NULL,
  "organization_id" int NOT NULL,
  "action" varchar(255) NOT NULL,
  "details" text,
  "ip_address" varchar(45) DEFAULT NULL,
  "user_agent" text,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "user_id" ("user_id"),
  KEY "organization_id" ("organization_id"),
  KEY "action" ("action"),
  KEY "created_at" ("created_at"),
  CONSTRAINT "activity_logs_ibfk_1" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "activity_logs_ibfk_2" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE
);


-- rent_management.documents definition

CREATE TABLE "documents" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "entity_type" enum('property','tenant','contract','maintenance') NOT NULL,
  "entity_id" int NOT NULL,
  "document_name" varchar(255) NOT NULL,
  "document_type" varchar(100) NOT NULL,
  "file_path" varchar(500) NOT NULL,
  "file_size" int DEFAULT NULL,
  "uploaded_by" int NOT NULL,
  "is_active" tinyint(1) DEFAULT '1',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "category_id" int DEFAULT NULL,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  KEY "uploaded_by" ("uploaded_by"),
  KEY "category_id" ("category_id"),
  CONSTRAINT "documents_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "documents_ibfk_2" FOREIGN KEY ("uploaded_by") REFERENCES "users" ("id") ON DELETE CASCADE,
  CONSTRAINT "documents_ibfk_3" FOREIGN KEY ("category_id") REFERENCES "document_categories" ("id") ON DELETE SET NULL
);


-- rent_management.notifications definition

CREATE TABLE "notifications" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "user_id" int NOT NULL,
  "title" varchar(255) NOT NULL,
  "message" text NOT NULL,
  "type" varchar(50) DEFAULT NULL,
  "is_read" tinyint(1) DEFAULT '0',
  "scheduled_date" datetime DEFAULT NULL,
  "sent_date" datetime DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  KEY "user_id" ("user_id"),
  CONSTRAINT "notifications_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "notifications_ibfk_2" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);


-- rent_management.properties definition

CREATE TABLE "properties" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "landlord_id" int NOT NULL,
  "name" varchar(255) NOT NULL,
  "type" enum('apartment','house','shop','office') NOT NULL,
  "address" text NOT NULL,
  "city" varchar(100) NOT NULL,
  "subcity" varchar(100) DEFAULT NULL,
  "woreda" varchar(100) DEFAULT NULL,
  "description" text,
  "total_units" int DEFAULT '1',
  "images" json DEFAULT NULL,
  "amenities" json DEFAULT NULL,
  "is_active" tinyint(1) DEFAULT '1',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  KEY "landlord_id" ("landlord_id"),
  CONSTRAINT "properties_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "properties_ibfk_2" FOREIGN KEY ("landlord_id") REFERENCES "users" ("id") ON DELETE CASCADE
);


-- rent_management.property_units definition

CREATE TABLE "property_units" (
  "id" int NOT NULL AUTO_INCREMENT,
  "property_id" int NOT NULL,
  "unit_number" varchar(50) NOT NULL,
  "floor_number" int DEFAULT NULL,
  "room_count" int DEFAULT NULL,
  "monthly_rent" decimal(10,2) NOT NULL,
  "deposit" decimal(10,2) NOT NULL,
  "is_occupied" tinyint(1) DEFAULT '0',
  "is_active" tinyint(1) DEFAULT '1',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "property_id" ("property_id"),
  CONSTRAINT "property_units_ibfk_1" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE CASCADE
);


-- rent_management.rental_contracts definition

CREATE TABLE "rental_contracts" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "property_id" int NOT NULL,
  "unit_id" int NOT NULL,
  "tenant_id" int NOT NULL,
  "landlord_id" int NOT NULL,
  "lease_duration" int NOT NULL,
  "contract_start_date" date NOT NULL,
  "contract_end_date" date NOT NULL,
  "monthly_rent" decimal(10,2) NOT NULL,
  "deposit" decimal(10,2) NOT NULL,
  "payment_term" int NOT NULL,
  "rent_start_date" date NOT NULL,
  "rent_end_date" date NOT NULL,
  "total_amount" decimal(10,2) NOT NULL,
  "eeu_payment" decimal(10,2) DEFAULT '0.00',
  "water_payment" decimal(10,2) DEFAULT '0.00',
  "generator_payment" decimal(10,2) DEFAULT '0.00',
  "status" enum('active','expired','terminated') DEFAULT 'active',
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  "actual_end_date" date DEFAULT NULL,
  "termination_reason" varchar(255) DEFAULT NULL,
  "termination_date" date DEFAULT NULL,
  "payment_due_day" int DEFAULT '1',
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  KEY "property_id" ("property_id"),
  KEY "unit_id" ("unit_id"),
  KEY "tenant_id" ("tenant_id"),
  KEY "landlord_id" ("landlord_id"),
  CONSTRAINT "rental_contracts_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "rental_contracts_ibfk_2" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE CASCADE,
  CONSTRAINT "rental_contracts_ibfk_3" FOREIGN KEY ("unit_id") REFERENCES "property_units" ("id") ON DELETE CASCADE,
  CONSTRAINT "rental_contracts_ibfk_4" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
  CONSTRAINT "rental_contracts_ibfk_5" FOREIGN KEY ("landlord_id") REFERENCES "users" ("id") ON DELETE CASCADE
);


-- rent_management.user_permissions definition

CREATE TABLE "user_permissions" (
  "id" int NOT NULL AUTO_INCREMENT,
  "user_id" int NOT NULL,
  "permissions" json DEFAULT NULL,
  "created_by" int DEFAULT NULL,
  "updated_by" int DEFAULT NULL,
  "created_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  UNIQUE KEY "unique_user_permissions" ("user_id"),
  KEY "user_permissions_created_by_fk" ("created_by"),
  KEY "user_permissions_updated_by_fk" ("updated_by"),
  CONSTRAINT "user_permissions_created_by_fk" FOREIGN KEY ("created_by") REFERENCES "users" ("id") ON DELETE SET NULL,
  CONSTRAINT "user_permissions_updated_by_fk" FOREIGN KEY ("updated_by") REFERENCES "users" ("id") ON DELETE SET NULL,
  CONSTRAINT "user_permissions_user_fk" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE CASCADE
);


-- rent_management.maintenance_requests definition

CREATE TABLE "maintenance_requests" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "property_id" int NOT NULL,
  "unit_id" int DEFAULT NULL,
  "tenant_id" int DEFAULT NULL,
  "assigned_to" int DEFAULT NULL,
  "title" varchar(255) NOT NULL,
  "description" text NOT NULL,
  "priority" enum('low','medium','high','urgent') DEFAULT 'medium',
  "status" enum('pending','in_progress','completed','cancelled') DEFAULT 'pending',
  "images" json DEFAULT NULL,
  "estimated_cost" decimal(10,2) DEFAULT NULL,
  "actual_cost" decimal(10,2) DEFAULT NULL,
  "completion_notes" text,
  "requested_date" date NOT NULL,
  "completed_date" date DEFAULT NULL,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  KEY "property_id" ("property_id"),
  KEY "unit_id" ("unit_id"),
  KEY "tenant_id" ("tenant_id"),
  KEY "assigned_to" ("assigned_to"),
  CONSTRAINT "maintenance_requests_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_ibfk_2" FOREIGN KEY ("property_id") REFERENCES "properties" ("id") ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_ibfk_3" FOREIGN KEY ("unit_id") REFERENCES "property_units" ("id") ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_ibfk_4" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE,
  CONSTRAINT "maintenance_requests_ibfk_5" FOREIGN KEY ("assigned_to") REFERENCES "users" ("id") ON DELETE SET NULL
);


-- rent_management.payments definition

CREATE TABLE "payments" (
  "id" int NOT NULL AUTO_INCREMENT,
  "organization_id" int NOT NULL,
  "contract_id" int NOT NULL,
  "tenant_id" int NOT NULL,
  "amount" decimal(10,2) NOT NULL,
  "payment_date" date DEFAULT NULL,
  "due_date" date NOT NULL,
  "payment_type" varchar(50) DEFAULT NULL,
  "payment_method" varchar(50) DEFAULT NULL,
  "status" varchar(50) NOT NULL,
  "receipt_path" varchar(500) DEFAULT NULL,
  "notes" text,
  "created_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY ("id"),
  KEY "organization_id" ("organization_id"),
  KEY "contract_id" ("contract_id"),
  KEY "tenant_id" ("tenant_id"),
  CONSTRAINT "payments_ibfk_1" FOREIGN KEY ("organization_id") REFERENCES "organizations" ("id") ON DELETE CASCADE,
  CONSTRAINT "payments_ibfk_2" FOREIGN KEY ("contract_id") REFERENCES "rental_contracts" ("id") ON DELETE CASCADE,
  CONSTRAINT "payments_ibfk_3" FOREIGN KEY ("tenant_id") REFERENCES "tenants" ("id") ON DELETE CASCADE
);