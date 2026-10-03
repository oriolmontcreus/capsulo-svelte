-- The admin UI language each editor picked ("en", "es", "fr"). NULL: the project default
-- (`admin.locale` in capsulo.config.ts), else the browser's language.
ALTER TABLE users ADD COLUMN ui_locale TEXT;
