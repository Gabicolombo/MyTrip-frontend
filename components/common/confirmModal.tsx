
interface ConfirmModalProps {
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ title, message, onConfirm, onCancel }: ConfirmModalProps) {
  return (
    <div className="bg-black/30 z-50 fixed inset-0 flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-4 text-gray-600">{title}</h2>

        <p className="text-gray-600 mb-6">{message}</p>
        <div className="flex justify-end gap-4">
          <button onClick={() => onConfirm()} className='text-green-500 hover:text-green-700 transition-colors'>Confirm</button>
          <button onClick={() => onCancel()} className="text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}