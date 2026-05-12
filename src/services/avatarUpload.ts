import { ImagePickerAsset } from 'expo-image-picker';
import { uploadAvatar } from '../api/client';

export async function uploadPickedAvatar(asset?: ImagePickerAsset): Promise<string | undefined> {
  if (!asset?.uri) return undefined;
  if (/^https?:\/\//i.test(asset.uri)) return asset.uri;
  return uploadAvatar({
    uri: asset.uri,
    mimeType: asset.mimeType,
    fileName: asset.fileName,
  });
}
