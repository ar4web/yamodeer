import { calculateVatAmountSar, roundSarToHalala } from "@/data/mockBlueprints";

export type InvoiceSourceType = "PURCHASE_ORDER" | "DIRECT";
export type InvoiceDraftStatus = "DRAFT" | "READY_TO_ISSUE";
export type PurchaseOrderStatus = "RECEIVED" | "AWAITING_RECEIPT" | "CLOSED";

export interface ClientProfile {
  id: string;
  legalName: { en: string; ar: string };
  vatRegistrationNumber: string;
  commercialRegistrationNumber: string;
  address: { en: string; ar: string };
  billingEmail: string;
  paymentTermsDays: number;
}

export interface InvoiceLineInput {
  id: string;
  descriptionEn: string;
  descriptionAr: string;
  quantity: number;
  unitPriceSar: number;
  vatRatePercent: number;
}

export interface InvoiceLineCalculated extends InvoiceLineInput {
  netAmountSar: number;
  vatAmountSar: number;
  totalAmountSar: number;
}

export interface InvoiceTotals {
  taxableSubtotalSar: number;
  totalVatSar: number;
  grandTotalSar: number;
}

export interface ClientPurchaseOrder {
  id: string;
  clientId: string;
  reference: string;
  status: PurchaseOrderStatus;
  receivedAtIso?: string;
  validUntilIso: string;
  lines: InvoiceLineInput[];
}

export interface InvoiceDraftRecord {
  id: string;
  sourceType: InvoiceSourceType;
  sourceId: string;
  sourceReference: string;
  client: ClientProfile;
  invoiceDate: string;
  dueDate: string;
  lines: InvoiceLineCalculated[];
  totals: InvoiceTotals;
  status: InvoiceDraftStatus;
  createdAtIso: string;
}

export const CLIENT_DIRECTORY: ClientProfile[] = [
  {
    id: "CLIENT-1001",
    legalName: { en: "Riyadh Digital Infrastructure Co.", ar: "شركة البنية الرقمية بالرياض" },
    vatRegistrationNumber: "310123456700003",
    commercialRegistrationNumber: "1010876543",
    address: { en: "King Fahd Road, Riyadh 12211", ar: "طريق الملك فهد، الرياض ١٢٢١١" },
    billingEmail: "ap@riyadh-digital.example",
    paymentTermsDays: 30
  },
  {
    id: "CLIENT-1002",
    legalName: { en: "Wadi Systems Ltd.", ar: "شركة أنظمة الوادي" },
    vatRegistrationNumber: "310765432100003",
    commercialRegistrationNumber: "1010432198",
    address: { en: "Olaya District, Riyadh 12214", ar: "حي العليا، الرياض ١٢٢١٤" },
    billingEmail: "finance@wadi-systems.example",
    paymentTermsDays: 14
  },
  {
    id: "CLIENT-1003",
    legalName: { en: "Eastern Gate Services Co.", ar: "شركة بوابة الشرق للخدمات" },
    vatRegistrationNumber: "310987654300003",
    commercialRegistrationNumber: "2050182736",
    address: { en: "King Abdulaziz Port Road, Dammam 32415", ar: "طريق ميناء الملك عبدالعزيز، الدمام ٣٢٤١٥" },
    billingEmail: "billing@eastern-gate.example",
    paymentTermsDays: 45
  }
];

export const isPurchaseOrderInvoiceEligible = (purchaseOrder: ClientPurchaseOrder, invoiceDate: string): boolean =>
  purchaseOrder.status === "RECEIVED" &&
  (!invoiceDate || !purchaseOrder.validUntilIso || purchaseOrder.validUntilIso >= invoiceDate);

export const calculateInvoiceDueDate = (invoiceDate: string, paymentTermsDays: number): string => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(invoiceDate) || !Number.isInteger(paymentTermsDays) || paymentTermsDays < 0) {
    throw new RangeError("A valid invoice date and non-negative integer payment term are required");
  }
  const dueDate = new Date(`${invoiceDate}T00:00:00.000Z`);
  if (Number.isNaN(dueDate.getTime()) || dueDate.toISOString().slice(0, 10) !== invoiceDate) {
    throw new RangeError("Invoice date must be a real calendar date");
  }
  dueDate.setUTCDate(dueDate.getUTCDate() + paymentTermsDays);
  return dueDate.toISOString().slice(0, 10);
};

