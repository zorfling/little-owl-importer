import { describe, expect, it } from 'vitest';
import {
  parseAmazonCSV,
  writeLittleOwlCSVFromAmazon,
  writeNewTrackingFormatFromAmazon,
  sortAmazonData,
  getLittleOwlConditionFromAmazon,
  getStatusFromAmazon,
  AmazonItemEntry,
} from './utils';

// Mock data
const BASE_DATA: AmazonItemEntry = {
  'Order ID': '123',
  ASIN: 'B01ABC',
  'Order Date': '2022-01-01',
  Website: '',
  'Purchase Order Number': '',
  Currency: '',
  'Unit Price': '',
  'Unit Price Tax': '',
  'Shipping Charge': '',
  'Total Discounts': '',
  'Total Owed': '',
  'Shipment Item Subtotal': '',
  'Shipment Item Subtotal Tax': '',
  'Product Condition': '',
  Quantity: '',
  'Payment Instrument Type': '',
  'Order Status': '',
  'Shipment Status': '',
  'Ship Date': '',
  'Shipping Option': '',
  'Shipping Address': '',
  'Billing Address': '',
  'Carrier Name & Tracking Number': '',
  'Product Name': '',
  'Gift Message': '',
  'Gift Sender Name': '',
  'Gift Recipient Contact Details': '',
  'Item Serial Number': '',
  Vendor: '',
};
describe('sortAmazonData', () => {
  it('should sort the Amazon data by date, order ID, and ASIN', () => {
    const data: AmazonItemEntry[] = [
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '11111',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '22222',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '333',
        ASIN: '33333',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '222',
        ASIN: '44444',
        'Order Date': '2024-07-22T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '444',
        ASIN: '11111',
        'Order Date': '2024-07-21T00:00:00.000Z',
      },
    ];

    // Call the function
    const sortedData = sortAmazonData(data);

    expect(
      sortedData.map((item) => {
        const { ASIN, 'Order ID': orderId, 'Order Date': orderDate } = item;
        return { ASIN, orderId, orderDate };
      })
    ).toMatchSnapshot();

    // TODO: Add assertions to check if the data is sorted correctly
  });
});

describe('parseAmazonCSV', () => {
  it('should remove duplicates based on Order ID and ASIN', () => {
    const items: AmazonItemEntry[] = [
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '11111',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '11111',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '22222',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '333',
        ASIN: '33333',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
    ];

    const expected: AmazonItemEntry[] = [
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '11111',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '111',
        ASIN: '22222',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
      {
        ...BASE_DATA,
        'Order ID': '333',
        ASIN: '33333',
        'Order Date': '2024-07-23T00:00:00.000Z',
      },
    ];

    const result = parseAmazonCSV(items);

    expect(result).toEqual(expected);
  });
});
