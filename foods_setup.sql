-- ============================================================
--  GESUNDHEITSTRACKER – Lebensmittel-Datenbank (Community)
--  In Supabase Studio → SQL Editor ausführen
-- ============================================================

-- 1. TABELLE ANLEGEN
-- ============================================================
CREATE TABLE IF NOT EXISTS foods (
  id                      UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name                    TEXT NOT NULL,
  brand                   TEXT,
  nutriscore              TEXT CHECK (nutriscore IN ('a','b','c','d','e')),
  energie                 INTEGER,          -- kcal pro 100g
  protein                 NUMERIC(6,1),     -- g pro 100g
  kohlenhydrate           NUMERIC(6,1),
  fett                    NUMERIC(6,1),
  gesaettigte_fettsaeuren NUMERIC(6,1),
  zucker                  NUMERIC(6,1),
  ballaststoffe           NUMERIC(6,1),
  salz                    NUMERIC(6,2),
  allergene               TEXT[] DEFAULT '{}',
  created_by              UUID REFERENCES auth.users(id),  -- NULL = vorinstalliert
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Volltextsuche-Index für schnelle ILIKE-Suche
CREATE INDEX IF NOT EXISTS foods_name_trgm_idx
  ON foods USING gin(name gin_trgm_ops);

-- Fallback-Index ohne trigram (falls pg_trgm nicht aktiv)
CREATE INDEX IF NOT EXISTS foods_name_idx ON foods (name);

-- 2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE foods ENABLE ROW LEVEL SECURITY;

-- Alle eingeloggten User dürfen LESEN
CREATE POLICY "Alle dürfen Lebensmittel lesen"
  ON foods FOR SELECT
  TO authenticated
  USING (true);

-- Eingeloggte User dürfen eigene Lebensmittel HINZUFÜGEN
CREATE POLICY "User dürfen Lebensmittel hinzufügen"
  ON foods FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- KEIN DELETE, KEIN UPDATE – Einträge bleiben dauerhaft bestehen

-- 3. SEED-DATEN (~60 häufige deutsche Lebensmittel)
--    created_by = NULL → vorinstalliert / System-Daten
-- ============================================================
INSERT INTO foods (name, brand, nutriscore, energie, protein, kohlenhydrate, fett, gesaettigte_fettsaeuren, zucker, ballaststoffe, salz, allergene) VALUES

-- GETREIDE & BROT
('Haferflocken (zart)',        NULL, 'b', 372,  13.5, 58.7,  7.1, 1.3,  1.1, 10.0, 0.01, ARRAY['Gluten']),
('Vollkornbrot',               NULL, 'b', 222,   7.8, 38.7,  2.0, 0.4,  2.9,  7.5, 0.98, ARRAY['Gluten']),
('Toastbrot (Weißbrot)',       NULL, 'd', 265,   8.5, 49.8,  3.2, 0.8,  3.9,  2.6, 1.04, ARRAY['Gluten','Milch']),
('Pasta (Weizen, gekocht)',    NULL, 'b', 156,   5.8, 30.9,  0.9, 0.2,  0.6,  1.8, 0.01, ARRAY['Gluten']),
('Basmati-Reis (gekocht)',     NULL, 'b', 130,   2.7, 28.0,  0.3, 0.1,  0.0,  0.4, 0.01, ARRAY[]::text[]),
('Kartoffeln (gekocht)',       NULL, 'a',  76,   2.0, 16.3,  0.1, 0.0,  0.9,  1.8, 0.01, ARRAY[]::text[]),
('Quinoa (gekocht)',           NULL, 'b', 120,   4.4, 21.3,  1.9, 0.2,  0.9,  2.8, 0.01, ARRAY[]::text[]),
('Müsli (Bircher, ohne Zusätze)', NULL, 'b', 363, 10.0, 60.0, 7.5, 1.3, 10.0,  9.0, 0.06, ARRAY['Gluten','Nüsse']),
('Cornflakes',                 NULL, 'd', 375,   7.5, 83.0,  0.9, 0.2,  8.0,  3.2, 1.00, ARRAY['Gluten']),
('Süßkartoffel (roh)',         NULL, 'a',  86,   1.6, 20.1,  0.1, 0.0,  4.2,  3.0, 0.06, ARRAY[]::text[]),

-- MILCHPRODUKTE
('Vollmilch (3,5% Fett)',      NULL, 'c',  65,   3.4,  4.8,  3.7, 2.4,  4.8,  0.0, 0.10, ARRAY['Milch']),
('Magerquark (0,2% Fett)',     NULL, 'b',  67,  12.5,  3.5,  0.3, 0.2,  3.5,  0.0, 0.10, ARRAY['Milch']),
('Naturjoghurt (3,5% Fett)',   NULL, 'b',  66,   3.8,  4.9,  3.5, 2.3,  4.9,  0.0, 0.10, ARRAY['Milch']),
('Skyr (natur)',                NULL, 'a',  63,  11.0,  4.0,  0.2, 0.1,  4.0,  0.0, 0.10, ARRAY['Milch']),
('Hüttenkäse',                 NULL, 'b',  98,  11.1,  3.4,  4.3, 2.8,  3.4,  0.0, 0.40, ARRAY['Milch']),
('Gouda (45% i.Tr.)',          NULL, 'c', 356,  25.9,  0.1, 27.5,17.4,  0.1,  0.0, 1.70, ARRAY['Milch']),
('Mozzarella',                 NULL, 'c', 280,  18.0,  3.0, 21.6,13.0,  1.0,  0.0, 0.60, ARRAY['Milch']),
('Parmesan',                   NULL, 'c', 431,  38.5,  0.0, 29.7,18.5,  0.0,  0.0, 1.60, ARRAY['Milch']),
('Butter (ungesalzen)',        NULL, 'd', 741,   0.7,  0.6, 82.0,52.0,  0.6,  0.0, 0.04, ARRAY['Milch']),

-- FLEISCH & WURST
('Hühnerbrust (gegart)',       NULL, 'a', 165,  31.0,  0.0,  3.6, 1.0,  0.0,  0.0, 0.07, ARRAY[]::text[]),
('Rindfleisch, Hackfleisch (20% Fett)', NULL, 'c', 254, 17.2, 0.0, 20.5, 8.5, 0.0, 0.0, 0.08, ARRAY[]::text[]),
('Schweinefilet (roh)',        NULL, 'b', 109,  22.0,  0.0,  2.7, 1.0,  0.0,  0.0, 0.07, ARRAY[]::text[]),
('Putenbrustaufschnitt',       NULL, 'b', 107,  22.1,  0.3,  1.6, 0.5,  0.3,  0.0, 1.40, ARRAY[]::text[]),
('Kochschinken',               NULL, 'c', 107,  18.5,  1.0,  3.5, 1.3,  0.8,  0.0, 1.80, ARRAY[]::text[]),

-- FISCH & MEERESFRÜCHTE
('Lachs (frisch, roh)',        NULL, 'b', 202,  20.0,  0.0, 13.6, 3.0,  0.0,  0.0, 0.06, ARRAY['Fisch']),
('Thunfisch (in Wasser, Dose)',NULL, 'a',  96,  21.5,  0.0,  1.2, 0.3,  0.0,  0.0, 0.40, ARRAY['Fisch']),
('Lachs (geräuchert)',         NULL, 'b', 185,  18.3,  0.0, 12.0, 2.3,  0.0,  0.0, 2.80, ARRAY['Fisch']),
('Garnelen (gegart)',          NULL, 'a',  99,  21.4,  0.0,  1.1, 0.2,  0.0,  0.0, 0.27, ARRAY['Krebstiere']),

-- EIER
('Hühnerei (Vollei, roh)',     NULL, 'b', 143,  12.5,  0.7,  9.9, 3.0,  0.7,  0.0, 0.37, ARRAY['Eier']),

-- OBST
('Banane',                     NULL, 'c',  88,   1.1, 20.4,  0.2, 0.1, 17.2,  2.5, 0.01, ARRAY[]::text[]),
('Apfel',                      NULL, 'a',  52,   0.3, 12.4,  0.2, 0.0, 10.4,  2.0, 0.00, ARRAY[]::text[]),
('Erdbeeren',                  NULL, 'a',  32,   0.7,  5.5,  0.4, 0.1,  5.3,  2.0, 0.00, ARRAY[]::text[]),
('Orange',                     NULL, 'a',  47,   0.9,  9.4,  0.2, 0.0,  9.2,  2.2, 0.00, ARRAY[]::text[]),
('Blaubeeren',                 NULL, 'a',  57,   0.7, 12.1,  0.3, 0.1,  9.7,  2.4, 0.00, ARRAY[]::text[]),
('Avocado',                    NULL, 'c', 160,   2.0,  1.8, 14.7, 2.1,  0.7,  6.7, 0.01, ARRAY[]::text[]),
('Weintrauben',                NULL, 'b',  69,   0.6, 18.1,  0.2, 0.1, 17.2,  0.9, 0.00, ARRAY[]::text[]),
('Mango',                      NULL, 'b',  60,   0.8, 13.4,  0.4, 0.1, 12.0,  1.6, 0.01, ARRAY[]::text[]),

-- GEMÜSE
('Karotte (roh)',               NULL, 'a',  41,   0.9,  7.9,  0.2, 0.1,  6.9,  3.0, 0.07, ARRAY[]::text[]),
('Brokkoli (roh)',              NULL, 'a',  34,   2.8,  4.4,  0.4, 0.1,  1.7,  2.6, 0.03, ARRAY[]::text[]),
('Tomate (roh)',                NULL, 'a',  18,   0.9,  2.6,  0.2, 0.1,  2.6,  1.2, 0.01, ARRAY[]::text[]),
('Gurke (roh)',                 NULL, 'a',  12,   0.7,  1.5,  0.1, 0.0,  1.5,  0.5, 0.00, ARRAY[]::text[]),
('Paprika (rot, roh)',          NULL, 'a',  31,   1.0,  4.6,  0.3, 0.1,  4.2,  2.1, 0.01, ARRAY[]::text[]),
('Spinat (roh)',                NULL, 'a',  23,   2.9,  1.4,  0.4, 0.1,  0.4,  2.2, 0.21, ARRAY[]::text[]),
('Zucchini (roh)',              NULL, 'a',  17,   1.2,  2.3,  0.2, 0.1,  1.9,  1.0, 0.01, ARRAY[]::text[]),
('Champignons (roh)',           NULL, 'a',  22,   3.1,  0.3,  0.3, 0.1,  0.3,  1.0, 0.01, ARRAY[]::text[]),
('Zwiebeln (roh)',              NULL, 'a',  40,   1.1,  8.6,  0.1, 0.0,  4.7,  1.7, 0.01, ARRAY[]::text[]),
('Kürbis (roh)',                NULL, 'a',  26,   1.0,  4.4,  0.1, 0.1,  3.3,  0.5, 0.00, ARRAY[]::text[]),
('Feldsalat',                  NULL, 'a',  19,   2.0,  0.7,  0.4, 0.1,  0.5,  1.8, 0.17, ARRAY[]::text[]),

-- HÜLSENFRÜCHTE
('Linsen (gegart)',             NULL, 'a', 116,   9.0, 20.1,  0.4, 0.1,  1.8,  7.9, 0.01, ARRAY[]::text[]),
('Kichererbsen (gegart)',       NULL, 'b', 164,   8.9, 27.4,  2.6, 0.3,  4.8,  7.6, 0.24, ARRAY[]::text[]),
('Kidneybohnen (Dose)',         NULL, 'a', 100,   7.0, 14.6,  0.5, 0.1,  0.6,  6.0, 0.24, ARRAY[]::text[]),

-- NÜSSE & SAMEN
('Mandeln (roh)',               NULL, 'b', 579,  21.2,  9.7, 49.9, 3.8,  3.9, 12.5, 0.01, ARRAY['Nüsse']),
('Walnüsse',                   NULL, 'b', 654,  15.2,  6.7, 65.2, 6.1,  2.6,  6.7, 0.01, ARRAY['Nüsse']),
('Erdnüsse (ungesalzen)',       NULL, 'c', 567,  25.8, 13.4, 46.1, 6.3,  3.7,  8.1, 0.01, ARRAY['Erdnüsse']),
('Chia-Samen',                  NULL, 'b', 486,  16.5, 42.1, 30.7, 3.3,  0.0, 34.4, 0.02, ARRAY[]::text[]),
('Leinsamen (gemahlen)',        NULL, 'a', 534,  18.3, 28.9, 42.2, 3.7,  1.5, 27.3, 0.03, ARRAY[]::text[]),

-- ÖLE
('Olivenöl (nativ extra)',     NULL, 'c', 884,   0.0,  0.0,100.0,14.0,  0.0,  0.0, 0.00, ARRAY[]::text[]),
('Rapsöl',                     NULL, 'c', 900,   0.0,  0.0,100.0, 7.0,  0.0,  0.0, 0.00, ARRAY[]::text[]),

-- PFLANZLICHE DRINKS
('Hafermilch (ungesüßt)',       NULL, 'b',  47,   1.0,  9.0,  1.5, 0.2,  4.0,  0.6, 0.10, ARRAY['Gluten']),
('Sojamilch (ungesüßt)',        NULL, 'b',  39,   3.3,  2.5,  1.8, 0.3,  2.5,  0.4, 0.12, ARRAY['Sojaprodukte']),
('Mandelmilch (ungesüßt)',      NULL, 'b',  24,   0.9,  1.4,  1.7, 0.1,  1.4,  0.5, 0.10, ARRAY['Nüsse']),

-- PROTEINQUELLEN / SPORT
('Whey Protein (neutral)',      NULL, 'b', 380,  80.0,  5.0,  6.0, 3.5,  3.0,  0.0, 0.50, ARRAY['Milch']),
('Magerquark (als Proteinquelle)', NULL, 'b', 67, 12.5,  3.5,  0.3, 0.2,  3.5,  0.0, 0.10, ARRAY['Milch']),

-- SÜSSES & SONSTIGES
('Dunkle Schokolade (85%)',     NULL, 'd', 598,  10.2, 19.0, 49.0,29.0,  6.3, 14.4, 0.01, ARRAY['Milch','Nüsse']),
('Honig',                       NULL, 'd', 304,   0.4, 82.4,  0.0, 0.0, 82.1,  0.2, 0.00, ARRAY[]::text[])

ON CONFLICT DO NOTHING;
