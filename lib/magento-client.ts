import crypto from 'crypto';
import https from 'https';

interface MagentoConfig {
  baseURL: string;
  consumerKey: string;
  consumerSecret: string;
  accessToken: string;
  accessTokenSecret: string;
}

interface MagentoProduct {
  id: number;
  sku: string;
  name: string;
  type_id: string;
  price?: number;
  status: number;
  visibility: number;
  weight?: number;
  custom_attributes?: Array<{
    attribute_code: string;
    value: any;
  }>;
  extension_attributes?: {
    category_links?: Array<{
      category_id: string;
      position: number;
    }>;
    configurable_product_links?: number[];
    main_image?: string;
    thumbnail_image?: string;
  };
  media_gallery_entries?: Array<{
    id: number;
    file: string;
    label?: string;
    position: number;
    disabled: boolean;
    types: string[];
  }>;
  options?: Array<{
    option_id: number;
    title: string;
    type: string;
    is_require: boolean;
    sort_order: number;
    price?: number;
    price_type?: string;
    sku?: string;
    values?: Array<{
      option_type_id: number;
      title: string;
      price?: number;
      price_type?: string;
      sku?: string;
      sort_order: number;
    }>;
  }>;
}

interface MagentoCategory {
  id: number;
  parent_id: number;
  name: string;
  is_active: boolean;
  position: number;
  level: number;
  path: string;
  custom_attributes?: Array<{
    attribute_code: string;
    value: any;
  }>;
  children_data?: MagentoCategory[];
}

interface StockItem {
  item_id: number;
  product_id: number;
  stock_id: number;
  qty: number;
  is_in_stock: boolean;
  min_qty?: number;
  notify_stock_qty?: number;
  manage_stock?: boolean;
  backorders?: number;
}

interface SearchCriteria {
  pageSize?: number;
  currentPage?: number;
  updatedAfter?: string;
}

export class MagentoClient {
  private config: MagentoConfig;
  private baseURL: string;

  constructor(config: MagentoConfig) {
    this.config = config;
    this.baseURL = `${config.baseURL}/rest/V1`;
  }

  /**
   * Make authenticated request to Magento API
   */
  private async request<T>(
    method: string,
    endpoint: string,
    params?: Record<string, any>
  ): Promise<T> {
    let url = `${this.baseURL}${endpoint}`;

    // Add query parameters
    if (params && Object.keys(params).length > 0) {
      const queryString = Object.entries(params)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
      url += `?${queryString}`;
    }

    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const options: https.RequestOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || 443,
        path: urlObj.pathname + urlObj.search,
        method: method,
        headers: {
          'Authorization': `Bearer ${this.config.accessToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      };

      const req = https.request(options, (res) => {
        let data = '';

        res.on('data', (chunk) => {
          data += chunk;
        });

        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(JSON.parse(data));
            } catch (error) {
              reject(new Error(`Failed to parse response: ${data}`));
            }
          } else {
            reject(new Error(`HTTP ${res.statusCode}: ${data}`));
          }
        });
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.setTimeout(30000, () => {
        req.destroy();
        reject(new Error('Request timeout'));
      });

      req.end();
    });
  }

  /**
   * Get category tree from Magento
   */
  async getCategoryTree(rootCategoryId: number = 2): Promise<MagentoCategory> {
    return this.request<MagentoCategory>('GET', `/categories/${rootCategoryId}`);
  }

  /**
   * Get products with pagination and filters
   */
  async getProducts(criteria: SearchCriteria = {}): Promise<{
    items: MagentoProduct[];
    search_criteria: any;
    total_count: number;
  }> {
    const params: Record<string, any> = {
      'searchCriteria[pageSize]': criteria.pageSize || 50,
      'searchCriteria[currentPage]': criteria.currentPage || 1,
    };

    // Add filter for incremental sync
    if (criteria.updatedAfter) {
      params['searchCriteria[filter_groups][0][filters][0][field]'] = 'updated_at';
      params['searchCriteria[filter_groups][0][filters][0][value]'] = criteria.updatedAfter;
      params['searchCriteria[filter_groups][0][filters][0][condition_type]'] = 'gt';
    }

    return this.request<{
      items: MagentoProduct[];
      search_criteria: any;
      total_count: number;
    }>('GET', '/products', params);
  }

  /**
   * Get single product by SKU
   */
  async getProduct(sku: string): Promise<MagentoProduct> {
    const encodedSku = encodeURIComponent(sku);
    return this.request<MagentoProduct>('GET', `/products/${encodedSku}`);
  }

  /**
   * Get product attributes
   */
  async getAttributes(): Promise<{
    items: Array<{
      attribute_id: number;
      attribute_code: string;
      frontend_input: string;
      default_frontend_label: string;
      is_required: boolean;
      is_user_defined: boolean;
      position: number;
      options?: Array<{
        label: string;
        value: string;
      }>;
    }>;
    search_criteria: any;
    total_count: number;
  }> {
    return this.request('GET', '/products/attributes', {
      'searchCriteria[pageSize]': 1000,
    });
  }

  /**
   * Get stock item for a product (simple inventory, no MSI)
   */
  async getStockItem(productId: number): Promise<StockItem> {
    return this.request<StockItem>('GET', `/stockItems/${productId}`);
  }

  /**
   * Get stock status for a product by SKU
   */
  async getStockStatus(sku: string): Promise<StockItem | null> {
    try {
      const encodedSku = encodeURIComponent(sku);
      return await this.request<StockItem>('GET', `/stockStatuses/${encodedSku}`);
    } catch (error) {
      // Return null if not found or error
      return null;
    }
  }

  /**
   * Sleep helper for rate limiting
   */
  async sleep(ms: number = 500): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Download image from Magento
   */
  async downloadImage(imageUrl: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      https.get(imageUrl, (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`Failed to download image: HTTP ${res.statusCode}`));
          return;
        }

        const chunks: Buffer[] = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    });
  }
}

// Factory function to create client from environment variables
export function createMagentoClient(): MagentoClient {
  const config: MagentoConfig = {
    baseURL: process.env.MAGENTO_BASE_URL || '',
    consumerKey: process.env.MAGENTO_CONSUMER_KEY || '',
    consumerSecret: process.env.MAGENTO_CONSUMER_SECRET || '',
    accessToken: process.env.MAGENTO_ACCESS_TOKEN || '',
    accessTokenSecret: process.env.MAGENTO_ACCESS_TOKEN_SECRET || '',
  };

  // Validate config
  if (!config.baseURL || !config.consumerKey || !config.consumerSecret || 
      !config.accessToken || !config.accessTokenSecret) {
    throw new Error('Missing required Magento configuration. Check your .env file.');
  }

  return new MagentoClient(config);
}
