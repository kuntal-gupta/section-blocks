/** Plain text from sanitized HTML, for short summaries such as course cards. Output is escaped by React. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

/** "$80.00". Takes the Decimal string from the API; display only, never used for sums. */
export function formatMoney(value: string | number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number(value));
}

/** The price to charge and the struck-through price, or null when there is no discount. */
export function coursePrice(price: string, discountPrice: string) {
  const full = Number(price);
  const discount = Number(discountPrice);
  if (discount > 0 && discount < full) {
    return { current: formatMoney(discount), original: formatMoney(full), percentOff: Math.round(((full - discount) / full) * 100) };
  }
  return { current: formatMoney(full), original: null, percentOff: 0 };
}
