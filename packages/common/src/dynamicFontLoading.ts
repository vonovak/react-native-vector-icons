// @ts-expect-error missing types
// eslint-disable-next-line import/no-extraneous-dependencies
import { getAssetByID } from '@react-native/assets-registry/registry';
// @ts-expect-error missing types
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import {type Image} from 'react-native';

const loadPromises: { [fontSource: string]: Promise<void> } = {};

let dynamicFontLoadingEnabled = false

// allows dynamic loading of fonts for all icons
export const setDynamicLoadingEnabled = (value: boolean): boolean => {
    const canSet = globalThis.expo?.modules?.ExpoAsset && globalThis.expo?.modules?.ExpoFontLoader;
    if (canSet) {
        dynamicFontLoadingEnabled = value;
    }
    return canSet;
}

export const isDynamicLoadingEnabled = () => dynamicFontLoadingEnabled

export const downloadFontAsync = async (fontFamily: string, fontModuleId: number) => {
    if (loadPromises.hasOwnProperty(fontFamily)) {
        return loadPromises[fontFamily];
    }
    loadPromises[fontFamily] = (async () => {
        try {
            const fontMeta = getLocalFontUrl(fontModuleId);
            const { uri, type, hash, name } = fontMeta;
            const localUri = await globalThis.expo.modules.ExpoAsset.downloadAsync(uri, hash, type);
            await globalThis.expo.modules.ExpoFontLoader.loadAsync(name, localUri);
        } catch (error) {
            console.error('Failed to load font', error);
        } finally {
            delete loadPromises[fontFamily];
        }
    })();
    return loadPromises[fontFamily]
};

type AssetRegistryEntry = {
    name: string;
    httpServerLocation: string;
    hash: string;
    type: string; // file extension
};
function getLocalFontUrl(fontModuleId: number) {
    const assetMeta: AssetRegistryEntry = getAssetByID(fontModuleId);
    const resolver: typeof Image.resolveAssetSource = resolveAssetSource
    const assetSource = resolver(fontModuleId)
    return { ...assetMeta, ...assetSource };
}

// @ts-expect-error missing types
globalThis.expo.modules.ExpoFontLoader.loadedCache ??= {};

const getCache = (): { [name: string]: boolean } => {
    // @ts-expect-error missing types
    return globalThis.expo.modules.ExpoFontLoader.loadedCache;
};

export const isLoadedNative = (fontFamily: string) => {
    const loadedCache = getCache();
    if (fontFamily in loadedCache) {
        return true;
    } else {
        // @ts-expect-error missing types
        const loadedNativeFonts: string[] = globalThis.expo.modules.ExpoFontLoader.loadedFonts;
        loadedNativeFonts.forEach((font) => {
            loadedCache[font] = true;
        });
        return fontFamily in loadedCache;
    }
};
