-- ==============================================================================
-- EBA Fashion Studio: Add JazzCash Payment Method
-- ==============================================================================

INSERT INTO public.payment_methods (id, code, name, instructions, account_details, is_active, display_order)
VALUES (
    'a0000000-0000-0000-0000-000000000003',
    'JAZZCASH',
    'JazzCash',
    'Send payment directly to our official JazzCash Mobile Account. Please share payment screenshot or TID on WhatsApp for priority dispatch.',
    '{"account_title": "EBA Fashion Studio", "account_number": "0300 1234567", "mobile_number": "0300 1234567", "note": "Dial *786# or transfer via JazzCash Mobile App to Mobile Account."}'::jsonb,
    true,
    3
)
ON CONFLICT (id) DO UPDATE SET
    code = EXCLUDED.code,
    name = EXCLUDED.name,
    instructions = EXCLUDED.instructions,
    account_details = EXCLUDED.account_details,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order;
