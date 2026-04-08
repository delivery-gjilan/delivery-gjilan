import { Resend } from 'resend';
import logger from '@/lib/logger';

const log = logger.child({ module: 'EmailService' });

export type PasswordResetParams = {
    toEmail: string;
    toName: string;
    token: string;
};

export type OrderReceiptParams = {
    toEmail: string;
    toName: string;
    language: 'en' | 'al';
    unsubscribeUrl: string;
    order: {
        displayId: string;
        orderDate: string | null;
        businessName: string;
        items: Array<{ name: string; quantity: number; unitPrice: number }>;
        subtotal: number;
        originalDeliveryPrice: number;
        deliveryPrice: number;
        prioritySurcharge: number;
        discountTotal: number;
        promotions: Array<{ name: string; code: string | null; appliesTo: string; discountAmount: number }>;
        total: number;
        paymentCollection: string;
        dropoffAddress: string;
    };
};

// ---------------------------------------------------------------------------
// Email i18n dictionaries
// ---------------------------------------------------------------------------

type EmailStrings = {
    subject: string;
    receipt: string;
    orderDelivered: string;
    greeting: (name: string) => string;
    orderNo: string;
    date: string;
    item: string;
    qty: string;
    price: string;
    subtotal: string;
    deliveryFee: string;
    priorityDelivery: string;
    promoPrefix: string;
    deliverySuffix: string;
    total: string;
    payment: string;
    cashOnDelivery: string;
    prepaid: string;
    deliveredTo: string;
    thankYou: string;
    automated: string;
    unsubscribe: string;
};

const emailI18n: Record<'en' | 'al', EmailStrings> = {
    en: {
        subject: 'Your receipt — Order',
        receipt: 'Receipt',
        orderDelivered: 'Order delivered successfully',
        greeting: (name) => `Hi ${name}, here\u2019s your receipt.`,
        orderNo: 'Order No.',
        date: 'Date',
        item: 'Item',
        qty: 'Qty',
        price: 'Price',
        subtotal: 'Subtotal',
        deliveryFee: 'Delivery fee',
        priorityDelivery: 'Priority delivery',
        promoPrefix: 'Promo:',
        deliverySuffix: '(delivery)',
        total: 'Total',
        payment: 'Payment',
        cashOnDelivery: 'Cash on delivery',
        prepaid: 'Prepaid',
        deliveredTo: 'Delivered to',
        thankYou: 'Thank you for ordering with',
        automated: 'This is an automated receipt. Please do not reply to this email.',
        unsubscribe: 'Don\u2019t want receipt emails? Unsubscribe',
    },
    al: {
        subject: 'Fatura juaj — Porosia',
        receipt: 'Faturë',
        orderDelivered: 'Porosia u dërgua me sukses',
        greeting: (name) => `Përshëndetje ${name}, ja fatura juaj.`,
        orderNo: 'Nr. Porosisë',
        date: 'Data',
        item: 'Artikulli',
        qty: 'Sasia',
        price: 'Çmimi',
        subtotal: 'Nëntotali',
        deliveryFee: 'Tarifa e dërgesës',
        priorityDelivery: 'Dërgesa prioritare',
        promoPrefix: 'Promo:',
        deliverySuffix: '(dërgesa)',
        total: 'Totali',
        payment: 'Pagesa',
        cashOnDelivery: 'Pagesë në dorëzim',
        prepaid: 'E parapaguar',
        deliveredTo: 'Dërguar te',
        thankYou: 'Faleminderit që porosit me',
        automated: 'Kjo është një faturë automatike. Ju lutem mos u përgjigjni kësaj emaili.',
        unsubscribe: 'Nuk dëshironi faturat me email? Çregjistrohu',
    },
};

export class EmailService {
    private client: Resend | null;
    private from: string;

    constructor() {
        const apiKey = process.env.RESEND_API_KEY;
        if (!apiKey) {
            log.warn('RESEND_API_KEY not set — email sending is disabled');
            this.client = null;
        } else {
            this.client = new Resend(apiKey);
        }
        this.from = process.env.RESEND_FROM_ADDRESS ?? 'noreply@deliverygjilan.com';
    }

    async sendPasswordResetEmail(params: PasswordResetParams): Promise<void> {
        if (!this.client) {
            log.warn({ email: params.toEmail }, 'email:passwordReset:skipped (no API key)');
            return;
        }

        const resetUrl = `${process.env.APP_DEEP_LINK_BASE ?? 'zipp://'}reset-password?token=${params.token}`;

        const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#F5F3FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 16px" align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,.10)">
  <tr><td style="background:linear-gradient(135deg,#7C3AED,#6D28D9);padding:36px 40px 32px">
    <p style="margin:0;font-size:22px;font-weight:700;color:#fff">Zipp Go</p>
  </td></tr>
  <tr><td style="padding:36px 40px">
    <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827">Reset your password</p>
    <p style="margin:0 0 24px;font-size:15px;color:#6b7280">Hi ${esc(params.toName)}, we received a request to reset your password.</p>
    <a href="${resetUrl}" style="display:inline-block;background:#7C3AED;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px">Reset Password</a>
    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af">This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
    <p style="margin:12px 0 0;font-size:12px;color:#d1d5db;word-break:break-all">Or paste this link: ${resetUrl}</p>
  </td></tr>
  <tr><td style="padding:20px 40px;border-top:1px solid #f3f4f6">
    <p style="margin:0;font-size:12px;color:#9ca3af">This is an automated email from Zipp Go. Please do not reply.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

        try {
            await this.client.emails.send({
                from: this.from,
                to: params.toEmail,
                subject: 'Reset your Zipp Go password',
                html,
            });
            log.info({ to: params.toEmail }, 'email:passwordReset:sent');
        } catch (err) {
            log.error({ err, to: params.toEmail }, 'email:passwordReset:send_failed');
        }
    }

