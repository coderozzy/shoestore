-- V19: Replace gender-as-category seeds (MEN/WOMEN) with proper shoe-style
-- categories. Gender is already a first-class column on `products`, so
-- modelling it again as a category was redundant and meant the storefront
-- chips effectively duplicated the gender filter. Real silhouettes
-- (Sneakers, Boots, Oxfords, ...) give the storefront an actual taxonomy.

-- 1. Seed the canonical shoe styles. ON CONFLICT keeps the migration
--    idempotent and safe to re-run on a database that was hand-edited.
INSERT INTO categories (name) VALUES
    ('Sneakers'),
    ('Boots'),
    ('Oxfords'),
    ('Loafers'),
    ('Sandals'),
    ('Heels'),
    ('Flats'),
    ('Trainers')
ON CONFLICT (name) DO NOTHING;

-- 2. Reassign any product currently pointed at the legacy MEN/WOMEN
--    category to a sensible style default so we don't violate the FK
--    when the old rows are dropped below. Choice of default mirrors the
--    typical retail mix and can be changed by the admin later.
UPDATE products
   SET category_id = (SELECT id FROM categories WHERE name = 'Sneakers')
 WHERE category_id IN (SELECT id FROM categories WHERE name = 'MEN');

UPDATE products
   SET category_id = (SELECT id FROM categories WHERE name = 'Heels')
 WHERE category_id IN (SELECT id FROM categories WHERE name = 'WOMEN');

-- 3. Drop the legacy gender-shaped categories. Any product still
--    referencing them after the UPDATEs above would block this DELETE
--    (FK ON DELETE behaviour is the default RESTRICT), which is the
--    behaviour we want — better to fail loud than silently NULL out
--    a product's category.
DELETE FROM categories WHERE name IN ('MEN', 'WOMEN');
