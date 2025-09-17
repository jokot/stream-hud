import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChecklistDataSource, ChecklistItem, ChecklistPayload } from '../lib/ws';
import { formatPercent, formatProgress, calculateProgress } from '../lib/format';
import { OverlayConfig } from '../lib/params';

interface ChecklistProps {
  config: OverlayConfig;
}

interface GroupedItems {
  [group: string]: ChecklistItem[];
}

export function Checklist({ config }: ChecklistProps) {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isConnected, setIsConnected] = useState(false);
  const [source, setSource] = useState<'ws' | 'poll'>('poll');
  const [dataSource, setDataSource] = useState<ChecklistDataSource | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [draggedItem, setDraggedItem] = useState<ChecklistItem | null>(null);

  const handleData = useCallback((payload: ChecklistPayload) => {
    // Validate payload structure - handle both message formats
    const taskList = payload.tasks || payload.items;
    if (!taskList || !Array.isArray(taskList)) {
      console.error('Invalid payload - no valid task array found:', payload);
      return;
    }
    
    setItems(taskList);
    setLastUpdate(payload.ts);
    setSelectedTaskId(payload.selectedTaskId || null);
  }, [items.length]);

  const handleStatus = useCallback((connected: boolean, sourceType: 'ws' | 'poll') => {
    setIsConnected(connected);
    setSource(sourceType);
  }, []);

  useEffect(() => {
    const ds = new ChecklistDataSource(handleData, handleStatus);
    setDataSource(ds);
    ds.start();

    return () => {
      ds.stop();
    };
  }, []); // Remove dependencies to prevent recreation



  useEffect(() => {
    const handleKeyPress = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'r') {
        dataSource?.forceReload();
      } else if (event.key.toLowerCase() === 't') {
        // Toggle first incomplete item (demo feature)
        const firstIncomplete = items.find(item => !item.done);
        if (firstIncomplete) {
          console.log(`Demo: Would toggle "${firstIncomplete.text}"`);
        }
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [dataSource, items]);

  const completedCount = (items || []).filter(item => item.done).length;
  const totalCount = (items || []).length;
  const progressPercent = calculateProgress(completedCount, totalCount);

  // Group items if they have groups
  const groupedItems: GroupedItems = (items || []).reduce((acc, item) => {
    const group = item.group || 'default';
    if (!acc[group]) acc[group] = [];
    acc[group].push(item);
    return acc;
  }, {} as GroupedItems);

  const hasGroups = Object.keys(groupedItems).length > 1 || (Object.keys(groupedItems).length === 1 && !groupedItems.default);

  const handleDragStart = useCallback((item: ChecklistItem) => {
    setDraggedItem(item);
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedItem(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetItem: ChecklistItem) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetItem: ChecklistItem) => {
    e.preventDefault();
    
    if (!draggedItem || draggedItem.id === targetItem.id) {
      return;
    }

    const draggedIndex = items.findIndex(item => item.id === draggedItem.id);
    const targetIndex = items.findIndex(item => item.id === targetItem.id);
    
    if (draggedIndex === -1 || targetIndex === -1) {
      return;
    }

    // Call API to move task to new position
    fetch('http://localhost:7006/tasks/move-to-position', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer devtoken',
      },
      body: JSON.stringify({ 
        taskId: draggedItem.id, 
        targetPosition: targetIndex 
      }),
    }).catch(error => {
      console.error('Failed to move task:', error);
    });
  }, [draggedItem, items]);

  return (
    <div className="p-4 w-fit max-w-md">
      <motion.div
        className="overlay-card p-4 space-y-4"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        {!config.compact && (
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              {config.title}
            </h2>
            <div className="flex items-center space-x-2">
              <span className={`status-chip ${
                source === 'ws' ? 'status-ws' : 'status-poll'
              }`}>
                {source.toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Progress */}
        {config.showProgress && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
              <span>{formatProgress(completedCount, totalCount)}</span>
              <span>{formatPercent(completedCount, totalCount)}</span>
            </div>
            <div className="progress-bar h-2">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          </div>
        )}

        {/* Items */}
        <div className={`space-y-${config.compact ? '1' : '2'}`}>
          <AnimatePresence>
            {hasGroups ? (
              // Render grouped items
              Object.entries(groupedItems).map(([group, groupItems]) => (
                <div key={group} className="space-y-1">
                  {group !== 'default' && (
                    <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                      {group}
                    </div>
                  )}
                  {groupItems.map((item) => (
                    <ChecklistItemComponent
                      key={item.id}
                      item={item}
                      compact={config.compact}
                      isSelected={item.id === selectedTaskId}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                    />
                  ))}
                </div>
              ))
            ) : (
              // Render flat list
              (items || []).map((item) => (
                <ChecklistItemComponent
                  key={item.id}
                  item={item}
                  compact={config.compact}
                  isSelected={item.id === selectedTaskId}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                />
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Footer info */}
        {!config.compact && lastUpdate > 0 && (
          <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Last updated: {new Date(lastUpdate * 1000).toLocaleTimeString()}
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface ChecklistItemProps {
  item: ChecklistItem;
  compact: boolean;
  isSelected: boolean;
  onDragStart?: (item: ChecklistItem) => void;
  onDragEnd?: () => void;
  onDragOver?: (e: React.DragEvent, targetItem: ChecklistItem) => void;
  onDrop?: (e: React.DragEvent, targetItem: ChecklistItem) => void;
}

function ChecklistItemComponent({ item, compact, isSelected, onDragStart, onDragEnd, onDragOver, onDrop }: ChecklistItemProps) {
  const [isDragOver, setIsDragOver] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleClick = (e: React.MouseEvent) => {
    // Prevent click when dragging
    if (isDragging) {
      e.preventDefault();
      return;
    }
    
    // Toggle task completion status
    fetch('http://localhost:7006/tasks/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer devtoken',
      },
      body: JSON.stringify({ id: item.id }),
    }).catch(error => {
      console.error('Failed to toggle task:', error);
    });
  };

  const handleDragStart = (e: React.DragEvent) => {
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id);
    onDragStart?.(item);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    onDragEnd?.();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    onDragOver?.(e, item);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    onDrop?.(e, item);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: -10 }}
      animate={{ 
        opacity: isDragging ? 0.5 : 1, 
        x: 0,
        scale: isDragging ? 0.95 : 1
      }}
      exit={{ opacity: 0, x: 10 }}
      transition={{ duration: 0.2 }}
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`flex items-center space-x-3 ${compact ? 'py-1' : 'py-2'} px-2 rounded-md transition-all duration-200 cursor-pointer ${
        isDragging
          ? 'bg-blue-200 dark:bg-blue-800/50 border-2 border-blue-500 dark:border-blue-400 shadow-lg transform rotate-1'
          : isDragOver
          ? 'bg-green-100 dark:bg-green-900/30 border-2 border-green-400 dark:border-green-500 shadow-md'
          : isSelected 
          ? 'bg-blue-100 dark:bg-blue-900/30 border-2 border-blue-400 dark:border-blue-500 shadow-md' 
          : 'hover:bg-gray-50 dark:hover:bg-gray-800/50 border-2 border-transparent'
      }`}
    >
      <div className="flex-shrink-0">
        <motion.div
          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
            item.done
              ? 'bg-green-500 border-green-500 dark:bg-green-400 dark:border-green-400'
              : 'border-gray-300 dark:border-gray-600'
          }`}
          animate={{
            scale: item.done ? [1, 1.1, 1] : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {item.done && (
            <motion.svg
              className="w-3 h-3 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.3 }}
            >
              <motion.path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          )}
        </motion.div>
      </div>
      <span
        className={`flex-1 text-sm ${
          item.done
            ? 'text-gray-500 dark:text-gray-400 line-through'
            : 'text-gray-900 dark:text-white'
        } transition-colors`}
      >
        {item.text}
      </span>
    </motion.div>
  );
}