'use client';

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface WeatherFeedbackCardProps {
  poiName: string;
  isVisible: boolean;
  onFeedback: (isAccurate: boolean) => void;
  onDismiss: () => void;
}

export function WeatherFeedbackCard({ poiName, isVisible, onFeedback, onDismiss }: WeatherFeedbackCardProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 w-11/12 max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-5 border border-gray-100 dark:border-gray-700 z-50"
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-1">ถึงที่หมายแล้ว!</p>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white leading-tight">
                คุณอยู่ที่ {poiName}
              </h3>
            </div>
            <button 
              onClick={onDismiss}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
          
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
            ตอนนี้ฟ้าตรงกับในแอปไหมครับ? ช่วยเราปรับปรุงข้อมูลให้แม่นยำขึ้น
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={() => onFeedback(true)}
              className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 font-medium py-2 px-4 rounded-xl transition-colors border border-green-200"
            >
              👍 ตรงครับ
            </button>
            <button 
              onClick={() => onFeedback(false)}
              className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 font-medium py-2 px-4 rounded-xl transition-colors border border-red-200"
            >
              👎 ไม่ตรง
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
