import { createReadStream, readFileSync, writeFileSync } from 'fs';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
export type LittleOwlCondition =
  | 'New'
  | 'UsedLikeNew'
  | 'UsedVeryGood'
  | 'UsedGood'
  | 'UsedAcceptable'
  | 'CollectableLikeNew'
  | 'CollectableVeryGood'
  | 'CollectableGood'
  | 'CollectableAcceptable';
export type LittleOwlInventoryType = 'FBA' | 'MF';
export interface LittleOwlItemEntry {
  productid: string; // ASIN/UPC/ISBN-13/ISBN-10
  title: string; // Name of Product
  cost?: number; // Example: 10.24, 9.99
  list_price?: number; // Example: 10.24, 9.99
  ex_quantity?: number; // If left Blank software will default to 1
  SKU: string; // Lo-0-102
  vendor?: string; // Cannot be longer than 40 characters
  inventorytype: LittleOwlInventoryType; // FBA/MF
  purchase_date?: string; // Must follow mm/dd/yyyy format
  ex_condition?: LittleOwlCondition; // Must Use the Following Values If Used
}

export interface NewTrackingSpreadsheetItemEntry {
  status: string;
  date: string;
  title: string;
  isbn: string;
  seller: string;
  qty: number;
  condition: string;
  market: string;
  buy: number;
  prepAndShip: number;
  landedCost: string;
  amzFees: string;
  totalUnitCost: string;
  estimatedSell: string;
  estimatedProfit: string;
  sellDate: string;
  daysHeld: string;
  actualSell: string;
  actualProfit: string;
  roi: string;
  roiPA: string;
  orderId: string;
  trackingNumber: string;
}

