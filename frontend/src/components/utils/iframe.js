import React from 'react';
import PropTypes from 'prop-types';

const IframeComponent = ({ url, title, width = '100%', height = '100vh', className = '' }) => {
  return (
    <iframe
      src={url}
      title={title}
      width={width}
      height={height}
      className={className}
      frameBorder="0"
      style={{ width, height }}
      allowFullScreen
      loading="lazy"
    />
  );
};

IframeComponent.propTypes = {
  url: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  width: PropTypes.string,
  height: PropTypes.string,
  className: PropTypes.string,
};

export default IframeComponent;
