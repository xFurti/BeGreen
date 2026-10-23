import type { ConfigContext, ExpoConfig } from "expo/config";

// Android's native map is optional. Without a restricted Maps SDK key the
// profile uses its working tile preview rather than mounting an unconfigured SDK.
export default ({ config }: ConfigContext): ExpoConfig => {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return {
    ...config,
    name: config.name ?? "BeGreen",
    slug: config.slug ?? "begreen",
    android: {
      ...config.android,
      ...(key ? { config: { ...config.android?.config, googleMaps: { apiKey: key } } } : {}),
    },
    extra: { ...config.extra, androidProofMap: Boolean(key) },
  };
};
