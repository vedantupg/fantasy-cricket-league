import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject,
  uploadBytesResumable,
  UploadTaskSnapshot
} from 'firebase/storage';
import { storage } from './firebase';

// Storage paths
const STORAGE_PATHS = {
  USER_PROFILES: 'images/users',
  PLAYERS: 'images/players',
  LEAGUES: 'images/leagues',
} as const;

// Image upload service
export const imageService = {
  // Upload user profile picture
  async uploadUserProfile(userId: string, file: File): Promise<string> {
    try {
      console.log('Starting upload for user:', userId);
      console.log('File details:', { name: file.name, size: file.size, type: file.type });

      const fileName = `profile.${file.name.split('.').pop()}`;
      const storagePath = `${STORAGE_PATHS.USER_PROFILES}/${userId}/${fileName}`;
      console.log('Upload path:', storagePath);

      const storageRef = ref(storage, storagePath);

      console.log('Uploading file...');
      const snapshot = await uploadBytes(storageRef, file);
      console.log('Upload successful, getting download URL...');

      const downloadURL = await getDownloadURL(snapshot.ref);
      console.log('Download URL obtained:', downloadURL);

      return downloadURL;
    } catch (error: any) {
      console.error('Upload error details:', {
        code: error.code,
        message: error.message,
        serverResponse: error.serverResponse,
        customData: error.customData
      });
      throw error;
    }
  },

  // Upload player image (admin only)
  async uploadPlayerImage(playerId: string, file: File): Promise<string> {
    const fileName = `${playerId}.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `${STORAGE_PATHS.PLAYERS}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  },

  // Upload league logo
  async uploadLeagueLogo(leagueId: string, file: File): Promise<string> {
    const fileName = `logo.${file.name.split('.').pop()}`;
    const storageRef = ref(storage, `${STORAGE_PATHS.LEAGUES}/${leagueId}/${fileName}`);
    
    const snapshot = await uploadBytes(storageRef, file);
    return await getDownloadURL(snapshot.ref);
  },

  // Upload with progress tracking
  uploadWithProgress(
    path: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, path);
      const uploadTask = uploadBytesResumable(storageRef, file);

      uploadTask.on('state_changed',
        (snapshot: UploadTaskSnapshot) => {
          const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
          onProgress?.(progress);
        },
        (error) => {
          reject(error);
        },
        async () => {
          try {
            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
            resolve(downloadURL);
          } catch (error) {
            reject(error);
          }
        }
      );
    });
  },

  // Delete image
  async deleteImage(path: string): Promise<void> {
    const storageRef = ref(storage, path);
    await deleteObject(storageRef);
  },

  // Validate image file
  validateImage(file: File): { isValid: boolean; error?: string } {
    // Check file type
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'File must be an image' };
    }

    // Check file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'Image must be less than 5MB' };
    }

    // Check supported formats
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(file.type)) {
      return { isValid: false, error: 'Supported formats: JPEG, PNG, WebP' };
    }

    return { isValid: true };
  },
};

export default imageService;