import { useState } from 'react';
import { Dumbbell, User, LogIn } from 'lucide-react';

interface Props {
  onLogin: (username: string) => void;
  existingUsers: string[];
}

export default function LoginScreen({ onLogin, existingUsers }: Props) {
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setError('Por favor, introduce un nombre de usuario.');
      return;
    }
    onLogin(username.trim());
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 shadow-2xl mb-4">
            <Dumbbell className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GymTracker Pro</h1>
          <p className="text-gray-400 mt-1">Tu entrenamiento, bajo control</p>
        </div>

        {/* Form */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-8 border border-gray-700">
          <h2 className="text-xl font-semibold text-white mb-6">Acceder / Registrarse</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre de usuario
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={username}
                  onChange={e => { setUsername(e.target.value); setError(''); }}
                  placeholder="Escribe tu nombre..."
                  className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-colors"
                  autoFocus
                />
              </div>
              {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-700 transition-all shadow-lg shadow-orange-900/30 active:scale-95"
            >
              <LogIn className="w-5 h-5" />
              Entrar
            </button>
          </form>

          {existingUsers.length > 0 && (
            <div className="mt-6">
              <p className="text-sm text-gray-400 mb-3">Usuarios recientes:</p>
              <div className="flex flex-wrap gap-2">
                {existingUsers.map(u => (
                  <button
                    key={u}
                    onClick={() => onLogin(u)}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors border border-gray-600 hover:border-orange-500"
                  >
                    {u}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Sin contraseña · Sin cuenta · Solo local
        </p>
      </div>
    </div>
  );
}