    async sendOrderReceipt(params: OrderReceiptParams): Promise<void> {
        if (!this.client) {
            log.warn({ orderId: params.order.displayId }, 'email:receipt:skipped (no API key)');
            return;
        }

        try {
            const strings = emailI18n[params.language] ?? emailI18n.en;
            const html = buildOrderReceiptHtml(params, strings);

            await this.client.emails.send({
                from: this.from,
                to: params.toEmail,
                subject: `${strings.subject} ${params.order.displayId} | Zipp Go`,
                html,
            });

            log.info({ orderId: params.order.displayId, to: params.toEmail }, 'email:receipt:sent');
        } catch (err) {
            log.error({ err, orderId: params.order.displayId }, 'email:receipt:send_failed');
        }
    }
}

// ---------------------------------------------------------------------------
// Plain-HTML receipt template
// ---------------------------------------------------------------------------

function esc(str: string): string {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatCurrency(amount: number): string {
    return `€${amount.toFixed(2)}`;
}

function buildOrderReceiptHtml(params: OrderReceiptParams, t: EmailStrings): string {
    const { toName, order, language } = params;
    const locale = language === 'al' ? 'sq' : 'en-GB';

    const orderDate = order.orderDate
        ? new Date(order.orderDate).toLocaleDateString(locale, {
              weekday: 'short',
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
          })
        : '';

    const paymentLabel =
        order.paymentCollection === 'CASH_TO_DRIVER' ? t.cashOnDelivery : t.prepaid;

    const paymentIcon =
        order.paymentCollection === 'CASH_TO_DRIVER'
            ? '&#128176;' // 💰
            : '&#9989;';  // ✅

    const itemRows = order.items
        .map(
            (item, i) => `
        <tr style="background:${i % 2 === 0 ? '#ffffff' : '#faf8ff'}">
            <td style="padding:14px 20px;font-size:14px;color:#1f2937;line-height:1.4">${esc(item.name)}</td>
            <td style="padding:14px 12px;font-size:14px;color:#6b7280;text-align:center;font-weight:500">&times;${item.quantity}</td>
            <td style="padding:14px 20px;font-size:14px;color:#1f2937;text-align:right;font-weight:600;font-variant-numeric:tabular-nums">${formatCurrency(item.unitPrice * item.quantity)}</td>
        </tr>`,
        )
        .join('');

    const summaryLines: string[] = [];
    summaryLines.push(summaryRow(t.subtotal, order.subtotal));
    // Show original delivery price (before any promo)
    summaryLines.push(summaryRow(t.deliveryFee, order.originalDeliveryPrice));
    if (order.prioritySurcharge > 0) {
        summaryLines.push(summaryRow(t.priorityDelivery, order.prioritySurcharge));
    }
    // Show each promotion as its own discount line
    if (order.promotions.length > 0) {
        for (const promo of order.promotions) {
            const label = promo.code ? `${t.promoPrefix} ${promo.code}` : promo.name;
            const target = promo.appliesTo === 'DELIVERY' ? ` ${t.deliverySuffix}` : '';
            summaryLines.push(summaryRow(`${label}${target}`, -promo.discountAmount, '#22C55E'));
        }
    }

    return `<!DOCTYPE html>
<html lang="${language}" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <meta name="supported-color-schemes" content="light">
    <title>Order Receipt ${esc(order.displayId)}</title>
    <!--[if mso]><style>table,td{font-family:Arial,Helvetica,sans-serif!important}</style><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#F5F3FF;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">

<!-- Outer wrapper -->
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#F5F3FF">
<tr><td style="padding:32px 16px" align="center">

<!-- Card -->
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(124,58,237,0.10)">

    <!-- ====== HEADER ====== -->
    <tr><td style="background:linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%);padding:36px 40px 32px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td>
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Zipp Go</p>
                </td>
                <td align="right" style="vertical-align:middle">
                    <span style="display:inline-block;background:rgba(255,255,255,0.20);border-radius:20px;padding:6px 14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:12px;font-weight:600;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase">${esc(t.receipt)}</span>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- ====== SUCCESS BANNER ====== -->
    <tr><td style="background:#ecfdf5;padding:20px 40px;border-bottom:1px solid #d1fae5">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width:36px;vertical-align:middle">
                    <div style="width:32px;height:32px;border-radius:50%;background:#22C55E;text-align:center;line-height:32px;font-size:16px;color:#ffffff">&#10003;</div>
                </td>
                <td style="padding-left:14px;vertical-align:middle">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#065f46">${esc(t.orderDelivered)}</p>
                    <p style="margin:2px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#047857">${esc(t.greeting(toName))}</p>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- ====== ORDER META ====== -->
    <tr><td style="padding:28px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;border-radius:12px;overflow:hidden">
            <tr>
                <td style="padding:16px 20px;border-right:1px solid #EDE9FE;width:50%">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:600;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px">${esc(t.orderNo)}</p>
                    <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:16px;font-weight:700;color:#1f2937;letter-spacing:-0.2px">${esc(order.displayId)}</p>
                </td>
                <td style="padding:16px 20px;width:50%">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:600;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px">${esc(t.date)}</p>
                    <p style="margin:4px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:500;color:#1f2937">${esc(orderDate)}</p>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- ====== BUSINESS NAME ====== -->
    <tr><td style="padding:20px 40px 4px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <td style="width:28px;vertical-align:middle">
                    <div style="width:24px;height:24px;border-radius:6px;background:#EDE9FE;text-align:center;line-height:24px;font-size:12px">&#127973;</div>
                </td>
                <td style="padding-left:10px;vertical-align:middle">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:15px;font-weight:600;color:#1f2937">${esc(order.businessName)}</p>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- ====== ITEMS TABLE ====== -->
    <tr><td style="padding:16px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #EDE9FE;border-radius:12px;overflow:hidden">
            <tr style="background:#F5F3FF">
                <th style="padding:12px 20px;text-align:left;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:700;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #EDE9FE">${esc(t.item)}</th>
                <th style="padding:12px 12px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:700;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #EDE9FE">${esc(t.qty)}</th>
                <th style="padding:12px 20px;text-align:right;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:700;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #EDE9FE">${esc(t.price)}</th>
            </tr>
            ${itemRows}
        </table>
    </td></tr>

    <!-- ====== SUMMARY ====== -->
    <tr><td style="padding:20px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${summaryLines.join('')}
        </table>
    </td></tr>

    <!-- ====== TOTAL ====== -->
    <tr><td style="padding:16px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#7C3AED 0%,#6D28D9 100%);border-radius:12px;overflow:hidden">
            <tr>
                <td style="padding:18px 24px">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:500;color:rgba(255,255,255,0.7)">${esc(t.total)}</p>
                </td>
                <td style="padding:18px 24px;text-align:right">
                    <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:24px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;font-variant-numeric:tabular-nums">${formatCurrency(order.total)}</p>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- ====== DETAILS CARDS ====== -->
    <tr><td style="padding:20px 40px 0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            <tr>
                <!-- Payment card -->
                <td style="width:49%;vertical-align:top">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;border-radius:12px;border:1px solid #EDE9FE">
                        <tr><td style="padding:16px 18px">
                            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:600;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px">${esc(t.payment)}</p>
                            <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:#1f2937">${paymentIcon} ${esc(paymentLabel)}</p>
                        </td></tr>
                    </table>
                </td>
                <td style="width:2%"></td>
                <!-- Address card -->
                <td style="width:49%;vertical-align:top">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F5F3FF;border-radius:12px;border:1px solid #EDE9FE">
                        <tr><td style="padding:16px 18px">
                            <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;font-weight:600;color:#A78BFA;text-transform:uppercase;letter-spacing:0.8px">${esc(t.deliveredTo)}</p>
                            <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;font-weight:500;color:#1f2937;line-height:1.4">&#128205; ${esc(order.dropoffAddress)}</p>
                        </td></tr>
                    </table>
                </td>
            </tr>
        </table>
    </td></tr>

    <!-- ====== SPACER ====== -->
    <tr><td style="padding:12px 0"></td></tr>

    <!-- ====== FOOTER ====== -->
    <tr><td style="padding:24px 40px 28px;background:#F5F3FF;border-top:1px solid #EDE9FE">
        <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:13px;color:#64748b;text-align:center;line-height:1.5">
            ${esc(t.thankYou)} <strong style="color:#7C3AED">Zipp Go</strong>
        </p>
        <p style="margin:8px 0 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#94a3b8;text-align:center">
            ${esc(t.automated)}
        </p>
        <p style="margin:14px 0 0;text-align:center">
            <a href="${esc(params.unsubscribeUrl)}" style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:11px;color:#A78BFA;text-decoration:underline">${esc(t.unsubscribe)}</a>
        </p>
    </td></tr>

</table>
<!-- /Card -->

</td></tr>
</table>
<!-- /Outer wrapper -->

</body>
</html>`;
}

function summaryRow(label: string, amount: number, color = '#475569'): string {
    const sign = amount < 0 ? '−' : '';
    const display = `${sign}${formatCurrency(Math.abs(amount))}`;
    return `
    <tr>
        <td style="padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;color:#64748b">${esc(label)}</td>
        <td style="padding:6px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;font-size:14px;font-weight:600;color:${color};text-align:right;font-variant-numeric:tabular-nums">${display}</td>
    </tr>`;
}
