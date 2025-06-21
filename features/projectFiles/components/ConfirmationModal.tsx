import React from 'react';
import { vscodeDarkTheme } from '../../../theme/vscodeDark';
import { XMarkIcon } from '../../../components/icons/XMarkIcon';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  errorMessage?: string | null; 
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmButtonText = "确认",
  cancelButtonText = "取消",
  onConfirm,
  onCancel,
  errorMessage,
}) => {
  if (!isOpen) {
    return null;
  }

  const theme = vscodeDarkTheme.contextMenu; // Re-use some context menu theme for consistency
  const topBarTheme = vscodeDarkTheme.topBar;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[100] p-4"
      aria-modal="true"
      role="dialog"
      aria-labelledby="confirmation-modal-title"
    >
      <div 
        className={`relative ${theme.bg} ${theme.border} rounded-lg shadow-xl w-full max-w-md p-6`}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 id="confirmation-modal-title" className={`text-lg font-semibold ${vscodeDarkTheme.propertyInspector.headerText}`}>
            {title}
          </h2>
          <button
            onClick={onCancel}
            className={`p-1 rounded-md hover:${theme.itemBgHover} focus:outline-none`}
            aria-label="Close modal"
          >
            <XMarkIcon className={`w-5 h-5 ${theme.itemText}`} />
          </button>
        </div>

        <p className={`text-sm ${vscodeDarkTheme.propertyInspector.valueTextMuted} mb-6`}>
          {message}
        </p>

        {errorMessage && (
          <div className={`mb-4 p-2 text-sm bg-red-800 bg-opacity-30 text-red-300 border border-red-700 rounded-md`}>
            {errorMessage}
          </div>
        )}

        <div className="flex justify-end space-x-3">
          <button
            onClick={onCancel}
            className={`px-4 py-2 text-sm rounded-md ${topBarTheme.buttonDefaultBg} hover:${topBarTheme.buttonDefaultBgHover} ${topBarTheme.buttonDefaultText} transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-500`}
          >
            {cancelButtonText}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors focus:outline-none focus:ring-2 focus:ring-red-400`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
