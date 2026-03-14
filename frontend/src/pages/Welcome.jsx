import { useNavigate } from 'react-router-dom';
import lightLogo from '../assets/be-souhola-logo-light.png';
import darkLogo from '../assets/be-souhola-logo-dark.png';
import { useTheme } from '../shared/context/ThemeProvider';

export default function Welcome() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const logo = theme === 'dark' ? darkLogo : lightLogo;

  const features = [
    { key: 'clients', title: 'Client Management', desc: 'Track clients and communication history with ease.' },
    { key: 'leads', title: 'Leads Management', desc: 'Manage lead stages smartly with quick filtering.' },
    { key: 'marketing', title: 'Marketing & Campaigns', desc: 'Launch campaigns and track landing results.' },
    { key: 'reports', title: 'Reports & Analytics', desc: 'Visualize performance with smart dashboards.' },
    { key: 'inventory', title: 'Inventory', desc: 'Manage products, stock, and transactions efficiently.' },
    { key: 'projects', title: 'Projects', desc: 'Track projects, timelines, and milestones with ease.' },
    { key: 'settings', title: 'Settings', desc: 'Configure modules, roles, and subscription details.' },
    { key: 'requests', title: 'Requests', desc: 'Manage requests and follow-ups efficiently.' },
  ];

  const icon = (key) => {
    const base = 'w-12 h-12';
    switch (key) {
      case 'clients':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-teal-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="6" strokeWidth="2"/><path d="M6 20c2-3 10-3 12 0" strokeWidth="2"/></svg>);
      case 'leads':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-orange-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2"/></svg>);
      case 'marketing':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-purple-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M3 8l9 6 9-6" strokeWidth="2"/><path d="M5 19h14" strokeWidth="2"/></svg>);
      case 'reports':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-blue-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="6" y="12" width="3" height="8"/><rect x="11" y="9" width="3" height="11"/><rect x="16" y="6" width="3" height="14"/></svg>);
      case 'inventory':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-yellow-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="7" width="18" height="14" rx="2"/></svg>);
      case 'projects':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-gray-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="4" y="7" width="16" height="12"/><path d="M4 7l4-3h8l4 3"/></svg>);
      case 'settings':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-indigo-500`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 01-.3 2l2 1-2 3-2-1a7 7 0 01-2 1l-.3 2H9l-.3-2a7 7 0 01-2-1l-2 1-2-3 2-1A7 7 0 015 12a7 7 0 01.3-2L3 9l2-3 2 1a7 7 0 012-1L9 4h6l.3 2a7 7 0 012 1l2-1 2 3-2 1c.3.6.4 1.3.4 2z"/></svg>);
      case 'requests':
        return (<svg xmlns="http://www.w3.org/2000/svg" className={`${base} text-teal-600`} viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M5 13l4 4L19 7" strokeWidth="2"/></svg>);
      default:
        return null;
    }
  };

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.08 } } };

  return (
    <div className="relative min-h-screen flex flex-col pb-20 sm:pb-24 bg-gradient-to-br from-cyan-200 via-sky-300 to-indigo-200 dark:from-gray-900 dark:via-indigo-900 dark:to-purple-900">
      {/* Header full-width with entrance animation */}
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

      {/* Content */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mt-12 sm:mt-16 w-full max-w-6xl mx-auto px-6 sm:px-10">
        {features.map((f, idx) => (
          <motion.div key={idx} whileHover={{ scale: 1.05, y: -5 }} className="bg-white/30 dark:bg-gray-800/30 backdrop-blur-md rounded-3xl p-6 flex flex-col gap-4 cursor-pointer transition-all border border-white/40 dark:border-gray-600 shadow-md">
            {icon(f.key)}
            <h3 className="text-lg font-semibold text-white drop-shadow-md">{f.title}</h3>
            <p className="text-sm text-white/80">{f.desc}</p>
          </motion.div>
        ))}
      </motion.div>

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
  );
}
