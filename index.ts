import { readFileSync, writeFileSync } from 'fs';
import {
  loadAmazonCSV,
  parseAmazonCSV,
  sortAmazonData,
  writeLittleOwlCSVFromAmazon,
  writeNewTrackingFormatFromAmazon,
} from './utils';

async function main() {
  // const amazonData = await parseAmazonCSV('Retail.OrderHistory.1.csv');
  const data = await loadAmazonCSV('extension-output.csv');
  const parsedData = parseAmazonCSV(data);
  const amazonData = sortAmazonData(parsedData);

  // get the last order id from .last-import
  const lastImport = readFileSync('.last-import', 'utf8');
  const newLastImport = amazonData[0]['Order ID'];
  console.log(lastImport);
  writeLittleOwlCSVFromAmazon('little-owl.csv', amazonData, lastImport);
  writeNewTrackingFormatFromAmazon('tracking.csv', amazonData);
  // write the first order id to .last-import
  writeFileSync('.last-import', newLastImport);
}

main();
