import React from 'react';

const CustomLabel = (props) => {
  const { x, y, value, index, data } = props;
  if (!data) return null;
  
  const yVal = Array.isArray(value) ? value[1] : value;
  
  let isMinima = false;
  let isMaxima = false;

  if (index === 0) {
    if (data.length > 1) {
      isMaxima = yVal > data[1].cumulativeR;
      isMinima = yVal < data[1].cumulativeR;
    }
  } else if (index === data.length - 1) {
    if (data.length > 1) {
      isMaxima = yVal > data[index - 1].cumulativeR;
      isMinima = yVal < data[index - 1].cumulativeR;
    }
  } else {
    const prev = data[index - 1].cumulativeR;
    const next = data[index + 1].cumulativeR;
    isMaxima = (yVal > prev && yVal > next);
    isMinima = (yVal < prev && yVal < next);
  }

  // Only show at local extrema, or first/last point
  if (!isMaxima && !isMinima && index !== 0 && index !== data.length - 1) {
    return null;
  }

  // Default placement for flat first/last points
  if (index === 0 && !isMaxima && !isMinima) isMinima = true;
  if (index === data.length - 1 && !isMaxima && !isMinima) isMaxima = true;

  // Place minima below the dot, maxima above the dot
  const positionY = isMinima && !isMaxima ? y + 20 : y - 12;
  const isPositive = yVal >= 0;

  return (
    <text 
      x={x} 
      y={positionY} 
      fill={isPositive ? '#4a90e2' : '#ff6b6b'} 
      fontSize={12} 
      textAnchor="middle"
      fontWeight="800"
    >
      {yVal > 0 ? '+' : ''}{yVal}R
    </text>
  );
};

export default CustomLabel;
