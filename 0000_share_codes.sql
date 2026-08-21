CREATE TABLE IF NOT EXISTS `share_codes` (
  `code` text PRIMARY KEY NOT NULL,
  `payload` text NOT NULL,
  `created_at` text NOT NULL
);
