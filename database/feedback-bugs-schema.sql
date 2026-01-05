-- Feedback table
CREATE TABLE
IF NOT EXISTS user_feedback
(
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users
(id) ON
DELETE CASCADE,
  rating INTEGER
NOT NULL CHECK
(rating >= 1 AND rating <= 5),
  comments TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bug reports table
CREATE TABLE
IF NOT EXISTS bug_reports
(
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users
(id) ON
DELETE CASCADE,
  title VARCHAR(255)
NOT NULL,
  category VARCHAR
(100) NOT NULL,
  severity VARCHAR
(50) NOT NULL CHECK
(severity IN
('low', 'medium', 'high', 'critical')),
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  status VARCHAR
(50) DEFAULT 'pending' CHECK
(status IN
('pending', 'resolved')),
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX
IF NOT EXISTS idx_feedback_user_id ON user_feedback
(user_id);
CREATE INDEX
IF NOT EXISTS idx_feedback_rating ON user_feedback
(rating);
CREATE INDEX
IF NOT EXISTS idx_feedback_created_at ON user_feedback
(created_at);

CREATE INDEX
IF NOT EXISTS idx_bug_reports_user_id ON bug_reports
(user_id);
CREATE INDEX
IF NOT EXISTS idx_bug_reports_status ON bug_reports
(status);
CREATE INDEX
IF NOT EXISTS idx_bug_reports_severity ON bug_reports
(severity);
CREATE INDEX
IF NOT EXISTS idx_bug_reports_category ON bug_reports
(category);
CREATE INDEX
IF NOT EXISTS idx_bug_reports_created_at ON bug_reports
(created_at);
