export const getSceneInfo = (className) => {
  const info = {
    Rain: {
      icon: '🌧️',
      color: '#4A90E2',
      description: 'Rainy weather detected',
      details: [
        'Wet road conditions likely',
        'Reduced visibility',
        'Increased stopping distance',
        'Use headlights and wipers'
      ],
      severity: 'medium'
    },
    Road: {
      icon: '🛣️',
      color: '#7C4DFF',
      description: 'Road surface detected',
      details: [
        'Clear road ahead',
        'Normal driving conditions',
        'Monitor traffic flow',
        'Maintain safe distance'
      ],
      severity: 'low'
    },
    Sky: {
      icon: '☁️',
      color: '#00D4FF',
      description: 'Sky view detected',
      details: [
        'Weather observation',
        'Cloud patterns visible',
        'Atmospheric conditions',
        'Clear overhead view'
      ],
      severity: 'low'
    }
  };

  return info[className] || info.Road;
};

export const formatTime = (ms) => {
  return `${ms.toFixed(2)}ms`;
};

export const formatConfidence = (confidence) => {
  return `${(confidence * 100).toFixed(1)}%`;
};