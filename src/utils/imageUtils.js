/**
 * Utilidades para manejo responsivo de imágenes y variantes de la biblioteca de Supabase
 */

export const DEFAULT_ASSET_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

export function isUnsplashUrl(url) {
  return typeof url === 'string' && url.includes('images.unsplash.com');
}

export function buildImageSrcSet(url, widths = [400, 640, 800, 1200]) {
  if (!isUnsplashUrl(url)) return undefined;
  return widths
    .map((w) => `${url.replace(/([?&])w=\d+/, `$1w=${w}`)} ${w}w`)
    .join(', ');
}

export function assetVariants(asset) {
  const variants = asset && typeof asset === 'object' ? asset.variants || {} : {};
  return Object.entries(variants)
    .map(([key, url]) => {
      let width = 0;
      if (key === 'thumb') width = 400;
      else if (key === 'card') width = 900;
      else if (key === 'full') width = 1600;
      else width = Number(key) || 0;
      return { key, width, url };
    })
    .filter((variant) => typeof variant.url === 'string' && variant.url.length > 0)
    .sort((a, b) => a.width - b.width);
}

export function buildAssetSrcSet(asset) {
  const list = assetVariants(asset);
  if (list.length === 0) return undefined;
  return list.map((variant) => `${variant.url} ${variant.width}w`).join(', ');
}

export function primaryAssetUrl(asset, preferredWidth = 900) {
  const list = assetVariants(asset);
  if (list.length === 0) return (asset && (asset.url || asset.image)) || '';
  const match = list.find((variant) => variant.width >= preferredWidth);
  return (match || list[list.length - 1]).url;
}

export function buildPetImageProps(pet, { sizes = DEFAULT_ASSET_SIZES, alt } = {}) {
  const label = alt || (pet && pet.name ? `Foto de ${pet.name}` : 'Mascota en adopción');
  if (pet && pet.asset) {
    const list = assetVariants(pet.asset);
    return {
      src: primaryAssetUrl(pet.asset, 900),
      srcSet: buildAssetSrcSet(pet.asset),
      sizes: list.length > 1 ? sizes : undefined,
      alt: label,
      loading: 'lazy'
    };
  }
  const legacy = (pet && pet.image) || '';
  return {
    src: legacy,
    srcSet: isUnsplashUrl(legacy) ? buildImageSrcSet(legacy) : undefined,
    sizes: isUnsplashUrl(legacy) ? sizes : undefined,
    alt: label,
    loading: 'lazy'
  };
}
