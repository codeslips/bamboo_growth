import COS from 'cos-js-sdk-v5';
import Storage from '../storage/index';

let cos = null;

/**
 * Initialize COS instance with credentials
 * @param {string} filename - The name of file to be uploaded
 * @returns {Promise<Object>} Credentials and configuration
 */
async function initCOS(filename) {
  try {
    // Get token for authorization
    const token = await Storage.get('token');
    
    // Get credentials from backend with authorization header
    const credentials = await fetch(`/objects/cos/getKeyAndCredentials?filename=${encodeURIComponent(filename)}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      credentials: 'include'
    }).then(res => res.json());

    // Initialize COS instance
    cos = new COS({
      getAuthorization: function(options, callback) {
        callback({
          TmpSecretId: credentials.TmpSecretId,
          TmpSecretKey: credentials.TmpSecretKey,
          SecurityToken: credentials.SessionToken,
          StartTime: credentials.StartTime,
          ExpiredTime: credentials.ExpiredTime,
        });
      }
    });

    return credentials;
  } catch (error) {
    console.error('Error initializing COS:', error);
    throw error;
  }
}

/**
 * Upload file to Tencent COS
 * @param {File} file - The file to upload
 * @param {Function} [onProgress] - Progress callback function
 * @returns {Promise<{url: string, location: string}>}
 */
export const uploadFile = (file, onProgress, metadata = {}) => {
  return new Promise(async (resolve, reject) => {
    try {
      // Initialize COS with credentials for this upload
      const credentials = await initCOS(file.name);

      cos.uploadFile({
        Bucket: credentials.Bucket,
        Region: credentials.Region,
        Key: credentials.Key,
        Body: file,
        SliceSize: 1024 * 1024 * 5, // 5MB slice size for multipart upload
        onProgress: function(progressData) {
          if (onProgress) {
            const percent = Math.floor(progressData.percent * 100);
            const loaded = (progressData.loaded / 1024 / 1024).toFixed(2);
            const total = (progressData.total / 1024 / 1024).toFixed(2);
            onProgress({
              percent,
              loaded,
              total,
              raw: progressData
            });
          }
        }
      }, async function(err, data) {
        if (err) {
          console.error('Upload failed:', err);
          reject(err);
          return;
        }

        try {
          // Prepare resource metadata
          const resourceData = {
            title: file.name,
            resource_type: metadata.resource_type || 'other', // You can determine this based on file type
            storage_type: 'object',
            file_path: data.Location,
            file_size: file.size,
            mime_type: file.type,
            metadata: {
              ...metadata,
              cos_data: data
            }
          };

          // Get token for authorization
          const token = await Storage.get('token');

          // Create resource record
          const response = await fetch('/api/v1/resources/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(resourceData)
          });

          if (!response.ok) {
            throw new Error('Failed to create resource record');
          }

          const resourceResult = await response.json();
          
          resolve({
            url: `https://${data.Location}`,
            location: data.Location,
            resource_hash: resourceResult.hash
          });
        } catch (error) {
          console.error('Failed to create resource record:', error);
          // Still resolve with upload data even if resource creation fails
          resolve({
            url: `https://${data.Location}`,
            location: data.Location,
            error: 'Failed to create resource record'
          });
        }
      });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Validate file type against allowed types
 * @param {File} file - The file to validate
 * @param {string[]} allowedTypes - Array of allowed file extensions
 * @returns {boolean}
 */
export const validateFileType = (file, allowedTypes = []) => {
  if (!allowedTypes.length) return true;
  
  const fileExtension = file.name.split('.').pop().toLowerCase();
  return allowedTypes.some(type => {
    type = type.replace('.', '');
    return type === fileExtension;
  });
};

/**
 * Delete file from Tencent COS
 * @param {string} bucket - The COS bucket name
 * @param {string} region - The COS bucket region
 * @param {string} key - The file key to delete
 * @returns {Promise<void>}
 */
export const deleteFile = (bucket, region, key) => {
  if (!cos) {
    throw new Error('COS not initialized');
  }

  return new Promise((resolve, reject) => {
    cos.deleteObject({
      Bucket: bucket,
      Region: region,
      Key: key
    }, function(err, data) {
      if (err) {
        console.error('Delete failed:', err);
        reject(err);
        return;
      }
      resolve(data);
    });
  });
};

export default {
  uploadFile,
  deleteFile,
  validateFileType
};