export interface AmazonItemEntry {
  Website: string;
  'Order ID': string;
  'Order Date': string;
  'Purchase Order Number': string;
  Currency: string;
  'Unit Price': string;
  'Unit Price Tax': string;
  'Shipping Charge': string;
  'Total Discounts': string;
  'Total Owed': string;
  'Shipment Item Subtotal': string;
  'Shipment Item Subtotal Tax': string;
  ASIN: string;
  'Product Condition': string;
  Quantity: string;
  'Payment Instrument Type': string;
  'Order Status': string;
  'Shipment Status': string;
  'Ship Date': string;
  'Shipping Option': string;
  'Shipping Address': string;
  'Billing Address': string;
  'Carrier Name & Tracking Number': string;
  'Product Name': string;
  'Gift Message': string;
  'Gift Sender Name': string;
  'Gift Recipient Contact Details': string;
  'Item Serial Number': string;
  Vendor: string;
}
export function loadAmazonCSV(file: string): Promise<AmazonItemEntry[]> {
  const parsed: AmazonItemEntry[] = [];

  return new Promise((resolve, reject) => {
    createReadStream(file)
      .pipe(csvParser())
      .on('data', (data) => {
        parsed.push(data);
      })
      .on('end', () => {
        resolve(parsed);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

export function parseAmazonCSV(items: AmazonItemEntry[]): AmazonItemEntry[] {
  // remove duplicates by order id and asin
  const seen = new Set<string>();
  const filtered = items.filter((item) => {
    const key = `${item['Order ID']}-${item.ASIN}`;
    return seen.has(key) ? false : seen.add(key);
  });

  return filtered;
}

export function writeLittleOwlCSVFromAmazon(
  filename: string,
  data: AmazonItemEntry[],
  lastImport: string
) {
  const entries: LittleOwlItemEntry[] = [];
  let lastImportPassed = false;

  data.forEach((entry) => {
    // skip if the order id is less than the last import
    lastImportPassed = lastImportPassed || entry['Order ID'] === lastImport;
    if (!lastImportPassed) {
      const row: LittleOwlItemEntry = {
        productid: entry.ASIN,
        title: entry['Product Name'],
        SKU: 'LO-1167-' + entry.ASIN + '-' + entry['Order ID'],
        inventorytype: 'FBA',
        cost: parseFloat(entry['Total Owed']),
        list_price:
          (Math.floor(parseFloat(entry['Total Owed']) * 100) * 2) / 100,
        ex_quantity: parseInt(entry.Quantity),
        ex_condition: getLittleOwlConditionFromAmazon(
          entry['Product Condition'],
          true
        ),
        vendor: 'Amazon',
        // parsed from amazon and formatted in mm/dd/yyyy
        purchase_date: new Date(entry['Order Date']).toLocaleDateString(
          'en-US',
          {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric',
          }
        ),
      };

      entries.push(row);
    }
  });

  // write the entries to a csv with header using csv-writer
  createObjectCsvWriter({
    path: filename,
    header: [
      { id: 'productid', title: 'productid' },
      { id: 'title', title: 'title' },
      { id: 'cost', title: 'cost' },
      { id: 'list_price', title: 'list_price' },
      { id: 'ex_quantity', title: 'ex_quantity' },
      { id: 'SKU', title: 'SKU' },
      { id: 'vendor', title: 'vendor' },
      { id: 'inventorytype', title: 'inventorytype' },
      { id: 'purchase_date', title: 'purchase_date' },
      { id: 'ex_condition', title: 'ex_condition' },
    ],
  }).writeRecords(entries);
}

export function writeNewTrackingFormatFromAmazon(
  filename: string,
  data: AmazonItemEntry[]
) {
  const entries: NewTrackingSpreadsheetItemEntry[] = [];

  const orderedData = [...data].reverse();

  orderedData.forEach((entry) => {
    // skip if the order id is less than the last import
    // lastImportPassed = lastImportPassed || entry['Order ID'] === lastImport;
    if (new Date(entry['Order Date']).getFullYear() >= 2024) {
      const row: NewTrackingSpreadsheetItemEntry = {
        isbn: formatExcelNumberAsString(entry.ASIN),
        title: entry['Product Name'],
        buy: parseFloat(entry['Total Owed']),
        condition: getLittleOwlConditionFromAmazon(
          entry['Product Condition'],
          false
        ),
        market: 'AMZ',
        seller: entry['Vendor'],
        qty: Number.parseInt(entry.Quantity),
        date: new Date(entry['Order Date']).toLocaleDateString('en-AU', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric',
        }),
        status: getStatusFromAmazon(entry['Order Status']),
        prepAndShip: entry['Shipping Address'].includes('POLARIS') ? 3 : 1.85,
        landedCost: '',
        amzFees: '',
        totalUnitCost: '',
        estimatedSell: '',
        estimatedProfit: '',
        sellDate: '',
        daysHeld: '',
        actualSell: '',
        actualProfit: '',
        roi: '',
        roiPA: '',
        orderId: entry['Order ID'],
        trackingNumber: formatExcelNumberAsString(
          entry['Carrier Name & Tracking Number']
        ),
      };

      entries.push(row);
    }
  });

  // write the entries to a csv with header using csv-writer
  createObjectCsvWriter({
    path: filename,
    alwaysQuote: true,
    header: [
      { id: 'status', title: 'status' },
      { id: 'date', title: 'date' },
      { id: 'title', title: 'title' },
      { id: 'isbn', title: 'isbn' },
      { id: 'seller', title: 'seller' },
      { id: 'qty', title: 'qty' },
      { id: 'condition', title: 'condition' },
      { id: 'market', title: 'market' },
      { id: 'buy', title: 'buy' },
      { id: 'prepAndShip', title: 'prepAndShip' },
      { id: 'landedCost', title: 'landedCost' },
      { id: 'amzFees', title: 'amzFees' },
      { id: 'totalUnitCost', title: 'totalUnitCost' },
      { id: 'estimatedSell', title: 'estimatedSell' },
      { id: 'estimatedProfit', title: 'estimatedProfit' },
      { id: 'sellDate', title: 'sellDate' },
      { id: 'daysHeld', title: 'daysHeld' },
      { id: 'actualSell', title: 'actualSell' },
      { id: 'actualProfit', title: 'actualProfit' },
      { id: 'roi', title: 'roi' },
      { id: 'roiPA', title: 'roiPA' },
      { id: 'orderId', title: 'orderId' },
      { id: 'trackingNumber', title: 'trackingNumber' },
    ],
  }).writeRecords(entries);
}

export function formatExcelNumberAsString(number: number | string): string {
  return !!number ? `="${number}"` : `Not Available`;
}

export function sortAmazonData(data: AmazonItemEntry[]): AmazonItemEntry[] {
  const copiedData = [...data];
  return copiedData.sort((a, b) => {
    const dateA = new Date(a['Order Date']);
    const dateB = new Date(b['Order Date']);

    const orderIdA = a['Order ID'];
    const orderIdB = b['Order ID'];

    const asinA = a.ASIN;
    const asinB = b.ASIN;

    // sort by date, then order id, then asin
    if (dateA.toString() === dateB.toString()) {
      if (orderIdA === orderIdB) {
        return asinA < asinB ? -1 : 1;
      } else {
        return orderIdA < orderIdB ? -1 : 1;
      }
    }

    return dateA < dateB ? 1 : -1;
  });
}

export function getLittleOwlConditionFromAmazon(
  amazonCondition: string,
  capped: boolean = false
): LittleOwlCondition {
  switch (amazonCondition) {
    case 'New':
      return capped ? 'UsedVeryGood' : 'New';
    case 'Used - Very Good':
      return 'UsedVeryGood';
    case 'Used - Like New':
      return capped ? 'UsedVeryGood' : 'UsedLikeNew';
    case 'Used - Acceptable':
      return 'UsedAcceptable';
    default:
    case 'Used - Good':
      return 'UsedGood';
  }
}

export function getStatusFromAmazon(amazonStatus: string): string {
  switch (amazonStatus) {
    case 'Cancelled':
      return 'Closed';
    default:
      return 'For Sale';
  }
}
