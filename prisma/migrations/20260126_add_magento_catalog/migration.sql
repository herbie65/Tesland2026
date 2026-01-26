-- CreateTable for Magento Product Catalog
-- Migration: add_magento_catalog

-- Categories Table
CREATE TABLE "categories_catalog" (
    "id" TEXT NOT NULL,
    "magento_id" INTEGER,
    "parent_id" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 0,
    "path" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_catalog_pkey" PRIMARY KEY ("id")
);

-- Products Catalog Table
CREATE TABLE "products_catalog" (
    "id" TEXT NOT NULL,
    "magento_id" INTEGER,
    "sku" TEXT NOT NULL,
    "type_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "short_description" TEXT,
    "price" DECIMAL(10,2),
    "cost_price" DECIMAL(10,2),
    "special_price" DECIMAL(10,2),
    "special_price_from" TIMESTAMP(3),
    "special_price_to" TIMESTAMP(3),
    "weight" DECIMAL(10,2),
    "status" TEXT NOT NULL DEFAULT 'enabled',
    "visibility" TEXT NOT NULL DEFAULT 'catalog_search',
    "meta_title" TEXT,
    "meta_description" TEXT,
    "meta_keywords" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_catalog_pkey" PRIMARY KEY ("id")
);

-- Product Categories Junction Table
CREATE TABLE "product_categories_catalog" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_categories_catalog_pkey" PRIMARY KEY ("id")
);

-- Product Relations (for configurable products)
CREATE TABLE "product_relations" (
    "id" TEXT NOT NULL,
    "parent_id" TEXT NOT NULL,
    "child_id" TEXT NOT NULL,

    CONSTRAINT "product_relations_pkey" PRIMARY KEY ("id")
);

-- Product Attributes
CREATE TABLE "product_attributes" (
    "id" TEXT NOT NULL,
    "magento_attribute_id" INTEGER,
    "attribute_code" TEXT NOT NULL,
    "attribute_label" TEXT NOT NULL,
    "input_type" TEXT NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_attributes_pkey" PRIMARY KEY ("id")
);

-- Product Attribute Options
CREATE TABLE "product_attribute_options" (
    "id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "magento_option_id" INTEGER,
    "option_label" TEXT NOT NULL,
    "option_value" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_attribute_options_pkey" PRIMARY KEY ("id")
);

-- Product Attribute Values
CREATE TABLE "product_attribute_values" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "attribute_id" TEXT NOT NULL,
    "option_id" TEXT,
    "value" TEXT,

    CONSTRAINT "product_attribute_values_pkey" PRIMARY KEY ("id")
);

-- Product Custom Options
CREATE TABLE "product_custom_options" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "magento_option_id" INTEGER,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "is_require" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "price" DECIMAL(10,2),
    "price_type" TEXT NOT NULL DEFAULT 'fixed',
    "sku" TEXT,

    CONSTRAINT "product_custom_options_pkey" PRIMARY KEY ("id")
);

-- Product Custom Option Values
CREATE TABLE "product_custom_option_values" (
    "id" TEXT NOT NULL,
    "option_id" TEXT NOT NULL,
    "magento_value_id" INTEGER,
    "title" TEXT NOT NULL,
    "price" DECIMAL(10,2),
    "price_type" TEXT NOT NULL DEFAULT 'fixed',
    "sku" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_custom_option_values_pkey" PRIMARY KEY ("id")
);

-- Product Images
CREATE TABLE "product_images" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "magento_image_id" INTEGER,
    "file_path" TEXT NOT NULL,
    "url" TEXT,
    "local_path" TEXT,
    "label" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "is_main" BOOLEAN NOT NULL DEFAULT false,
    "is_thumbnail" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_images_pkey" PRIMARY KEY ("id")
);

-- Product Inventory
CREATE TABLE "product_inventory" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "is_in_stock" BOOLEAN NOT NULL DEFAULT true,
    "min_qty" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "notify_stock_qty" DECIMAL(10,2),
    "manage_stock" BOOLEAN NOT NULL DEFAULT true,
    "backorders" TEXT NOT NULL DEFAULT 'no',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "product_inventory_pkey" PRIMARY KEY ("id")
);

-- Magento Sync Logs
CREATE TABLE "magento_sync_logs" (
    "id" TEXT NOT NULL,
    "sync_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "total_items" INTEGER NOT NULL DEFAULT 0,
    "processed_items" INTEGER NOT NULL DEFAULT 0,
    "failed_items" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "details" JSONB,

    CONSTRAINT "magento_sync_logs_pkey" PRIMARY KEY ("id")
);

