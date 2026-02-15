-- Add sort_order column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name='products' AND column_name='sort_order'
    ) THEN
        ALTER TABLE products ADD COLUMN sort_order integer DEFAULT 0 NOT NULL;
        RAISE NOTICE 'Column sort_order added to products table';
    ELSE
        RAISE NOTICE 'Column sort_order already exists in products table';
    END IF;
END $$;
