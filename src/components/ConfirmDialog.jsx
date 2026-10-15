const ConfirmDialog = ({ isOpen, title, message, confirmLabel = 'Eliminar', onConfirm, onCancel }) => {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-dark/40 backdrop-blur-sm" onClick={onCancel} />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm animate-in">
                <h3 className="text-lg font-semibold text-dark mb-2">{title}</h3>
                <p className="text-sm text-dark/60 mb-6">{message}</p>

                <div className="flex gap-3">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-2.5 px-4 rounded-xl border border-gray-soft text-sm font-medium
                       text-dark/70 hover:bg-gray-soft transition-all duration-200 cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onConfirm}
                        className="flex-1 py-2.5 px-4 rounded-xl bg-error text-white text-sm font-semibold
                       hover:bg-error/90 transition-all duration-200 cursor-pointer"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default ConfirmDialog
