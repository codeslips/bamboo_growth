import React, { useEffect, useCallback } from 'react';
import PropTypes from 'prop-types';

const ObjectsUpload = ({ types, onUploadComplete }) => {
  const handleMessage = useCallback((event) => {
    // Verify the message origin for security
    console.log(event.origin, event);
    if (event.origin !== 'http://localhost:10086' && event.origin !== 'https://growth.tingqi.xyz') {
      return;
    }

    const { data } = event;
    if (data.type === 'uploadComplete') {
      onUploadComplete({
        filename: data.filename,
        url: data.url
      });
    }
  }, [onUploadComplete]);

  useEffect(() => {
    // Add message event listener when component mounts
    window.addEventListener('message', handleMessage);

    // Clean up event listener when component unmounts
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [handleMessage]);

  const uploadUrl = `/objects/objects/basic_upload.html?types=${types.join(',')}`;
  console.log(uploadUrl);

  return (
    <iframe
      src={uploadUrl}
      title="File Upload"
      style={{
        width: '100%',
        height: '80vh',
        border: 'none',
        overflow: 'hidden'
      }}
    />
  );
};

ObjectsUpload.propTypes = {
  // Array of allowed file extensions (e.g., ['jpeg', 'png'])
  types: PropTypes.arrayOf(PropTypes.string).isRequired,
  // Callback function that receives the upload result
  onUploadComplete: PropTypes.func.isRequired,
};

export default ObjectsUpload;
