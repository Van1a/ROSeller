export interface User {
  id: number;
  name: string;
  displayName: string;
}

export type GroupedItem = {
  assetId: number;
  assetName: string;
  found: number;
};

export interface inventoryFromFile {
  data: {
    assetId: number;
    assetName: string;
    serialNumber: number;
    collectibleItemId: string;
    collectibleItemInstanceId: string;
  };
}

export interface CachedUser {
  roblox: User;
  ttl: number;
}

export interface EconomyData {
  TargetId: number;
  ProductType: string;
  AssetId: number;
  ProductId: number;
  Name: string;
  Description: string;
  AssetTypeId: number;
  Creator: {
    Id: number;
    Name: string;
    CreatorType: string;
    CreatorTargetId: number;
    HasVerifiedBadge: boolean;
  };
  Created: string;
  Updated: string;
  PriceInRobux: number;
  Sales: number;
  IsNew: boolean;
  IsForSale: boolean;
  IsLimited: boolean;
  IsLimitedUnique: boolean;
  Remaining: number;
  CollectibleItemId: string;
  CollectibleProductId: string;
  CollectiblesItemDetails: {
    CollectibleLowestResalePrice: number | null;
    CollectibleLowestAvailableResaleProductId: string | null;
    CollectibleLowestAvailableResaleItemInstanceId: string | null;
    CollectibleQuantityLimitPerUser: number | null;
    IsForSale: boolean;
    TotalQuantity: number;
    IsLimited: boolean;
  };
}

export interface ResellData {
  skip?: boolean;
  reason?: string;
  assetId: number;
  name: string;
  description: string;
  assetTypeId: number;
  priceInRobux: number;
  sales: number;
  remaining: number;
  collectibleItemId: string;
  collectibleProductId: string;
  collectiblesItemDetails: {
    CollectibleLowestResalePrice: number | null;
    CollectibleLowestAvailableResaleProductId: string | null;
    CollectibleLowestAvailableResaleItemInstanceId: string | null;
    CollectibleQuantityLimitPerUser: number | null;
    IsForSale: boolean;
    TotalQuantity: number;
    IsLimited: boolean;
  };
  creator: {
    Id: number;
    Name: string;
    CreatorType: string;
    CreatorTargetId: number;
    HasVerifiedBadge: boolean;
  };
  itemInstances: {
    collectibleInstanceId: string;
    collectibleItemId: string;
    collectibleProductId: string;
    serialNumber: number;
    saleState: string;
    price: number;
  }[];
}

export interface InstanceResponse {
  itemInstances: {
    collectibleInstanceId: string | null;
    collectibleItemId: string | null;
    collectibleProductId: string | null;
    serialNumber: number | null;
    isHeld: boolean;
    saleState: string;
    price: number;
  }[];
  nextPageCursor: string;
  previousPageCursor: string;
}

export interface CollectibleItem {
  assetId: number;
  assetName: string;
  serialNumber: number | null;
  collectibleItemId: string;
  collectibleItemInstanceId: string;
}

export interface InventoryResponse {
  data: CollectibleItem[];
  nextPageCursor: string | null;
}

export interface InventoryFile {
  data: CollectibleItem[];
  ttl: number;
}

export interface Client {
  roblox: {
    name: string;
    userid: number;
    displayName: string;
  };
  ttl?: number;
}

export interface ResellParams {
  resalePercentageFee: number;
  minimumFee: number;
  resellableLimitedItemPriceFloors: [];
  priceFloor: number;
}

export interface ResellerData {
  collectibleProductId: string;
  collectibleItemInstanceId: string;
  seller: {
    sellerId: number;
    sellerType: string;
    name: string;
  };
  price: number;
  serialNumber: number;
}

export interface ResellersResponse {
  data: ResellerData[];
}

export interface PriceHistory {
  priceDataPoints: {
    value: number;
  }[];
}

export interface ThumbnailResponse {
  data: {
    targetId: number;
    state: string;
    imageUrl: string;
  }[];
}

export interface SalesResponse {
  data: {
    idHash: string;
    transactionType: string;
    created: string;
    isPending: boolean;
    agent: {
      id: number;
      name: string;
      type: string;
    };
    details: {
      id: number;
      name: string;
      type: string;
    };
    currency: {
      amount: number;
      type: string;
    };
  }[];
}
