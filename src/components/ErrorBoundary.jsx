import { Component } from 'react'
import ToothLogo from './ToothLogo'

class ErrorBoundary extends Component {
    constructor(props) {
        super(props)
        this.state = { hasError: false, error: null }
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error }
    }

    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught:', error, errorInfo)
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null })
        window.location.href = '/home'
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-pastel-light px-4">
                    <div className="w-full max-w-md text-center">
                        <div className="bg-white rounded-2xl p-4 shadow-sm mb-4 inline-block">
                            <ToothLogo className="w-16 h-16" />
                        </div>
                        <h1 className="text-2xl font-bold text-dark mb-2">¡Algo salió mal!</h1>
                        <p className="text-dark/50 text-sm mb-6">
                            Ocurrió un error inesperado. Intentá volver al inicio.
                        </p>
                        <button
                            onClick={this.handleReset}
                            className="px-6 py-2.5 rounded-xl bg-accent text-dark font-semibold
                         hover:bg-accent-hover transition-all duration-200 cursor-pointer"
                        >
                            Volver al inicio
                        </button>
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}

export default ErrorBoundary
