import { auth } from './firebase';
import { OrderRecord } from '../types';
import { formatINR } from './currency';

export function buildOrderWhatsAppMessage(order: OrderRecord): string {
  const orderDate = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  const addr = order.shippingAddress;
  const addressLine = [
    addr.buildingName,
    addr.street,
    addr.area,
    addr.district || addr.city,
    addr.state,
    addr.pinCode || addr.postalCode,
    addr.country,
  ]
    .filter(Boolean)
    .join(', ');

  const mapsLink =
    typeof addr.lat === 'number' && typeof addr.lng === 'number'
      ? `https://maps.google.com/?q=${addr.lat},${addr.lng}`
      : 'Pin not dropped (address text provided)';

  const itemsLines: string[] = [];
  for (const item of order.items) {
    if (item.itemType === 'custom_aquarium' && item.customAquarium) {
      const c = item.customAquarium;
      itemsLines.push(
        `• [CUSTOM AQUARIUM] ${c.buildName} (${c.lengthCm}×${c.widthCm}×${c.heightCm} cm · ${c.liters}L · ${c.glassThicknessMm}mm ${c.glassFinish} · ${c.shape}) — ${formatINR(
          item.price * item.quantity
        )}`
      );
      itemsLines.push(
        `   Stand: ${c.stand} | Light: ${c.lighting} | Filter: ${c.filtration} | Substrate: ${c.substrate}`
      );
      itemsLines.push(
        `   Hardscape: ${c.hardscape} | Plants: ${c.plants} | Livestock: ${c.livestock}`
      );
      if (c.addons.length > 0) {
        itemsLines.push(
          `   Add-ons: ${c.addons
            .map((a) => `${a.name} × ${a.quantity}`)
            .join(', ')}`
        );
      }
    } else {
      itemsLines.push(
        `• ${item.name} (${item.variantLabel}) × ${item.quantity} — ${formatINR(
          item.price * item.quantity
        )}`
      );
    }
  }

  return [
    'FINZO EXOTIC WORLD – NEW ORDER',
    '',
    `Order ID: ${order.orderNumber || order.id}`,
    `Order Date: ${orderDate}`,
    '',
    `Customer Name: ${order.customerName}`,
    `Phone Number: ${order.customerPhone || addr.mobile || addr.phone}`,
    `Email: ${order.customerEmail}`,
    '',
    `Delivery Address: ${addressLine}`,
    `Google Maps Pin: ${mapsLink}`,
    addr.deliveryInstructions ? `Instructions: ${addr.deliveryInstructions}` : '',
    '',
    'Ordered Items:',
    ...itemsLines,
    '',
    order.customAquarium
      ? `Custom Aquarium Breakdown: Base ${formatINR(
          order.customAquarium.breakdown.baseTankPrice
        )} | Customization ${formatINR(
          order.customAquarium.breakdown.customizationCharges
        )} | Accessories ${formatINR(
          order.customAquarium.breakdown.selectedAccessoriesCost
        )} | Add-ons ${formatINR(order.customAquarium.breakdown.addonsTotal)}`
      : '',
    `Subtotal: ${formatINR(order.subtotal ?? order.totalAmount)}`,
    order.discountAmount > 0 ? `Promo Discount: -${formatINR(order.discountAmount)}` : '',
    `Delivery Charges (${order.deliveryMode || 'standard'}): ${formatINR(
      order.deliveryCharge ?? 0
    )}`,
    `Total Amount: ${formatINR(order.totalAmount)}`,
    '',
    `Payment Method: ${order.paymentMethod || 'Pay via WhatsApp Confirmation'}`,
    `Payment Status: ${order.paymentStatus || 'pending_confirmation'}`,
    `Order Status: ${order.status}`,
  ]
    .filter((line) => line !== undefined)
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');
}

export function buildWhatsAppDirectUrl(whatsappNumber: string, text: string): string {
  const digits = whatsappNumber.replace(/[^0-9]/g, '') || '919876543210';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

export async function dispatchWhatsAppOrderNotification(
  order: OrderRecord,
  storeWhatsappNumber: string
): Promise<{
  sent: boolean;
  configured: boolean;
  waLink: string;
  messageText: string;
  error?: string;
}> {
  const messageText = buildOrderWhatsAppMessage(order);
  const waLink = buildWhatsAppDirectUrl(storeWhatsappNumber, messageText);

  try {
    const idToken = auth.currentUser ? await auth.currentUser.getIdToken() : '';
    if (!idToken) {
      return {
        sent: false,
        configured: false,
        waLink,
        messageText,
      };
    }

    const res = await fetch('/api/whatsapp/notify-order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        message: messageText,
        recipientNumber: storeWhatsappNumber,
      }),
    });
    const data = (await res.json()) as {
      sent?: boolean;
      configured?: boolean;
      error?: string;
    };
    return {
      sent: Boolean(data.sent),
      configured: Boolean(data.configured),
      waLink,
      messageText,
      error: data.error,
    };
  } catch (err) {
    return {
      sent: false,
      configured: false,
      waLink,
      messageText,
      error: err instanceof Error ? err.message : 'Unable to reach notification service.',
    };
  }
}
