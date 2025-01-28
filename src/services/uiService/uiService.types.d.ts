export type UIServiceStyleType = {
    id: string;
};

export type PageSizeType = 'mobileSmall' | 'mobile' | 'tablet' | 'desktop' | 'desktopLarge' | string;

export type PageSizesType = Record<PageSizeType, number>;

export type UISizesType = Partial<PageSizesType>;

export type UIServiceConfigType = {
    uiSizes?: UISizesType;
    pageSizes?: PageSizesType;
    styles?: {
        dark?: UIServiceStyleType;
        responsive?: Record<PageSizeType, UIServiceStyleType>;
    };
};
