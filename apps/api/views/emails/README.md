# Email Templates

This directory contains email templates for the PricePulse notification system.

## Templates

### price-drop.txt

Plain text version of the price drop alert email. This template is used as a fallback for email clients that don't support HTML or when users prefer plain text emails.

**Template Variables:**

- `{{productTitle}}` - The name of the product
- `{{currency}}` - Currency symbol or code (e.g., "$", "USD")
- `{{oldPrice}}` - Previous price (formatted as decimal)
- `{{newPrice}}` - Current price after drop (formatted as decimal)
- `{{savings}}` - Absolute savings amount (formatted as decimal)
- `{{savingsPercent}}` - Savings as a percentage (formatted to 1 decimal place)
- `{{threshold}}` - User's alert threshold value
- `{{marketplaceName}}` - Name of the marketplace (e.g., "Amazon", "eBay")
- `{{productUrl}}` - Full URL to the product detail page

**Requirements Satisfied:**

- Requirement 18.2: Includes product title, old price, new price, absolute savings, and savings percent
- Requirement 18.4: Includes clickable URL pointing to product page
- Requirement 18.5: Uses APP_URL for building product URL
- Requirement 18.6: Includes marketplace name
- Requirement 18.7: Plain text body conveys same fields as HTML body
- Requirement 18.8: All content matches HTML template information

## Integration

These templates will be integrated with the notification dispatch worker and mailer service. The worker will:

1. Fetch the notification data including product, alert, and price information
2. Render the template with the actual values
3. Send via MailerService with both HTML and text versions

## Future Enhancements

When implementing the template rendering logic:

1. Install a templating engine (Handlebars, Mustache, or similar)
2. Update MailerService to support template rendering
3. Update NotificationDispatchProcessor to use templates instead of inline HTML
4. Add template variable escaping for security
5. Add tests for template rendering
