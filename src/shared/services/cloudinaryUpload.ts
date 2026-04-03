import { cloudinary } from '../config/cloudinary';

export const uploadToCloudinary = async (
  fileBuffer: Buffer,
  folder: string = 'avatars'
): Promise<{ secureUrl: string; publicId: string }> => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        transformation: [
          { width: 400, height: 400, crop: 'fill', gravity: 'face' },
          { quality: 'auto', fetch_format: 'auto' }
        ]
      },
      (error, result) => {
        if (error || !result) {
          reject(new Error('Failed to upload image to Cloudinary'));
        } else {
          resolve({ secureUrl: result.secure_url, publicId: result.public_id });
        }
      }
    );
    uploadStream.end(fileBuffer);
  });
};

export const deleteFromCloudinary = async (publicId: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    cloudinary.uploader.destroy(publicId, (error, result) => {
      if (error) {
        reject(new Error('Failed to delete image from Cloudinary'));
      } else {
        resolve();
      }
    });
  });
};
