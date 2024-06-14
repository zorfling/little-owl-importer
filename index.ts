import { createReadStream, readFileSync, writeFileSync } from 'fs';
import csvParser from 'csv-parser';
import { createObjectCsvWriter } from 'csv-writer';
type LittleOwlCondition =
  | 'New'
  | 'UsedLikeNew'
  | 'UsedVeryGood'
  | 'UsedGood'
  | 'UsedAcceptable'
  | 'CollectableLikeNew'
  | 'CollectableVeryGood'
  | 'CollectableGood'
  | 'CollectableAcceptable';
type LittleOwlInventoryType = 'FBA' | 'MF';
interface LittleOwlItemEntry {
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

interface TrackingSpreadsheetItemEntry {
  status: string;
  title: string;
  isbn: string;
  purchase_date: string;
  condition: string;
  vendor: string;
  cost: number;
  ship_date: string;
  order_id: string;
  tracking_number: string;
}
interface NewTrackingSpreadsheetItemEntry {
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

interface AmazonItemEntry {
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
  'Item Serial Number';
}
function parseAmazonCSV(file: string): Promise<AmazonItemEntry[]> {
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

function writeLittleOwlCSVFromAmazon(
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
        list_price: (parseFloat(entry['Total Owed']) * 100 + 8000) / 100,
        ex_quantity: parseInt(entry.Quantity),
        ex_condition: getLittleOwlConditionFromAmazon(
          entry['Product Condition']
        ),
        vendor: 'Amazon',
        // parsed from amazon and formatted in mm/dd/yyyy
        purchase_date: new Date(entry['Order Date']).toLocaleDateString(
          'en-US',
          {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          }
        )
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
      { id: 'ex_condition', title: 'ex_condition' }
    ]
  }).writeRecords(entries);
}

function writeTrackingFormatFromAmazon(
  filename: string,
  data: AmazonItemEntry[],
  lastImport: string
) {
  const entries: TrackingSpreadsheetItemEntry[] = [];

  let lastImportPassed = false;

  data.forEach((entry) => {
    // skip if the order id is less than the last import
    lastImportPassed = lastImportPassed || entry['Order ID'] === lastImport;
    if (!lastImportPassed) {
      const row: TrackingSpreadsheetItemEntry = {
        isbn: entry.ASIN,
        title: entry['Product Name'],
        cost: parseFloat(entry['Total Owed']),
        condition: 'GOOD',
        vendor: 'Amazon',
        // parsed from amazon and formatted in mm/dd/yyyy
        purchase_date: new Date(entry['Order Date']).toLocaleDateString(
          'en-AU',
          {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
          }
        ),
        status: 'For Sale',
        ship_date: new Date(entry['Ship Date']).toLocaleDateString('en-AU', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }),
        order_id: entry['Order ID'],
        tracking_number: entry['Carrier Name & Tracking Number']
      };

      entries.push(row);
    }
  });

  entries.reverse();
  // write the entries to a csv with header using csv-writer
  createObjectCsvWriter({
    path: filename,
    header: [
      { id: 'status', title: 'status' },
      { id: 'title', title: 'title' },
      { id: 'isbn', title: 'isbn' },
      { id: 'bf', title: 'bf' },
      { id: 'amz', title: 'amz' },
      { id: 'purchase_date', title: 'purchase_date' },
      { id: 'condition', title: 'condition' },
      { id: 'vendor', title: 'vendor' },
      { id: 'cost', title: 'cost' },
      { id: 'prep', title: 'prep' },
      { id: 'landed', title: 'landed' },
      { id: 'received', title: 'received' },
      { id: 'ship_date', title: 'ship_date' },
      { id: 'notes', title: 'notes' },
      { id: 'tracking_number', title: 'tracking_number' },
      { id: 'order_id', title: 'order_id' }
    ]
  }).writeRecords(entries);
}

function writeNewTrackingFormatFromAmazon(
  filename: string,
  data: AmazonItemEntry[],
  lastImport: string
) {
  const entries: NewTrackingSpreadsheetItemEntry[] = [];

  let lastImportPassed = false;

  // sort data by date
  data.sort((a, b) => {
    return (
      new Date(a['Order Date']).getTime() - new Date(b['Order Date']).getTime()
    );
  });

  data.forEach((entry) => {
    // skip if the order id is less than the last import
    // lastImportPassed = lastImportPassed || entry['Order ID'] === lastImport;
    if (
      !lastImportPassed &&
      new Date(entry['Order Date']).getFullYear() >= 2024
    ) {
      const row: NewTrackingSpreadsheetItemEntry = {
        isbn: entry.ASIN,
        title: entry['Product Name'],
        buy: parseFloat(entry['Total Owed']),
        condition: getLittleOwlConditionFromAmazon(entry['Product Condition']),
        market: 'AMZ',
        seller: 'Amazon',
        qty: Number.parseInt(entry.Quantity),
        date: new Date(entry['Order Date']).toLocaleDateString('en-AU', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
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
        trackingNumber: entry['Carrier Name & Tracking Number']
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
      { id: 'trackingNumber', title: 'trackingNumber' }
    ]
  }).writeRecords(entries);
}

async function main() {
  const amazonData = await parseAmazonCSV('Retail.OrderHistory.1.csv');
  // get the last order id from .last-import
  const lastImport = readFileSync('.last-import', 'utf8');
  writeLittleOwlCSVFromAmazon('little-owl.csv', amazonData, lastImport);
  writeNewTrackingFormatFromAmazon('tracking.csv', amazonData, lastImport);
  // write the first order id to .last-import
  writeFileSync('.last-import', amazonData[0]['Order ID']);
}

main();

function getLittleOwlConditionFromAmazon(
  amazonCondition: string
): LittleOwlCondition {
  switch (amazonCondition) {
    case 'New':
      return 'New';
    default:
    case 'Used - Good':
      return 'UsedGood';
  }
}

function getStatusFromAmazon(amazonStatus: string): string {
  switch (amazonStatus) {
    case 'Cancelled':
      return 'Closed';
    default:
      return 'For Sale';
  }
}
