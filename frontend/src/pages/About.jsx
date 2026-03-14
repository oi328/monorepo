import { useNavigate } from 'react-router-dom'
import lightLogo from '../assets/be-souhola-logo-light.png'
import darkLogo from '../assets/be-souhola-logo-dark.png'
import { useTheme } from '../shared/context/ThemeProvider'

export default function About() {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const logo = theme === 'dark' ? darkLogo : lightLogo
  return (
    <div className="relative min-h-screen flex flex-col pb-20 sm:pb-24 bg-gradient-to-br from-cyan-200 via-sky-300 to-indigo-200 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      {/* Header identical to Welcome with navbar + entrance animation */}
      <motion.header
        className="w-full bg-white/20 dark:bg-gray-800/25 backdrop-blur-md border-b border-white/30 dark:border-gray-600 shadow"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className="flex justify-between items-center w-full max-w-6xl mx-auto px-4 sm:px-6 py-2 sm:py-3">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Be Souhola" className="w-16 h-16 sm:w-20 sm:h-20 drop-shadow-lg" />
            <div className="flex flex-col">
              <span className="text-xs sm:text-sm text-white/90 drop-shadow-md">Make everything .....</span>
              <h1 className="text-3xl sm:text-4xl font-extrabold bg-gradient-to-r from-white via-sky-100 to-cyan-200 text-transparent bg-clip-text drop-shadow-lg">Be Souhola</h1>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <nav className="hidden sm:flex items-center gap-4 text-white/90">
              <NavLink to="/" className={({ isActive }) => `inline-flex items-center px-3 py-1 rounded-full transition-all duration-200 hover:text-white hover:scale-105 bg-gradient-to-r ${isActive ? 'from-white/10 to-transparent text-white scale-105 ring-1 ring-white/30' : 'from-transparent to-transparent'}`}>Home</NavLink>
              <NavLink to="/about" className={({ isActive }) => `inline-flex items-center px-3 py-1 rounded-full transition-all duration-200 hover:text-white hover:scale-105 bg-gradient-to-r ${isActive ? 'from-white/10 to-transparent text-white scale-105 ring-1 ring-white/30' : 'from-transparent to-transparent'}`}>About</NavLink>
              <NavLink to="/welcome/contact" className={({ isActive }) => `inline-flex items-center px-3 py-1 rounded-full transition-all duration-200 hover:text-white hover:scale-105 bg-gradient-to-r ${isActive ? 'from-white/10 to-transparent text-white scale-105 ring-1 ring-white/30' : 'from-transparent to-transparent'}`}>Contact</NavLink>
              <NavLink to="/pricing" className={({ isActive }) => `inline-flex items-center px-3 py-1 rounded-full transition-all duration-200 hover:text-white hover:scale-105 bg-gradient-to-r ${isActive ? 'from-white/10 to-transparent text-white scale-105 ring-1 ring-white/30' : 'from-transparent to-transparent'}`}>Pricing</NavLink>
            </nav>
            <button onClick={() => navigate('/login')} className="px-8 py-3 rounded-full bg-white/25 backdrop-blur-md text-white font-semibold shadow-lg transition-all duration-200 hover:bg-white/40 hover:scale-105 hover:shadow-2xl hover:ring-2 hover:ring-white/40">LOGIN 🔒</button>
          </div>
        </div>
      </motion.header>

      {/* Main content */}
      <main className="flex-1 w-full">
        <div className="mx-auto max-w-3xl px-6 sm:px-10 mt-8 sm:mt-12">
          <div className="flex justify-end mb-4">
            <Link to="/" className="px-6 py-2 rounded-full bg-white/25 backdrop-blur-md text-white font-semibold shadow hover:bg-white/40 transition-all">Back to Welcome ⬅️</Link>
          </div>
          <div className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-md rounded-3xl p-5 sm:p-6 border border-white/40 dark:border-gray-700 shadow">
            <h2 className="text-2xl sm:text-3xl font-bold text-white/90 mb-4 text-center">About</h2>
            <p className="text-sm sm:text-base text-white/90">
              Be Souhola is a modern CRM designed to streamline client management, leads tracking, marketing campaigns, and analytics. Our mission is to make everything simpler and more efficient for teams.
            </p>
            <p className="mt-3 text-sm sm:text-base text-white/90">
              This project brings together powerful modules like Dashboard, Inventory, Projects, Reports, and Settings, all crafted for a smooth daily workflow.
            </p>
          </div>
        </div>
      </main>

      {/* Footer fixed full-width like Terms/Privacy */}
      <footer className="fixed bottom-0 left-0 w-full border-t border-gray-200/60 dark:border-gray-700/60 bg-white/70 dark:bg-gray-900/40 backdrop-blur-md">
        <div className="mx-auto max-w-7xl px-6 sm:px-10 py-2 sm:py-3 flex items-center justify-between text-xs sm:text-sm">
          <p className="text-gray-600 dark:text-gray-300">© 2024 Be Souhola</p>
          <nav className="flex items-center gap-4">
            <Link to="/privacy" className="text-blue-600 hover:text-blue-700 dark:text-blue-300">Privacy</Link>
            <Link to="/terms" className="text-blue-600 hover:text-blue-700 dark:text-blue-300">Terms</Link>
            <Link to="/welcome/contact" className="text-blue-600 hover:text-blue-700 dark:text-blue-300">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}