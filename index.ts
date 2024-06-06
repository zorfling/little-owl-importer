import { createReadStream, readFileSync, writeFileSync } from 'fs';
import csvParser from 'csv-parser';
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
  data: AmazonItemEntry[]
) {
  const entries: LittleOwlItemEntry[] = [];

  data.forEach((entry) => {
    if (new Date(entry['Order Date']) > new Date('2024-01-01')) {
      const row: LittleOwlItemEntry = {
        productid: entry.ASIN,
        title: entry['Product Name'],
        SKU: 'LO-1167-' + entry.ASIN + '-' + entry['Order ID'],
        inventorytype: 'FBA',
        cost: parseFloat(entry['Total Owed']),
        list_price: parseFloat(entry['Total Owed']) + 80,
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

  const csv = entries.map((entry) => {
    return Object.values(entry).join(',');
  });

  const csvString = csv.join('\n');

  writeFileSync(filename, csvString);
}

async function main() {
  const amazonData = await parseAmazonCSV('Retail.OrderHistory.1.csv');
  writeLittleOwlCSVFromAmazon('little-owl.csv', amazonData);
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
