'use client';

import React, { useState, useEffect } from 'react';
import { useGeolocation } from '@/hooks/useGeolocation';
import { getDistance } from '@/lib/geo';
import { WeatherFeedbackCard } from '@/components/ui/WeatherFeedbackCard';

interface POI {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

interface WeatherGeoFenceProps {
  targetPois: POI[];
  triggerRadiusInMeters?: number;
}

export function WeatherGeoFence({ targetPois, triggerRadiusInMeters = 500 }: WeatherGeoFenceProps) {
  const { coords, error } = useGeolocation();
  const [activePoi, setActivePoi] = useState<POI | null>(null);
  const [hasTriggered, setHasTriggered] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!coords || !targetPois || targetPois.length === 0) return;
    
    // หากมีการ์ดใดเปิดอยู่แล้ว ไม่ต้องคำนวณใหม่เพื่อป้องกันการกระตุก/เปลี่ยนไปมา
    if (activePoi) return;

    let closestPoi: POI | null = null;
    let minDistance = Infinity;

    for (const poi of targetPois) {
      if (hasTriggered[poi.id]) continue; // ข้ามสถานที่ที่เคยถามไปแล้ว

      const dist = getDistance(coords.latitude, coords.longitude, poi.lat, poi.lng);
      if (dist < minDistance && dist <= triggerRadiusInMeters) {
        minDistance = dist;
        closestPoi = poi;
      }
    }

    if (closestPoi) {
      setActivePoi(closestPoi);
      setHasTriggered(prev => ({ ...prev, [closestPoi!.id]: true }));
    }
  }, [coords, targetPois, triggerRadiusInMeters, hasTriggered, activePoi]);

  const handleFeedback = (isAccurate: boolean) => {
    // In a real app, send to API: arnfa.feedback
    console.log(`Feedback for ${activePoi?.name}: ${isAccurate ? 'Accurate' : 'Not Accurate'}`);
    setActivePoi(null);
  };

  const handleDismiss = () => {
    setActivePoi(null);
  };

  if (!activePoi) return null;

  return (
    <WeatherFeedbackCard 
      poiName={activePoi.name}
      isVisible={!!activePoi}
      onFeedback={handleFeedback}
      onDismiss={handleDismiss}
    />
  );
}
