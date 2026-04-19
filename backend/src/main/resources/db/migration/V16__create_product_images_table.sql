CREATE TABLE product_images (
    product_id BIGINT NOT NULL,
    image_order INTEGER NOT NULL,
    image_data_url TEXT NOT NULL,
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT pk_product_images PRIMARY KEY (product_id, image_order)
);

INSERT INTO product_images (product_id, image_order, image_data_url)
SELECT id, 0, image_data_url
FROM products
WHERE image_data_url IS NOT NULL AND image_data_url <> '';
