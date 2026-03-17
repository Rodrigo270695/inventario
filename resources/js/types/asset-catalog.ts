export type AssetBrand = {
    id: string;
    name: string;
};

export type AssetSubcategory = {
    id: string;
    asset_category_id: string;
    name: string;
    code: string | null;
    is_active: boolean;
    asset_category?: { id: string; name: string; code?: string; is_active?: boolean } | null;
};

export type AssetModel = {
    id: string;
    brand_id: string;
    subcategory_id: string;
    name: string;
    specs: Record<string, unknown> | null;
    is_active: boolean;
    brand?: { id: string; name: string } | null;
    subcategory?: { id: string; name: string; asset_category_id?: string; asset_category?: { id: string; name: string } | null } | null;
};

export type ComponentType = {
    id: string;
    name: string;
    code: string | null;
};