-- Unique Constraints
CREATE UNIQUE INDEX "categories_catalog_magento_id_key" ON "categories_catalog"("magento_id");
CREATE UNIQUE INDEX "categories_catalog_slug_key" ON "categories_catalog"("slug");
CREATE UNIQUE INDEX "products_catalog_magento_id_key" ON "products_catalog"("magento_id");
CREATE UNIQUE INDEX "products_catalog_sku_key" ON "products_catalog"("sku");
CREATE UNIQUE INDEX "products_catalog_slug_key" ON "products_catalog"("slug");
CREATE UNIQUE INDEX "product_categories_catalog_product_id_category_id_key" ON "product_categories_catalog"("product_id", "category_id");
CREATE UNIQUE INDEX "product_relations_parent_id_child_id_key" ON "product_relations"("parent_id", "child_id");
CREATE UNIQUE INDEX "product_attributes_attribute_code_key" ON "product_attributes"("attribute_code");
CREATE UNIQUE INDEX "product_attribute_options_attribute_id_magento_option_id_key" ON "product_attribute_options"("attribute_id", "magento_option_id");
CREATE UNIQUE INDEX "product_attribute_values_product_id_attribute_id_key" ON "product_attribute_values"("product_id", "attribute_id");
CREATE UNIQUE INDEX "product_custom_options_product_id_magento_option_id_key" ON "product_custom_options"("product_id", "magento_option_id");
CREATE UNIQUE INDEX "product_custom_option_values_option_id_magento_value_id_key" ON "product_custom_option_values"("option_id", "magento_value_id");
CREATE UNIQUE INDEX "product_images_product_id_magento_image_id_key" ON "product_images"("product_id", "magento_image_id");
CREATE UNIQUE INDEX "product_inventory_product_id_key" ON "product_inventory"("product_id");
CREATE UNIQUE INDEX "product_inventory_sku_key" ON "product_inventory"("sku");

-- Indexes
CREATE INDEX "categories_catalog_magento_id_idx" ON "categories_catalog"("magento_id");
CREATE INDEX "categories_catalog_parent_id_idx" ON "categories_catalog"("parent_id");
CREATE INDEX "categories_catalog_slug_idx" ON "categories_catalog"("slug");
CREATE INDEX "products_catalog_magento_id_idx" ON "products_catalog"("magento_id");
CREATE INDEX "products_catalog_sku_idx" ON "products_catalog"("sku");
CREATE INDEX "products_catalog_slug_idx" ON "products_catalog"("slug");
CREATE INDEX "products_catalog_type_id_idx" ON "products_catalog"("type_id");
CREATE INDEX "products_catalog_status_idx" ON "products_catalog"("status");
CREATE INDEX "product_categories_catalog_product_id_idx" ON "product_categories_catalog"("product_id");
CREATE INDEX "product_categories_catalog_category_id_idx" ON "product_categories_catalog"("category_id");
CREATE INDEX "product_relations_parent_id_idx" ON "product_relations"("parent_id");
CREATE INDEX "product_relations_child_id_idx" ON "product_relations"("child_id");
CREATE INDEX "product_attributes_magento_attribute_id_idx" ON "product_attributes"("magento_attribute_id");
CREATE INDEX "product_attribute_options_attribute_id_idx" ON "product_attribute_options"("attribute_id");
CREATE INDEX "product_attribute_values_product_id_idx" ON "product_attribute_values"("product_id");
CREATE INDEX "product_attribute_values_attribute_id_idx" ON "product_attribute_values"("attribute_id");
CREATE INDEX "product_custom_options_product_id_idx" ON "product_custom_options"("product_id");
CREATE INDEX "product_custom_option_values_option_id_idx" ON "product_custom_option_values"("option_id");
CREATE INDEX "product_images_product_id_idx" ON "product_images"("product_id");
CREATE INDEX "product_images_is_main_idx" ON "product_images"("is_main");
CREATE INDEX "product_inventory_sku_idx" ON "product_inventory"("sku");
CREATE INDEX "product_inventory_is_in_stock_idx" ON "product_inventory"("is_in_stock");
CREATE INDEX "magento_sync_logs_status_idx" ON "magento_sync_logs"("status");
CREATE INDEX "magento_sync_logs_sync_type_idx" ON "magento_sync_logs"("sync_type");
CREATE INDEX "magento_sync_logs_started_at_idx" ON "magento_sync_logs"("started_at");

-- Foreign Keys
ALTER TABLE "categories_catalog" ADD CONSTRAINT "categories_catalog_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "categories_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories_catalog" ADD CONSTRAINT "product_categories_catalog_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_categories_catalog" ADD CONSTRAINT "product_categories_catalog_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_relations" ADD CONSTRAINT "product_relations_child_id_fkey" FOREIGN KEY ("child_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_options" ADD CONSTRAINT "product_attribute_options_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_attribute_id_fkey" FOREIGN KEY ("attribute_id") REFERENCES "product_attributes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_attribute_values" ADD CONSTRAINT "product_attribute_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "product_attribute_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "product_custom_options" ADD CONSTRAINT "product_custom_options_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_custom_option_values" ADD CONSTRAINT "product_custom_option_values_option_id_fkey" FOREIGN KEY ("option_id") REFERENCES "product_custom_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_images" ADD CONSTRAINT "product_images_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "product_inventory" ADD CONSTRAINT "product_inventory_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products_catalog"("id") ON DELETE CASCADE ON UPDATE CASCADE;
