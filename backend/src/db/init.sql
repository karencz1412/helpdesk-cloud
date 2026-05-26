CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(120) NOT NULL,
  email VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('USER','TECHNICIAN','ADMIN')) DEFAULT 'USER',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(160) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(60) NOT NULL DEFAULT 'Otro',
  priority VARCHAR(20) NOT NULL CHECK (priority IN ('BAJA','MEDIA','ALTA','URGENTE')) DEFAULT 'MEDIA',
  status VARCHAR(30) NOT NULL CHECK (status IN ('NUEVO','ASIGNADO','EN_PROCESO','EN_ESPERA','RESUELTO','CERRADO','REABIERTO')) DEFAULT 'NUEVO',
  created_by UUID NOT NULL REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ticket_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  comment TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  action VARCHAR(80) NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attachments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  mime_type VARCHAR(120),
  uploaded_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority ON tickets(priority);

INSERT INTO users (name, email, password_hash, role)
VALUES
('Administrador HelpDesk', 'admin@helpdesk.com', '$2a$10$UaC0K.JXmK6dEyWPTIwVqewmriSnGICZMvlKeU66r9ajOOQfIM0Yy', 'ADMIN'),
('Técnico Soporte', 'tecnico@helpdesk.com', '$2a$10$d5Fuq/kfP17oBy4hOD5YNOO0YyCDobkdn7Qm3vL4h1ntnBrpejJqG', 'TECHNICIAN'),
('Usuario Demo', 'usuario@helpdesk.com', '$2a$10$bUbG3K6q2s08QkLvDjw.D.WA81XVoKyTD.Q8AD9rSyjF/u.BjIY6e', 'USER')
ON CONFLICT (email) DO NOTHING;

INSERT INTO tickets (title, description, category, priority, status, created_by, assigned_to)
SELECT 'No puedo iniciar sesión', 'El sistema muestra credenciales inválidas aunque la contraseña es correcta.', 'Acceso', 'ALTA', 'EN_PROCESO', u.id, t.id
FROM users u, users t
WHERE u.email='usuario@helpdesk.com' AND t.email='tecnico@helpdesk.com'
ON CONFLICT DO NOTHING;
