import React from 'react'

const ICON_URL = `${process.env.PUBLIC_URL}/icons/organization.png`

/**
 * Organization icon from assets — tinted with accent via CSS mask (matches banner color).
 */
export default function OrganizationIcon({ size = 18, color = 'currentColor' }) {
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        display: 'block',
        backgroundColor: color,
        WebkitMaskImage: `url(${ICON_URL})`,
        maskImage: `url(${ICON_URL})`,
        WebkitMaskSize: 'contain',
        maskSize: 'contain',
        WebkitMaskRepeat: 'no-repeat',
        maskRepeat: 'no-repeat',
        WebkitMaskPosition: 'center',
        maskPosition: 'center',
      }}
    />
  )
}
