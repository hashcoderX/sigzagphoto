"use client";

import React from 'react';

interface ComponentProps {
  text?: string;
  fontSize?: number;
  alignment?: 'left' | 'center' | 'right';
  width?: number;
  height?: number;
  background?: string;
  padding?: number;
  imageUrl?: string;
  margin?: { top: number; right: number; bottom: number; left: number };
  color?: string;
  fontWeight?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
}

interface CanvasComponent {
  id: string;
  type: 'logo' | 'companyInfo' | 'customerInfo' | 'itemsTable' | 'totals' | 'notes' | 'text' | 'image' | 'line' | 'box' | 'qr';
  x: number;
  y: number;
  props: ComponentProps;
}

interface TemplateData {
  layout: {
    width: number;
    height: number;
    unit: 'mm' | 'px';
    margin: { top: number; right: number; bottom: number; left: number };
  };
  components: CanvasComponent[];
}

interface InvoiceTemplatePreviewProps {
  templateData: TemplateData;
  zoom?: number;
}

const mmToPx = (mm: number): number => mm * 3.779527559;

const InvoiceTemplatePreview: React.FC<InvoiceTemplatePreviewProps> = ({
  templateData,
  zoom = 1
}) => {
  const { layout, components } = templateData;

  // Convert dimensions to pixels
  const widthPx = layout.unit === 'mm' ? mmToPx(layout.width) : layout.width;
  const heightPx = layout.unit === 'mm' ? mmToPx(layout.height) : layout.height;

  const containerStyle: React.CSSProperties = {
    width: `${widthPx * zoom}px`,
    height: `${heightPx * zoom}px`,
    position: 'relative',
    backgroundColor: '#ffffff',
    transform: `scale(${zoom})`,
    transformOrigin: 'top left',
    margin: 0,
    padding: 0,
    border: 'none',
    boxShadow: 'none',
  };

  const renderComponent = (component: CanvasComponent) => {
    const { type, x, y, props } = component;
    const componentStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${x * zoom}px`,
      top: `${y * zoom}px`,
      width: props.width ? `${props.width * zoom}px` : 'auto',
      height: props.height ? `${props.height * zoom}px` : 'auto',
      fontSize: props.fontSize ? `${props.fontSize * zoom}px` : `${12 * zoom}px`,
      color: props.color || '#000000',
      fontWeight: props.fontWeight || 'normal',
      textAlign: props.alignment || 'left',
      backgroundColor: props.background || 'transparent',
      padding: props.padding ? `${props.padding * zoom}px` : 0,
      marginTop: props.margin?.top ? `${props.margin.top * zoom}px` : 0,
      marginRight: props.margin?.right ? `${props.margin.right * zoom}px` : 0,
      marginBottom: props.margin?.bottom ? `${props.margin.bottom * zoom}px` : 0,
      marginLeft: props.margin?.left ? `${props.margin.left * zoom}px` : 0,
      borderRadius: props.borderRadius ? `${props.borderRadius * zoom}px` : 0,
      border: props.borderWidth ? `${props.borderWidth * zoom}px solid ${props.borderColor || '#000000'}` : 'none',
      boxSizing: 'border-box',
      overflow: 'hidden',
    };

    switch (type) {
      case 'logo':
      case 'image':
        return (
          <div key={component.id} style={componentStyle}>
            {props.imageUrl ? (
              <img
                src={props.imageUrl}
                alt={type === 'logo' ? 'Logo' : 'Image'}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            ) : (
              <div style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#f0f0f0',
                border: '1px dashed #ccc',
                color: '#666',
                fontSize: `${10 * zoom}px`,
              }}>
                {type === 'logo' ? 'LOGO' : 'IMAGE'}
              </div>
            )}
          </div>
        );

      case 'text':
      case 'companyInfo':
      case 'customerInfo':
      case 'notes':
        return (
          <div key={component.id} style={componentStyle}>
            {props.text || `Sample ${type} text`}
          </div>
        );

      case 'itemsTable':
        return (
          <div key={component.id} style={componentStyle}>
            <table style={{
              width: '100%',
              borderCollapse: 'collapse',
              fontSize: `${10 * zoom}px`,
            }}>
              <thead>
                <tr>
                  <th style={{ border: '1px solid #ddd', padding: `${4 * zoom}px`, backgroundColor: '#f5f5f5' }}>Service</th>
                  <th style={{ border: '1px solid #ddd', padding: `${4 * zoom}px`, backgroundColor: '#f5f5f5' }}>Qty</th>
                  <th style={{ border: '1px solid #ddd', padding: `${4 * zoom}px`, backgroundColor: '#f5f5f5' }}>Amount</th>
                  <th style={{ border: '1px solid #ddd', padding: `${4 * zoom}px`, backgroundColor: '#f5f5f5' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>Photography Service</td>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>1</td>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>$500.00</td>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>$500.00</td>
                </tr>
                <tr>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>Editing Service</td>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>2</td>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>$100.00</td>
                  <td style={{ border: '1px solid #ddd', padding: `${4 * zoom}px` }}>$200.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        );

      case 'totals':
        return (
          <div key={component.id} style={componentStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${5 * zoom}px` }}>
              <span>Subtotal:</span>
              <span>$700.00</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: `${5 * zoom}px` }}>
              <span>Tax:</span>
              <span>$70.00</span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontWeight: 'bold',
              borderTop: '1px solid #000',
              paddingTop: `${5 * zoom}px`
            }}>
              <span>Total:</span>
              <span>$770.00</span>
            </div>
          </div>
        );

      case 'line':
        return (
          <div key={component.id} style={{
            ...componentStyle,
            borderTop: `${props.borderWidth || 1}px solid ${props.borderColor || '#000000'}`,
            height: 0,
          }} />
        );

      case 'box':
        return (
          <div key={component.id} style={{
            ...componentStyle,
            border: `${props.borderWidth || 1}px solid ${props.borderColor || '#000000'}`,
          }} />
        );

      case 'qr':
        return (
          <div key={component.id} style={componentStyle}>
            <div style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: '#f0f0f0',
              border: '1px dashed #ccc',
              color: '#666',
              fontSize: `${10 * zoom}px`,
            }}>
              QR CODE
            </div>
          </div>
        );

      default:
        return (
          <div key={component.id} style={componentStyle}>
            {props.text || `Unknown component: ${type}`}
          </div>
        );
    }
  };

  return (
    <div style={containerStyle}>
      {components.map(renderComponent)}
    </div>
  );
};

export default InvoiceTemplatePreview;