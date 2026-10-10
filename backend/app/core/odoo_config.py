# Odoo Import Header Configuration
# Users can modify these keys/headers to align with their specific Odoo version (v16, v17, v18)

ODOO_HEADERS = {
    "products": [
        "id",
        "name",
        "type",
        "categ_id/name",
        "list_price",
        "standard_price",
        "uom_id/name"
    ],
    "lots": [
        "name",
        "product_id/name",
        "ref",
        "company_id/name"
    ],
    "stock": [
        "product_id/name",
        "location_id/name",
        "inventory_quantity",
        "lot_id/name"
    ],
    "invoices": [
        "name",
        "partner_id/name",
        "invoice_date",
        "invoice_line_ids/name",
        "invoice_line_ids/quantity",
        "invoice_line_ids/price_unit"
    ]
}
