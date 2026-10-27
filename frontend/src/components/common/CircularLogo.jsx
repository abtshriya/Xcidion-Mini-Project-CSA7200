import React from 'react';

/**
 * CircularLogo - Renders the official XCIDION logo badge
 * with a clean, handcrafted circular frame.
 */
export const CircularLogo = ({ size = 32, className = '', style = {} }) => {
  return (
    <div
      className={`circular-logo-frame ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        padding: '2px',
        backgroundColor: '#16202E',
        border: '1.5px solid #2A384C',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.4)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
        transition: 'border-color 0.15s ease',
        ...style
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          overflow: 'hidden',
          backgroundColor: '#0B0F17',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <img
          src="/xcidion-logo.png"
          alt="XCIDION Logo"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block'
          }}
        />
      </div>
    </div>
  );
};