export const CLIENT_PURCHASE_ORDERS: ClientPurchaseOrder[] = [
  {
    id: "PO-2026-0148",
    clientId: "CLIENT-1001",
    reference: "PO-2026-0148",
    status: "RECEIVED",
    receivedAtIso: "2026-10-01T09:30:00.000Z",
    validUntilIso: "2026-12-31",
    lines: [
      {
        id: "PO-0148-L1",
        descriptionEn: "Infrastructure monitoring and managed support",
        descriptionAr: "مراقبة البنية التحتية والدعم المُدار",
        quantity: 12,
        unitPriceSar: 2500,
        vatRatePercent: 15
      },
      {
        id: "PO-0148-L2",
        descriptionEn: "Service onboarding and configuration",
        descriptionAr: "تهيئة الخدمة وإعدادها",
        quantity: 1,
        unitPriceSar: 6000,
        vatRatePercent: 15
      }
    ]
  },
  {
    id: "PO-2026-0156",
    clientId: "CLIENT-1001",
    reference: "PO-2026-0156",
    status: "AWAITING_RECEIPT",
    validUntilIso: "2026-11-30",
    lines: [
      {
        id: "PO-0156-L1",
        descriptionEn: "Additional support hours",
        descriptionAr: "ساعات دعم إضافية",
        quantity: 20,
        unitPriceSar: 400,
        vatRatePercent: 15
      }
    ]
  },
  {
    id: "PO-2026-0211",
    clientId: "CLIENT-1002",
    reference: "PO-2026-0211",
    status: "RECEIVED",
    receivedAtIso: "2026-10-02T12:00:00.000Z",
    validUntilIso: "2026-12-15",
    lines: [
      {
        id: "PO-0211-L1",
        descriptionEn: "HR system integration services",
        descriptionAr: "خدمات تكامل نظام الموارد البشرية",
        quantity: 1,
        unitPriceSar: 18500,
        vatRatePercent: 15
      }
    ]
  }
];

const cloneClient = (client: ClientProfile): ClientProfile => ({
  ...client,
  legalName: { ...client.legalName },
  address: { ...client.address }
});

export async function searchClients(query: string): Promise<ClientProfile[]> {
  const normalized = query.trim().toLocaleLowerCase();
  const matches = CLIENT_DIRECTORY.filter((client) => {
    if (!normalized) return true;
    return [
      client.id,
      client.legalName.en,
      client.legalName.ar,
      client.vatRegistrationNumber,
      client.commercialRegistrationNumber
    ].some((value) => value.toLocaleLowerCase().includes(normalized));
  });
  return matches.map(cloneClient);
}

export async function fetchClientDetails(clientId: string): Promise<ClientProfile | null> {
  const client = CLIENT_DIRECTORY.find((record) => record.id === clientId);
  return client ? cloneClient(client) : null;
}

export async function fetchClientPurchaseOrders(clientId: string): Promise<ClientPurchaseOrder[]> {
  return CLIENT_PURCHASE_ORDERS
    .filter((purchaseOrder) => purchaseOrder.clientId === clientId)
    .map((purchaseOrder) => ({
      ...purchaseOrder,
      lines: purchaseOrder.lines.map((line) => ({ ...line }))
    }));
}

export function calculateInvoiceLines(lines: InvoiceLineInput[]): InvoiceLineCalculated[] {
  if (lines.length === 0) throw new RangeError("At least one invoice line is required");
  return lines.map((line) => {
    if (!Number.isFinite(line.quantity) || line.quantity <= 0) {
      throw new RangeError("Invoice quantities must be finite and greater than zero");
    }
    if (!Number.isFinite(line.unitPriceSar) || line.unitPriceSar < 0) {
      throw new RangeError("Invoice unit prices must be finite and non-negative");
    }
    if (!Number.isFinite(line.vatRatePercent) || line.vatRatePercent < 0 || line.vatRatePercent > 100) {
      throw new RangeError("VAT rate must be between 0 and 100 percent");
    }
    if (!line.descriptionEn.trim() || !line.descriptionAr.trim()) {
      throw new TypeError("Invoice descriptions are required in English and Arabic");
    }
    const netAmountSar = roundSarToHalala(line.quantity * line.unitPriceSar);
    const vatAmountSar = calculateVatAmountSar(netAmountSar, line.vatRatePercent / 100);
    return {
      ...line,
      netAmountSar,
      vatAmountSar,
      totalAmountSar: roundSarToHalala(netAmountSar + vatAmountSar)
    };
  });
}

export function calculateInvoiceTotals(lines: InvoiceLineCalculated[]): InvoiceTotals {
  const taxableSubtotalSar = roundSarToHalala(lines.reduce((sum, line) => sum + line.netAmountSar, 0));
  const totalVatSar = roundSarToHalala(lines.reduce((sum, line) => sum + line.vatAmountSar, 0));
  return {
    taxableSubtotalSar,
    totalVatSar,
    grandTotalSar: roundSarToHalala(taxableSubtotalSar + totalVatSar)
  };
}
