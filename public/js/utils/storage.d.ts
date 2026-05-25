export declare function getStorageData<T>(key: string, defaultValue?: T): Promise<T | undefined>;
export declare function setStorageData<T>(key: string, value: T): Promise<void>;
export declare function removeStorageData(key: string): Promise<void>;
export declare function sendMessageToBackground<T = unknown>(message: unknown): Promise<T>;
export declare function sendMessageToContentScript<T = unknown>(tabId: number, message: unknown): Promise<T>;
//# sourceMappingURL=storage.d.ts.map