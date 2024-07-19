/*
* The following imports are always present when react native is installed
* in the future, more explicit apis will be exposed by the core, including typings
* */
// @ts-expect-error missing types
// eslint-disable-next-line import/no-extraneous-dependencies
import { getAssetByID } from '@react-native/assets-registry/registry';
// @ts-expect-error missing types
import resolveAssetSource from 'react-native/Libraries/Image/resolveAssetSource';
import {type Image} from 'react-native';

declare global {
    interface ExpoGlobal {
        modules: {
            ExpoAsset: {
                downloadAsync: (uri: string, path: string, type: string) => Promise<string>;
            };
            ExpoFontLoader: {
                loadAsync: (fontFamilyAlias: string, fileUri: string) => Promise<void>;
                loadedFonts: string[];
            };
        };
    }

    // eslint-disable-next-line vars-on-top
    var expo: ExpoGlobal | undefined;
}

const hasNecessaryExpoModules = !!globalThis.expo?.modules?.ExpoAsset
    && !!globalThis.expo?.modules?.ExpoFontLoader
    && globalThis.expo!.modules.ExpoFontLoader.hasOwnProperty('loadedFonts');

let dynamicFontLoadingEnabled = hasNecessaryExpoModules

export const isDynamicLoadingSupported = () => hasNecessaryExpoModules;

/**
 * Set whether dynamic loading of fonts is enabled. Currently, the presence of expo asset and font loader modules is a prerequisite for enabling.
 * In the future, react native core apis will be used for dynamic font loading.
 * @param value - whether dynamic loading of fonts is enabled
 * @returns `true` if dynamic loading of fonts was successfully set. `false` otherwise.
 * */
export const setDynamicLoadingEnabled = (value: boolean): boolean => {
    dynamicFontLoadingEnabled = value;
    if (!hasNecessaryExpoModules) {
        // if expo modules are not present, dynamic loading cannot work
        dynamicFontLoadingEnabled = false;
    }
    return dynamicFontLoadingEnabled === value;
}

/**
 * Whether dynamic loading of fonts is enabled. Currently, the presence of expo asset and font loader modules is a prerequisite.
 * In the future, react native core apis will be used for dynamic font loading.
 * */
export const isDynamicLoadingEnabled = () => dynamicFontLoadingEnabled

const loadPromises: { [fontSource: string]: Promise<void> } = {};

export const loadFontAsync = async (fontFamily: string, fontModuleId: number): Promise<void> => {
    if (loadPromises.hasOwnProperty(fontFamily)) {
        return loadPromises[fontFamily];
    }
    loadPromises[fontFamily] = (async () => {
        try {
            const { uri, type, hash, name } = getLocalFontUrl(fontModuleId, fontFamily);
            const localUri = await globalThis.expo!.modules.ExpoAsset.downloadAsync(uri, hash, type)
            await globalThis.expo!.modules.ExpoFontLoader.loadAsync(name, localUri);
        } catch (error) {
            console.error(`Failed to load font ${fontFamily}`, error);
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

const getLocalFontUrl = (fontModuleId: number, fontFamily: string) => {
    const assetMeta: AssetRegistryEntry = getAssetByID(fontModuleId);
    if (!assetMeta) {
        throw new Error(`no asset found for font family "${fontFamily}", moduleId: ${String(fontModuleId)}`)
    }
    const resolver: typeof Image.resolveAssetSource = resolveAssetSource
    const assetSource = resolver(fontModuleId)
    return { ...assetMeta, ...assetSource };
}

const loadedFontsCache:{ [name: string]: boolean } = {};

export const isLoadedNative = (fontFamily: string) => {
    if (fontFamily in loadedFontsCache) {
        return true;
    } else {
        const loadedNativeFonts  = globalThis.expo!.modules.ExpoFontLoader.loadedFonts;
        loadedNativeFonts.forEach((font) => {
            loadedFontsCache[font] = true;
        });
        return fontFamily in loadedFontsCache;
    }
};
